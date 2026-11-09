import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  fetchActiveSession, 
  startStudySession, 
  sendHeartbeatCheckpoint, 
  pauseSession as apiPauseSession, 
  resumeSession as apiResumeSession, 
  completeSession as apiCompleteSession, 
  cancelSession as apiCancelSession, 
  fetchRecentSessions,
  HEARTBEAT_INTERVAL_MS 
} from '../lib/focus/service';
import type { 
  StudySession, 
  StartSessionInput, 
  SessionStatus 
} from '../types/focus';

interface LocalSessionTrackingState {
  sessionId: string;
  userId: string;
  status: SessionStatus;
  baseActualSeconds: number;
  segmentStartTimeMs: number | null;
  targetDurationSeconds: number;
  lastCheckpointMs: number;
}

const LOCAL_FOCUS_TRACKING_KEY = (userId: string) => `vlt-focus-tracking-${userId}`;

interface FocusContextType {
  activeSession: StudySession | null;
  liveActualSeconds: number;
  loadingActive: boolean;
  isRunning: boolean;
  isPaused: boolean;
  recentSessions: StudySession[];
  startSession: (input: StartSessionInput) => Promise<StudySession>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopEarlySession: () => Promise<void>;
  cancelSession: () => Promise<void>;
  refreshActiveSession: () => Promise<void>;
  refreshRecentSessions: () => Promise<void>;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

// Helper suara notifikasi selesai menggunakan Web Audio API murni (tanpa file eksternal)
function playTimerCompletionChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Suara nada 1 (D5 - 587Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);

    // Suara nada 2 (A5 - 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.8);
  } catch {
    // Abaikan jika audio tidak diizinkan oleh browser
  }
}

