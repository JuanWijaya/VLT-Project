import { supabase } from '../supabase';
import type { 
  StudySession, 
  StartSessionInput, 
  SessionStatus, 
  FocusMode 
} from '../../types/focus';

// Waktu ambang batas (threshold) untuk mendeteksi sesi ditinggalkan / sleep (30 detik tanpa heartbeat)
export const STALE_HEARTBEAT_THRESHOLD_MS = 30 * 1000;
// Interval standar pengiriman heartbeat / checkpoint (10 detik)
export const HEARTBEAT_INTERVAL_MS = 10 * 1000;

const LOCAL_SESSIONS_KEY = (userId: string) => `vlt-focus-sessions-${userId}`;
const LOCAL_ACTIVE_KEY = (userId: string) => `vlt-focus-active-${userId}`;

// ==============================================================================
// 1. QUERY & DETEKSI SESI AKTIF (RECOVERY & CROSS-DEVICE)
// ==============================================================================

/**
 * Mencari apakah ada sesi yang berstatus 'running' atau 'paused' untuk pengguna ini.
 * Jika status sesi di DB masih 'running' tetapi heartbeat terakhir > 30 detik yang lalu,
 * sesi otomatis direkonsiliasi dan ditandai sebagai 'paused' (PRD 14.3 recovery crash/sleep).
 */
