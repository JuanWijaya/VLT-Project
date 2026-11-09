import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
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

  // Refs mutable imperatif: Sumber kebenaran instan untuk loop timer & Web Worker (Bebas Stale Closure)
  const activeSessionRef = useRef<StudySession | null>(null);
  const userRef = useRef<User | null>(user);
  const segmentStartTimeRef = useRef<number | null>(null);
  const baseActualSecondsRef = useRef<number>(0);
  const liveActualSecondsRef = useRef<number>(0);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const workerRef = useRef<Worker | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  // Selalu sinkronkan refs dengan state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Simpan state penjejakan lokal ke localStorage
  const saveLocalTrackingState = useCallback((state: LocalSessionTrackingState | null) => {
    if (!userRef.current) return;
    try {
      if (state) {
        localStorage.setItem(LOCAL_FOCUS_TRACKING_KEY(userRef.current.id), JSON.stringify(state));
      } else {
        localStorage.removeItem(LOCAL_FOCUS_TRACKING_KEY(userRef.current.id));
      }
    } catch {}
  }, []);

  // Muat state penjejakan lokal dari localStorage
  const getLocalTrackingState = useCallback((): LocalSessionTrackingState | null => {
    if (!userRef.current) return null;
    try {
      const raw = localStorage.getItem(LOCAL_FOCUS_TRACKING_KEY(userRef.current.id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const refreshRecentSessions = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    try {
      const history = await fetchRecentSessions(currentUser.id, 10);
      setRecentSessions(history);
    } catch (err) {
      console.warn('[VLT FocusContext] Gagal memuat riwayat sesi:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Eksekusi Tuntas Sesi Fokus Normal (Tepat di target duration, tidak bablas)
  // ---------------------------------------------------------------------------
  const handleAutoCompletion = useCallback(async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    const session = activeSessionRef.current;
    const currentUser = userRef.current;
    if (!session || !currentUser) {
      isCompletingRef.current = false;
      return;
    }

    try {
      // Hentikan worker
      if (workerRef.current) workerRef.current.postMessage('stop');

      // Tuntaskan di database dengan durasi target pas (misal 25 menit = 1500 detik)
      await apiCompleteSession(currentUser.id, session.id, session.targetDurationSeconds);

      playTimerCompletionChime();
      document.title = '✓ Selesai! VLT — Focus Room';

      activeSessionRef.current = null;
      setActiveSession(null);
      segmentStartTimeRef.current = null;
      baseActualSecondsRef.current = 0;
      liveActualSecondsRef.current = 0;
      setLiveActualSeconds(0);
      saveLocalTrackingState(null);

      await refreshRecentSessions();
    } catch (err) {
      console.error('[VLT FocusContext] Gagal auto-complete sesi:', err);
    } finally {
      isCompletingRef.current = false;
    }
  }, [saveLocalTrackingState, refreshRecentSessions]);

  // ---------------------------------------------------------------------------
  // 2. Handler Setiap Detik (Tick): Menggunakan Refs Imperatif Bebas Stale Closure
  // ---------------------------------------------------------------------------
  const handleTimerTick = useCallback(async () => {
    const session = activeSessionRef.current;
    const currentUser = userRef.current;
    const segmentStart = segmentStartTimeRef.current;

    if (!session || session.status !== 'running' || !segmentStart || !currentUser) {
      return;
    }

    const now = Date.now();
    const segmentElapsed = Math.max(0, Math.floor((now - segmentStart) / 1000));
    const currentTotal = baseActualSecondsRef.current + segmentElapsed;

    // SANGAT PENTING: Kunci durasi aktual maksimal tepat pada targetDurationSeconds!
    // Tidak boleh pernah melebihi target (misal target 25 menit tidak boleh tembus 27 menit)
    const cappedTotal = Math.min(currentTotal, session.targetDurationSeconds);
    liveActualSecondsRef.current = cappedTotal;
    setLiveActualSeconds(cappedTotal);

    // Update judul tab browser secara real-time
    const remaining = Math.max(0, session.targetDurationSeconds - cappedTotal);
    document.title = `(${formatTimeDisplay(remaining)}) VLT — Focus`;

    // 1. Cek apakah sesi fokus sudah mencapai target waktu
    if (currentTotal >= session.targetDurationSeconds) {
      await handleAutoCompletion();
      return;
    }

    // 2. Checkpoint ke server/database setiap HEARTBEAT_INTERVAL_MS (10 detik)
    if (now - lastHeartbeatTimeRef.current >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatTimeRef.current = now;
      saveLocalTrackingState({
        sessionId: session.id,
        userId: currentUser.id,
        status: 'running',
        baseActualSeconds: baseActualSecondsRef.current,
        segmentStartTimeMs: segmentStart,
        targetDurationSeconds: session.targetDurationSeconds,
        lastCheckpointMs: now,
      });

      try {
        await sendHeartbeatCheckpoint(currentUser.id, session.id, cappedTotal);
      } catch {
        // Fallback offline tersimpan di local tracking state
      }
    }
  }, [handleAutoCompletion, saveLocalTrackingState]);

  // Hubungkan tick ref ke handler terbaru
  const tickFnRef = useRef<() => void>(handleTimerTick);
  useEffect(() => {
    tickFnRef.current = handleTimerTick;
  }, [handleTimerTick]);

  // ---------------------------------------------------------------------------
  // 3. Web Worker Background Engine & Main-Thread Synchronous Interval
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
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
          tickFnRef.current();
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
    };
  }, []);

  // Interval sinkron di main-thread: Menjamin angka detik di layar berjalan mulus 100% tanpa lag
  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      const interval = setInterval(() => {
        tickFnRef.current();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  // Kendalikan start/stop worker sesuai status activeSession
  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      if (workerRef.current) {
        workerRef.current.postMessage('start');
      }
    } else {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
      if (!activeSession) {
        document.title = 'VLT — Velgryn Learning Tracking';
      } else if (activeSession.status === 'paused') {
        const remaining = Math.max(0, activeSession.targetDurationSeconds - liveActualSeconds);
        document.title = `[Dijeda ${formatTimeDisplay(remaining)}] VLT — Focus`;
      }
    }
  }, [activeSession, liveActualSeconds]);

  // ---------------------------------------------------------------------------
  // 4. Inisialisasi Active Session saat User Login / Reload
  // ---------------------------------------------------------------------------
  const refreshActiveSession = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      activeSessionRef.current = null;
      setActiveSession(null);
      setLiveActualSeconds(0);
      setLoadingActive(false);
      return;
    }

    try {
      const active = await fetchActiveSession(currentUser.id);
      activeSessionRef.current = active;
      setActiveSession(active);

      if (active) {
        const localTrack = getLocalTrackingState();
        if (active.status === 'running') {
          if (localTrack && localTrack.sessionId === active.id && localTrack.segmentStartTimeMs) {
            baseActualSecondsRef.current = localTrack.baseActualSeconds;
            segmentStartTimeRef.current = localTrack.segmentStartTimeMs;
            const now = Date.now();
            const elapsed = Math.floor((now - localTrack.segmentStartTimeMs) / 1000);
            const total = localTrack.baseActualSeconds + elapsed;
            const capped = Math.min(total, active.targetDurationSeconds);
            liveActualSecondsRef.current = capped;
            setLiveActualSeconds(capped);

            // Jika sudah mencapai target saat dibuka kembali:
            if (total >= active.targetDurationSeconds) {
              await handleAutoCompletion();
              return;
            }
          } else {
            baseActualSecondsRef.current = active.actualDurationSeconds;
            segmentStartTimeRef.current = Date.now();
            liveActualSecondsRef.current = active.actualDurationSeconds;
            setLiveActualSeconds(active.actualDurationSeconds);
            saveLocalTrackingState({
              sessionId: active.id,
              userId: currentUser.id,
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
          liveActualSecondsRef.current = active.actualDurationSeconds;
          setLiveActualSeconds(active.actualDurationSeconds);
          saveLocalTrackingState({
            sessionId: active.id,
            userId: currentUser.id,
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
        liveActualSecondsRef.current = 0;
        setLiveActualSeconds(0);
        saveLocalTrackingState(null);
      }
    } catch (err) {
      console.warn('[VLT FocusContext] Gagal memuat active session:', err);
    } finally {
      setLoadingActive(false);
    }
  }, [getLocalTrackingState, saveLocalTrackingState, handleAutoCompletion]);

  useEffect(() => {
    refreshActiveSession();
    refreshRecentSessions();
  }, [refreshActiveSession, refreshRecentSessions]);

  // ---------------------------------------------------------------------------
  // 5. Listener Visibilitas Tab Browser (document.visibilitychange)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = async () => {
      const session = activeSessionRef.current;
      const currentUser = userRef.current;
      const segmentStart = segmentStartTimeRef.current;

      if (!session || session.status !== 'running' || !segmentStart || !currentUser) {
        return;
      }

      const now = Date.now();
      const segmentElapsed = Math.max(0, Math.floor((now - segmentStart) / 1000));
      const currentTotal = baseActualSecondsRef.current + segmentElapsed;
      const cappedTotal = Math.min(currentTotal, session.targetDurationSeconds);

      liveActualSecondsRef.current = cappedTotal;
      setLiveActualSeconds(cappedTotal);

      // Jika waktu telah habis selama tab di latar belakang, tuntaskan seketika!
      if (currentTotal >= session.targetDurationSeconds) {
        await handleAutoCompletion();
        return;
      }

      // Kirim sinkronisasi seketika
      lastHeartbeatTimeRef.current = now;
      saveLocalTrackingState({
        sessionId: session.id,
        userId: currentUser.id,
        status: 'running',
        baseActualSeconds: baseActualSecondsRef.current,
        segmentStartTimeMs: segmentStart,
        targetDurationSeconds: session.targetDurationSeconds,
        lastCheckpointMs: now,
      });

      try {
        await sendHeartbeatCheckpoint(currentUser.id, session.id, cappedTotal);
      } catch {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleAutoCompletion, saveLocalTrackingState]);

  // ---------------------------------------------------------------------------
  // 6. Action Methods: Start, Pause, Resume, Stop Early, Cancel
  // ---------------------------------------------------------------------------
  const startSession = async (input: StartSessionInput): Promise<StudySession> => {
    const currentUser = userRef.current;
    if (!currentUser) throw new Error('Pengguna belum terautentikasi.');

    const created = await startStudySession(currentUser.id, input);
    const now = Date.now();
    baseActualSecondsRef.current = 0;
    segmentStartTimeRef.current = now;
    lastHeartbeatTimeRef.current = now;
    liveActualSecondsRef.current = 0;
    setLiveActualSeconds(0);
    activeSessionRef.current = created;
    setActiveSession(created);

    saveLocalTrackingState({
      sessionId: created.id,
      userId: currentUser.id,
      status: 'running',
      baseActualSeconds: 0,
      segmentStartTimeMs: now,
      targetDurationSeconds: created.targetDurationSeconds,
      lastCheckpointMs: now,
    });

    return created;
  };

  const pauseSessionAction = async (): Promise<void> => {
    const session = activeSessionRef.current;
    const currentUser = userRef.current;
    if (!currentUser || !session) return;

    const now = Date.now();
    const segmentElapsed = segmentStartTimeRef.current 
      ? Math.max(0, Math.floor((now - segmentStartTimeRef.current) / 1000)) 
      : 0;
    const finalActual = Math.min(session.targetDurationSeconds, baseActualSecondsRef.current + segmentElapsed);

    if (workerRef.current) workerRef.current.postMessage('stop');

    await apiPauseSession(currentUser.id, session.id, finalActual);

    baseActualSecondsRef.current = finalActual;
    segmentStartTimeRef.current = null;
    liveActualSecondsRef.current = finalActual;
    setLiveActualSeconds(finalActual);
    const updated = { ...session, status: 'paused' as SessionStatus, actualDurationSeconds: finalActual };
    activeSessionRef.current = updated;
    setActiveSession(updated);

    saveLocalTrackingState({
      sessionId: session.id,
      userId: currentUser.id,
      status: 'paused',
      baseActualSeconds: finalActual,
      segmentStartTimeMs: null,
      targetDurationSeconds: session.targetDurationSeconds,
      lastCheckpointMs: now,
    });
  };

  const resumeSessionAction = async (): Promise<void> => {
    const session = activeSessionRef.current;
    const currentUser = userRef.current;
    if (!currentUser || !session) return;

    await apiResumeSession(currentUser.id, session.id);

    const now = Date.now();
    baseActualSecondsRef.current = liveActualSecondsRef.current;
    segmentStartTimeRef.current = now;
    lastHeartbeatTimeRef.current = now;
    const updated = { ...session, status: 'running' as SessionStatus };
    activeSessionRef.current = updated;
    setActiveSession(updated);

    saveLocalTrackingState({
      sessionId: session.id,
      userId: currentUser.id,
      status: 'running',
      baseActualSeconds: liveActualSecondsRef.current,
      segmentStartTimeMs: now,
      targetDurationSeconds: session.targetDurationSeconds,
      lastCheckpointMs: now,
    });
  };

  const stopEarlySessionAction = async (): Promise<void> => {
    const session = activeSessionRef.current;
    const currentUser = userRef.current;
    if (!currentUser || !session) return;

    const now = Date.now();
    const segmentElapsed = segmentStartTimeRef.current 
      ? Math.max(0, Math.floor((now - segmentStartTimeRef.current) / 1000)) 
      : 0;
    const finalActual = Math.min(session.targetDurationSeconds, baseActualSecondsRef.current + segmentElapsed);

    if (workerRef.current) workerRef.current.postMessage('stop');

    await apiCompleteSession(currentUser.id, session.id, finalActual);

    activeSessionRef.current = null;
    setActiveSession(null);
    segmentStartTimeRef.current = null;
    baseActualSecondsRef.current = 0;
    liveActualSecondsRef.current = 0;
    setLiveActualSeconds(0);
    saveLocalTrackingState(null);
    document.title = 'VLT — Velgryn Learning Tracking';
    await refreshRecentSessions();
  };

  const cancelSessionAction = async (): Promise<void> => {
    const session = activeSessionRef.current;
    const currentUser = userRef.current;
    if (!currentUser || !session) return;

    if (workerRef.current) workerRef.current.postMessage('stop');

    await apiCancelSession(currentUser.id, session.id);

    activeSessionRef.current = null;
    setActiveSession(null);
    segmentStartTimeRef.current = null;
    baseActualSecondsRef.current = 0;
    liveActualSecondsRef.current = 0;
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