// Format timer MM:SS
function formatTimeDisplay(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [loadingActive, setLoadingActive] = useState<boolean>(true);
  const [liveActualSeconds, setLiveActualSeconds] = useState<number>(0);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);

  // Ref penjejakan waktu aktual berbasis wall-clock timestamp (tahan background tab throttling)
  const segmentStartTimeRef = useRef<number | null>(null);
  const baseActualSecondsRef = useRef<number>(0);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const workerRef = useRef<Worker | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simpan state penjejakan lokal ke localStorage
  const saveLocalTrackingState = useCallback((state: LocalSessionTrackingState | null) => {
    if (!user) return;
    try {
      if (state) {
        localStorage.setItem(LOCAL_FOCUS_TRACKING_KEY(user.id), JSON.stringify(state));
      } else {
        localStorage.removeItem(LOCAL_FOCUS_TRACKING_KEY(user.id));
      }
    } catch {}
  }, [user]);

  // Muat state penjejakan lokal dari localStorage
  const getLocalTrackingState = useCallback((): LocalSessionTrackingState | null => {
    if (!user) return null;
    try {
      const raw = localStorage.getItem(LOCAL_FOCUS_TRACKING_KEY(user.id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [user]);

  // ---------------------------------------------------------------------------
  // 1. Inisialisasi Active Session & Sinkronisasi Wall-Clock
  // ---------------------------------------------------------------------------
  const refreshActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      setLiveActualSeconds(0);
      setLoadingActive(false);
      return;
    }

    try {
      const active = await fetchActiveSession(user.id);
      setActiveSession(active);

      if (active) {
        const localTrack = getLocalTrackingState();
        if (active.status === 'running') {
          // Jika di localStorage tercatat running untuk sesi ini, hitung durasi sebenarnya sejak segment start
          if (localTrack && localTrack.sessionId === active.id && localTrack.segmentStartTimeMs) {
            baseActualSecondsRef.current = localTrack.baseActualSeconds;
            segmentStartTimeRef.current = localTrack.segmentStartTimeMs;
            const now = Date.now();
            const elapsed = Math.floor((now - localTrack.segmentStartTimeMs) / 1000);
            const total = localTrack.baseActualSeconds + elapsed;
            setLiveActualSeconds(total);
          } else {
            // Sesi baru di-load dari server
            baseActualSecondsRef.current = active.actualDurationSeconds;
            segmentStartTimeRef.current = Date.now();
            setLiveActualSeconds(active.actualDurationSeconds);
            saveLocalTrackingState({
              sessionId: active.id,
              userId: user.id,
              status: 'running',
              baseActualSeconds: active.actualDurationSeconds,
              segmentStartTimeMs: Date.now(),
              targetDurationSeconds: active.targetDurationSeconds,
              lastCheckpointMs: Date.now(),
            });
          }
        } else {
          // Status paused
          baseActualSecondsRef.current = active.actualDurationSeconds;
          segmentStartTimeRef.current = null;
          setLiveActualSeconds(active.actualDurationSeconds);
          saveLocalTrackingState({
            sessionId: active.id,
            userId: user.id,
            status: 'paused',
            baseActualSeconds: active.actualDurationSeconds,
            segmentStartTimeMs: null,
            targetDurationSeconds: active.targetDurationSeconds,
            lastCheckpointMs: Date.now(),
          });
        }
      } else {
        segmentStartTimeRef.current = null;
        baseActualSecondsRef.current = 0;
        setLiveActualSeconds(0);
        saveLocalTrackingState(null);
      }
    } catch (err) {
      console.warn('[VLT FocusContext] Gagal memuat active session:', err);
    } finally {
      setLoadingActive(false);
    }
  }, [user, getLocalTrackingState, saveLocalTrackingState]);

  const refreshRecentSessions = useCallback(async () => {
    if (!user) return;
    try {
      const history = await fetchRecentSessions(user.id, 10);
      setRecentSessions(history);
    } catch (err) {
      console.warn('[VLT FocusContext] Gagal memuat riwayat sesi:', err);
    }
  }, [user]);

  // Load awal saat user terautentikasi
  useEffect(() => {
    refreshActiveSession();
    refreshRecentSessions();
  }, [refreshActiveSession, refreshRecentSessions]);

  // ---------------------------------------------------------------------------
  // 2. Web Worker Timer Engine (Tahan Throttling Tab di Background)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Inisialisasi inline Web Worker yang berjalan di thread terpisah (kebal pembekuan tab Chrome/Edge)
      const workerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timerId) clearInterval(timerId);
            timerId = setInterval(function() {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timerId) clearInterval(timerId);
            timerId = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          handleTimerTick();
        }
      };
    } catch (err) {
      console.warn('[VLT FocusContext] Web Worker tidak didukung, menggunakan fallback interval:', err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, []);

  // Handler setiap detik dari Web Worker / fallback
  const handleTimerTick = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'running' || !segmentStartTimeRef.current || !user) {
      return;
    }

    const now = Date.now();
    const segmentElapsed = Math.floor((now - segmentStartTimeRef.current) / 1000);
    const currentTotal = baseActualSecondsRef.current + segmentElapsed;
    setLiveActualSeconds(currentTotal);

    // Perbarui judul tab browser agar sisa waktu terlihat saat di tab lain
    const remaining = Math.max(0, activeSession.targetDurationSeconds - currentTotal);
    document.title = `(${formatTimeDisplay(remaining)}) VLT — Focus`;

    // 1. Cek apakah sesi fokus sudah mencapai target waktu secara normal
    if (currentTotal >= activeSession.targetDurationSeconds) {
      // Hentikan timer dan selesaikan sesi secara otomatis
      if (workerRef.current) workerRef.current.postMessage('stop');
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);

      try {
        await apiCompleteSession(user.id, activeSession.id, activeSession.targetDurationSeconds);
        playTimerCompletionChime();
        document.title = '✓ Selesai! VLT — Focus';
        setActiveSession(null);
        segmentStartTimeRef.current = null;
        baseActualSecondsRef.current = 0;
        setLiveActualSeconds(0);
        saveLocalTrackingState(null);
        refreshRecentSessions();
      } catch (err) {
        console.error('[VLT FocusContext] Gagal menyelesaikan sesi otomatis:', err);
      }
      return;
    }

    // 2. Checkpoint ke server/database setiap HEARTBEAT_INTERVAL_MS (10 detik)
    if (now - lastHeartbeatTimeRef.current >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatTimeRef.current = now;
      saveLocalTrackingState({
        sessionId: activeSession.id,
        userId: user.id,
        status: 'running',
        baseActualSeconds: baseActualSecondsRef.current,
        segmentStartTimeMs: segmentStartTimeRef.current,
        targetDurationSeconds: activeSession.targetDurationSeconds,
        lastCheckpointMs: now,
      });

      try {
        await sendHeartbeatCheckpoint(user.id, activeSession.id, currentTotal);
      } catch (err) {
        // Fallback offline disimpan di local tracking state
      }
    }
  }, [activeSession, user, saveLocalTrackingState, refreshRecentSessions]);

  // Kendalikan start/stop worker sesuai status activeSession
  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      if (workerRef.current) {
        workerRef.current.postMessage('start');
      } else {
        if (!fallbackIntervalRef.current) {
          fallbackIntervalRef.current = setInterval(handleTimerTick, 1000);
        }
      }
    } else {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      if (!activeSession) {
        document.title = 'VLT — Velgryn Learning Tracking';
      } else if (activeSession.status === 'paused') {
        const remaining = Math.max(0, activeSession.targetDurationSeconds - liveActualSeconds);
        document.title = `[Dijeda ${formatTimeDisplay(remaining)}] VLT — Focus`;
      }
    }
  }, [activeSession, handleTimerTick, liveActualSeconds]);

  // ---------------------------------------------------------------------------
  // 3. Listener Visibilitas Tab Browser (document.visibilitychange)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === 'undefined' || !user) return;

    const handleVisibilityChange = async () => {
      if (!activeSession || activeSession.status !== 'running' || !segmentStartTimeRef.current) {
        return;
      }

      const now = Date.now();
      const segmentElapsed = Math.floor((now - segmentStartTimeRef.current) / 1000);
      const currentTotal = baseActualSecondsRef.current + segmentElapsed;

      if (document.visibilityState === 'visible') {
        // Saat pengguna kembali ke tab VLT: langsung update tampilan seketika dengan wall-clock time
        setLiveActualSeconds(currentTotal);
        lastHeartbeatTimeRef.current = now;
        try {
          await sendHeartbeatCheckpoint(user.id, activeSession.id, currentTotal);
        } catch {}
      } else if (document.visibilityState === 'hidden') {
        // Saat pengguna berpindah ke tab/aplikasi lain: simpan checkpoint langsung ke DB
        try {
          await sendHeartbeatCheckpoint(user.id, activeSession.id, currentTotal);
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, activeSession]);

  // ---------------------------------------------------------------------------
  // 4. Action Methods: Start, Pause, Resume, Stop Early, Cancel
  // ---------------------------------------------------------------------------
  const startSession = async (input: StartSessionInput): Promise<StudySession> => {
    if (!user) throw new Error('Pengguna belum terautentikasi.');

    const created = await startStudySession(user.id, input);
    const now = Date.now();
    baseActualSecondsRef.current = 0;
    segmentStartTimeRef.current = now;
    lastHeartbeatTimeRef.current = now;
    setLiveActualSeconds(0);
    setActiveSession(created);

    saveLocalTrackingState({
      sessionId: created.id,
      userId: user.id,
      status: 'running',
      baseActualSeconds: 0,
      segmentStartTimeMs: now,
      targetDurationSeconds: created.targetDurationSeconds,
      lastCheckpointMs: now,
    });

    return created;
  };

  const pauseSessionAction = async (): Promise<void> => {
    if (!user || !activeSession) return;

    const now = Date.now();
    const segmentElapsed = segmentStartTimeRef.current 
      ? Math.floor((now - segmentStartTimeRef.current) / 1000) 
      : 0;
    const finalActual = baseActualSecondsRef.current + segmentElapsed;

    await apiPauseSession(user.id, activeSession.id, finalActual);

    baseActualSecondsRef.current = finalActual;
    segmentStartTimeRef.current = null;
    setLiveActualSeconds(finalActual);
    setActiveSession(prev => prev ? { ...prev, status: 'paused', actualDurationSeconds: finalActual } : null);

    saveLocalTrackingState({
      sessionId: activeSession.id,
      userId: user.id,
      status: 'paused',
      baseActualSeconds: finalActual,
      segmentStartTimeMs: null,
      targetDurationSeconds: activeSession.targetDurationSeconds,
      lastCheckpointMs: now,
    });
  };

  const resumeSessionAction = async (): Promise<void> => {
    if (!user || !activeSession) return;

    await apiResumeSession(user.id, activeSession.id);

    const now = Date.now();
    baseActualSecondsRef.current = liveActualSeconds;
    segmentStartTimeRef.current = now;
    lastHeartbeatTimeRef.current = now;
    setActiveSession(prev => prev ? { ...prev, status: 'running' } : null);

    saveLocalTrackingState({
      sessionId: activeSession.id,
      userId: user.id,
      status: 'running',
      baseActualSeconds: liveActualSeconds,
      segmentStartTimeMs: now,
      targetDurationSeconds: activeSession.targetDurationSeconds,
      lastCheckpointMs: now,
    });
  };

  const stopEarlySessionAction = async (): Promise<void> => {
    if (!user || !activeSession) return;

    const now = Date.now();
    const segmentElapsed = segmentStartTimeRef.current 
      ? Math.floor((now - segmentStartTimeRef.current) / 1000) 
      : 0;
    const finalActual = baseActualSecondsRef.current + segmentElapsed;

    await apiCompleteSession(user.id, activeSession.id, finalActual);

    setActiveSession(null);
    segmentStartTimeRef.current = null;
    baseActualSecondsRef.current = 0;
    setLiveActualSeconds(0);
    saveLocalTrackingState(null);
    document.title = 'VLT — Velgryn Learning Tracking';
    await refreshRecentSessions();
  };

  const cancelSessionAction = async (): Promise<void> => {
    if (!user || !activeSession) return;

    await apiCancelSession(user.id, activeSession.id);

    setActiveSession(null);
    segmentStartTimeRef.current = null;
    baseActualSecondsRef.current = 0;
    setLiveActualSeconds(0);
    saveLocalTrackingState(null);
    document.title = 'VLT — Velgryn Learning Tracking';
    await refreshRecentSessions();
  };

  return (
    <FocusContext.Provider
      value={{
        activeSession,
        liveActualSeconds,
        loadingActive,
        isRunning: activeSession?.status === 'running',
        isPaused: activeSession?.status === 'paused',
        recentSessions,
        startSession,
        pauseSession: pauseSessionAction,
        resumeSession: resumeSessionAction,
        stopEarlySession: stopEarlySessionAction,
        cancelSession: cancelSessionAction,
        refreshActiveSession,
        refreshRecentSessions,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = (): FocusContextType => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};