export async function fetchActiveSession(userId: string): Promise<StudySession | null> {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id, user_id, course_id, lesson_id, title, mode, status, 
        target_duration_seconds, actual_duration_seconds, 
        start_time, end_time, last_heartbeat_at, created_at, updated_at,
        courses ( id, title ),
        lessons ( id, title )
      `)
      .eq('user_id', userId)
      .in('status', ['running', 'paused'])
      .order('start_time', { ascending: false })
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return getLocalActiveSession(userId);
      }
      throw error;
    }

    if (!data) return null;

    const mappedSession: StudySession = {
      id: data.id,
      userId: data.user_id,
      courseId: data.course_id,
      courseTitle: (data.courses as any)?.title || null,
      lessonId: data.lesson_id,
      lessonTitle: (data.lessons as any)?.title || null,
      title: data.title,
      mode: data.mode as FocusMode,
      status: data.status as SessionStatus,
      targetDurationSeconds: data.target_duration_seconds,
      actualDurationSeconds: data.actual_duration_seconds,
      startTime: data.start_time,
      endTime: data.end_time,
      lastHeartbeatAt: data.last_heartbeat_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Deteksi jika sesi ditinggalkan / browser ditutup mendadak / sleep (PRD 14.3)
    const nowMs = Date.now();
    const lastHeartbeatMs = new Date(mappedSession.lastHeartbeatAt).getTime();
    const timeSinceLastHeartbeat = nowMs - lastHeartbeatMs;

    if (mappedSession.status === 'running' && timeSinceLastHeartbeat > STALE_HEARTBEAT_THRESHOLD_MS) {
      // Rekonsiliasi otomatis: tandai sebagai paused di DB tanpa menambah durasi selama jeda mati
      await pauseSession(userId, mappedSession.id, mappedSession.actualDurationSeconds);
      mappedSession.status = 'paused';
    }

    return mappedSession;
  } catch (err) {
    console.warn('[VLT Focus] Memuat active session dari fallback lokal:', err);
    return getLocalActiveSession(userId);
  }
}

// ==============================================================================
// 2. MEMULAI SESI BARU (DENGAN PENEGAKAN SINGLE-ACTIVE-SESSION)
// ==============================================================================

/**
 * Memulai sesi fokus baru.
 * Menegakkan aturan PRD 14.3: Hanya boleh ada 1 sesi aktif (running atau paused) per akun.
 */
export async function startStudySession(userId: string, input: StartSessionInput): Promise<StudySession> {
  // 1. Verifikasi lokal / cepat terlebih dahulu
  const existing = await fetchActiveSession(userId);
  if (existing) {
    throw new Error(
      `Sesi fokus sedang berjalan atau dijeda di perangkat Anda. Selesaikan atau batalkan sesi '${existing.title || 'Fokus'}' terlebih dahulu.`
    );
  }

  const nowIso = new Date().toISOString();
  const payload = {
    user_id: userId,
    course_id: input.courseId || null,
    lesson_id: input.lessonId || null,
    title: input.title?.trim() || null,
    mode: input.mode,
    status: 'running',
    target_duration_seconds: input.targetDurationSeconds,
    actual_duration_seconds: 0,
    start_time: nowIso,
    last_heartbeat_at: nowIso,
  };

  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(payload)
      .select('id, user_id, course_id, lesson_id, title, mode, status, target_duration_seconds, actual_duration_seconds, start_time, end_time, last_heartbeat_at, created_at, updated_at')
      .single();

    if (error) {
      // Tangani konstrain unik uq_active_study_session_per_user (error code 23505)
      if (error.code === '23505' || error.message?.includes('uq_active_study_session_per_user')) {
        throw new Error('Sesi fokus aktif terdeteksi telah dimulai dari perangkat lain. Memuat sesi tersebut...');
      }
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return saveLocalStartSession(userId, payload);
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      courseId: data.course_id,
      lessonId: data.lesson_id,
      title: data.title,
      mode: data.mode as FocusMode,
      status: data.status as SessionStatus,
      targetDurationSeconds: data.target_duration_seconds,
      actualDurationSeconds: data.actual_duration_seconds,
      startTime: data.start_time,
      endTime: data.end_time,
      lastHeartbeatAt: data.last_heartbeat_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('perangkat lain') || err.message.includes('Sesi fokus'))) {
      throw err;
    }
    console.warn('[VLT Focus] Menyimpan sesi ke fallback lokal:', err);
    return saveLocalStartSession(userId, payload);
  }
}

// ==============================================================================
// 3. CHECKPOINT BERKALA & JEDA (HEARTBEAT <= 15s)
// ==============================================================================

/**
 * Menyimpan checkpoint berkala durasi aktual dan memperbarui timestamp last_heartbeat_at.
 */
export async function sendHeartbeatCheckpoint(
  userId: string,
  sessionId: string,
  actualDurationSeconds: number
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('study_sessions')
      .update({
        actual_duration_seconds: actualDurationSeconds,
        last_heartbeat_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      updateLocalCheckpoint(userId, sessionId, actualDurationSeconds, 'running');
    }
  } catch (err) {
    updateLocalCheckpoint(userId, sessionId, actualDurationSeconds, 'running');
  }
}

/**
 * Menjeda sesi aktif (Pause).
 */
export async function pauseSession(
  userId: string,
  sessionId: string,
  actualDurationSeconds: number
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('study_sessions')
      .update({
        status: 'paused',
        actual_duration_seconds: actualDurationSeconds,
        last_heartbeat_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      updateLocalCheckpoint(userId, sessionId, actualDurationSeconds, 'paused');
    }
  } catch (err) {
    updateLocalCheckpoint(userId, sessionId, actualDurationSeconds, 'paused');
  }
}

/**
 * Melanjutkan sesi yang dijeda (Resume).
 */
export async function resumeSession(userId: string, sessionId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('study_sessions')
      .update({
        status: 'running',
        last_heartbeat_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      updateLocalSessionStatus(userId, sessionId, 'running');
    }
  } catch (err) {
    updateLocalSessionStatus(userId, sessionId, 'running');
  }
}

// ==============================================================================
// 4. PENYELESAIAN & PEMBATALAN SESI (IDEMPOTEN)
// ==============================================================================

/**
 * Menyelesaikan sesi secara idempoten, baik selesai normal maupun dihentikan lebih awal (Stop).
 * Menyimpan durasi fokus aktual yang benar.
 */
export async function completeSession(
  userId: string,
  sessionId: string,
  actualDurationSeconds: number
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('study_sessions')
      .update({
        status: 'completed',
        actual_duration_seconds: actualDurationSeconds,
        end_time: nowIso,
        last_heartbeat_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      finishLocalSession(userId, sessionId, 'completed', actualDurationSeconds);
    }
  } catch (err) {
    finishLocalSession(userId, sessionId, 'completed', actualDurationSeconds);
  }
}

/**
 * Membatalkan sesi (Discard) tanpa menghitung waktu fokus.
 */
export async function cancelSession(userId: string, sessionId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('study_sessions')
      .update({
        status: 'cancelled',
        end_time: nowIso,
        updated_at: nowIso,
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      finishLocalSession(userId, sessionId, 'cancelled', 0);
    }
  } catch (err) {
    finishLocalSession(userId, sessionId, 'cancelled', 0);
  }
}

// ==============================================================================
// 5. RIWAYAT SESI BELAJAR (RECENT HISTORY)
// ==============================================================================

export async function fetchRecentSessions(userId: string, limit = 8): Promise<StudySession[]> {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id, user_id, course_id, lesson_id, title, mode, status,
        target_duration_seconds, actual_duration_seconds,
        start_time, end_time, last_heartbeat_at, created_at, updated_at,
        courses ( id, title ),
        lessons ( id, title )
      `)
      .eq('user_id', userId)
      .in('status', ['completed', 'cancelled'])
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return getLocalCompletedSessions(userId, limit);
      }
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      courseTitle: row.courses?.title || null,
      lessonId: row.lesson_id,
      lessonTitle: row.lessons?.title || null,
      title: row.title,
      mode: row.mode as FocusMode,
      status: row.status as SessionStatus,
      targetDurationSeconds: row.target_duration_seconds,
      actualDurationSeconds: row.actual_duration_seconds,
      startTime: row.start_time,
      endTime: row.end_time,
      lastHeartbeatAt: row.last_heartbeat_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn('[VLT Focus] Memuat riwayat dari fallback lokal:', err);
    return getLocalCompletedSessions(userId, limit);
  }
}

// ==============================================================================
// 6. LOCALSTORAGE CLIENT FALLBACK HELPERS
// ==============================================================================

function getLocalActiveSession(userId: string): StudySession | null {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVE_KEY(userId));
    if (!raw) return null;
    const session = JSON.parse(raw) as StudySession;

    // Check if stale
    const nowMs = Date.now();
    const lastHeartbeatMs = new Date(session.lastHeartbeatAt).getTime();
    if (session.status === 'running' && (nowMs - lastHeartbeatMs) > STALE_HEARTBEAT_THRESHOLD_MS) {
      session.status = 'paused';
      localStorage.setItem(LOCAL_ACTIVE_KEY(userId), JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
}

function saveLocalStartSession(userId: string, payload: any): StudySession {
  const now = new Date().toISOString();
  const session: StudySession = {
    id: `local-session-${Date.now()}`,
    userId,
    courseId: payload.course_id,
    lessonId: payload.lesson_id,
    title: payload.title,
    mode: payload.mode,
    status: 'running',
    targetDurationSeconds: payload.target_duration_seconds,
    actualDurationSeconds: 0,
    startTime: now,
    endTime: null,
    lastHeartbeatAt: now,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(LOCAL_ACTIVE_KEY(userId), JSON.stringify(session));
  return session;
}

function updateLocalCheckpoint(
  userId: string,
  sessionId: string,
  actualDurationSeconds: number,
  status: SessionStatus
) {
  try {
    const current = getLocalActiveSession(userId);
    if (current && current.id === sessionId) {
      current.actualDurationSeconds = actualDurationSeconds;
      current.status = status;
      current.lastHeartbeatAt = new Date().toISOString();
      current.updatedAt = new Date().toISOString();
      localStorage.setItem(LOCAL_ACTIVE_KEY(userId), JSON.stringify(current));
    }
  } catch {}
}

function updateLocalSessionStatus(userId: string, sessionId: string, status: SessionStatus) {
  try {
    const current = getLocalActiveSession(userId);
    if (current && current.id === sessionId) {
      current.status = status;
      current.lastHeartbeatAt = new Date().toISOString();
      current.updatedAt = new Date().toISOString();
      localStorage.setItem(LOCAL_ACTIVE_KEY(userId), JSON.stringify(current));
    }
  } catch {}
}

function finishLocalSession(
  userId: string,
  sessionId: string,
  status: 'completed' | 'cancelled',
  actualDurationSeconds: number
) {
  try {
    const current = getLocalActiveSession(userId);
    const now = new Date().toISOString();
    if (current && current.id === sessionId) {
      current.status = status;
      current.actualDurationSeconds = actualDurationSeconds;
      current.endTime = now;
      current.updatedAt = now;

      // Pindahkan ke riwayat
      const historyRaw = localStorage.getItem(LOCAL_SESSIONS_KEY(userId));
      const history: StudySession[] = historyRaw ? JSON.parse(historyRaw) : [];
      history.unshift(current);
      localStorage.setItem(LOCAL_SESSIONS_KEY(userId), JSON.stringify(history.slice(0, 50)));

      // Hapus sesi aktif
      localStorage.removeItem(LOCAL_ACTIVE_KEY(userId));
    }
  } catch {}
}

function getLocalCompletedSessions(userId: string, limit: number): StudySession[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY(userId));
    if (!raw) return [];
    const list: StudySession[] = JSON.parse(raw);
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

