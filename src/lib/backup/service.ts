import { supabase } from '../supabase';
import type { 
  VLTBackupFileV1, 
  BackupValidationResult, 
  BackupRestorePreview 
} from '../../types/backup';
import type { CourseRow, LessonRow } from '../../types/database';
import type { StudySession } from '../../types/focus';
import { fetchSchedules, fetchDeadlines } from '../calendar/service';
import { fetchRecentSessions } from '../focus/service';
import { getStoredManualOrder, saveStoredManualOrder } from '../priorities/service';

/**
 * Mengumpulkan seluruh data personal pengguna dari Supabase (dan fallback) ke dalam format backup terstandar.
 */
export async function generateUserBackup(userId: string): Promise<VLTBackupFileV1> {
  // 1. Profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // 2. Courses
  const { data: coursesData } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId);

  // 3. Lessons
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('*')
    .eq('user_id', userId);

  // 4. Schedules & Deadlines (menggunakan service calendar)
  const schedules = await fetchSchedules(userId);
  const deadlines = await fetchDeadlines(userId);

  // 5. Study Sessions
  let studySessions: StudySession[] = [];
  try {
    const { data: sessionsData, error: sErr } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId);

    if (sErr || !sessionsData) {
      studySessions = await fetchRecentSessions(userId, 100);
    } else {
      studySessions = sessionsData.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        title: row.title,
        mode: row.mode,
        status: row.status,
        targetDurationSeconds: row.target_duration_seconds,
        actualDurationSeconds: row.actual_duration_seconds,
        startTime: row.start_time,
        endTime: row.end_time,
        lastHeartbeatAt: row.last_heartbeat_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
  } catch {
    studySessions = await fetchRecentSessions(userId, 100);
  }

  // 6. Preferences
  let workDuration: number | undefined;
  let breakDuration: number | undefined;
  let theme: string | undefined;
  try {
    const w = localStorage.getItem('vlt-work-duration');
    const b = localStorage.getItem('vlt-break-duration');
    const t = localStorage.getItem('vlt-theme');
    if (w) workDuration = parseInt(w, 10);
    if (b) breakDuration = parseInt(b, 10);
    if (t) theme = t;
  } catch {}

  const manualPriorityOrder = getStoredManualOrder(userId) || undefined;

  const courses: CourseRow[] = coursesData || [];
  const lessons: LessonRow[] = lessonsData || [];

  return {
    schemaVersion: '1.0',
    appVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    userId,
    metadata: {
      totalCourses: courses.length,
      totalLessons: lessons.length,
      totalSchedules: schedules.length,
      totalDeadlines: deadlines.length,
      totalStudySessions: studySessions.length,
    },
    data: {
      profile: profileData || null,
      courses,
      lessons,
      schedules,
      deadlines,
      studySessions,
      preferences: {
        theme,
        workDuration,
        breakDuration,
        manualPriorityOrder,
      },
    },
  };
}

/**
 * Memicu pengunduhan file backup JSON di peramban.
 */
export function triggerBackupDownload(backup: VLTBackupFileV1): void {
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `vlt-backup-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Memvalidasi integritas dan versi skema file backup JSON.
 */
export function validateBackupFile(rawJsonString: string): BackupValidationResult {
  const errors: string[] = [];
  let parsed: any;

  try {
    parsed = JSON.parse(rawJsonString);
  } catch (err) {
    return {
      isValid: false,
      errors: ['Format file bukan JSON yang valid atau file mengalami kerusakan (corrupted).'],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      isValid: false,
      errors: ['Struktur backup JSON harus berupa objek root yang valid.'],
    };
  }

  // Validasi field schemaVersion (Wajib "1.0" sesuai PRD Bagian 14.4)
  if (!parsed.schemaVersion) {
    errors.push('Field wajib "schemaVersion" tidak ditemukan pada file backup.');
  } else if (parsed.schemaVersion !== '1.0') {
    errors.push(`Versi skema backup "${parsed.schemaVersion}" tidak didukung oleh versi aplikasi saat ini (hanya mendukung "1.0").`);
  }

  // Validasi objek data
  if (!parsed.data || typeof parsed.data !== 'object') {
    errors.push('Objek "data" tidak ditemukan pada file backup.');
  } else {
    if (!Array.isArray(parsed.data.courses)) {
      errors.push('Koleksi data "courses" harus berupa array.');
    }
    if (!Array.isArray(parsed.data.lessons)) {
      errors.push('Koleksi data "lessons" harus berupa array.');
    }
    if (!Array.isArray(parsed.data.schedules)) {
      errors.push('Koleksi data "schedules" harus berupa array.');
    }
    if (!Array.isArray(parsed.data.deadlines)) {
      errors.push('Koleksi data "deadlines" harus berupa array.');
    }
    if (!Array.isArray(parsed.data.studySessions)) {
      errors.push('Koleksi data "studySessions" harus berupa array.');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: parsed as VLTBackupFileV1 };
}

/**
 * Menghasilkan pratinjau ringkas data sebelum pemulihan dijalankan.
 */
export function generateRestorePreview(backup: VLTBackupFileV1): BackupRestorePreview {
  return {
    coursesCount: backup.data.courses?.length || 0,
    lessonsCount: backup.data.lessons?.length || 0,
    schedulesCount: backup.data.schedules?.length || 0,
    deadlinesCount: backup.data.deadlines?.length || 0,
    studySessionsCount: backup.data.studySessions?.length || 0,
    exportedAt: backup.exportedAt || new Date().toISOString(),
  };
}

/**
 * Memulihkan data backup ke akun pengguna yang sedang login.
 * Keamanan RLS: Seluruh data dipetakan ke targetUserId milik pengguna aktif untuk mencegah pembajakan kepemilikan.
 */
export async function restoreUserBackup(
  targetUserId: string,
  backup: VLTBackupFileV1
): Promise<{ success: boolean; message: string }> {
  try {
    const { courses, lessons, schedules, deadlines, studySessions, preferences } = backup.data;

    // 1. Pulihkan Courses
    const courseIdMap = new Map<string, string>(); // oldId -> newId/stableId
    if (courses && courses.length > 0) {
      for (const c of courses) {
        const { data: upsertedCourse, error: cErr } = await supabase
          .from('courses')
          .upsert({
            user_id: targetUserId,
            stable_id: c.stable_id,
            title: c.title,
            description: c.description,
            schema_version: c.schema_version || '1.0',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id, stable_id' })
          .select('id, stable_id')
          .single();

        if (!cErr && upsertedCourse) {
          courseIdMap.set(c.id, upsertedCourse.id);
          courseIdMap.set(c.stable_id, upsertedCourse.id);
        }
      }
    }

    // 2. Pulihkan Lessons
    if (lessons && lessons.length > 0) {
      for (const l of lessons) {
        const targetCourseId = courseIdMap.get(l.course_id) || l.course_id;
        await supabase
          .from('lessons')
          .upsert({
            course_id: targetCourseId,
            user_id: targetUserId,
            stable_id: l.stable_id,
            title: l.title,
            order_index: l.order_index,
            status: l.status,
            reference_url: l.reference_url,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'course_id, stable_id' });
      }
    }

    // 3. Pulihkan Schedules
    if (schedules && schedules.length > 0) {
      for (const s of schedules) {
        const targetCourseId = s.courseId ? (courseIdMap.get(s.courseId) || s.courseId) : null;
        await supabase
          .from('schedules')
          .insert({
            user_id: targetUserId,
            title: s.title,
            description: s.description || null,
            start_time: s.startTime,
            end_time: s.endTime,
            status: s.status,
            course_id: targetCourseId,
            lesson_id: s.lessonId || null,
          });
      }
    }

    // 4. Pulihkan Deadlines
    if (deadlines && deadlines.length > 0) {
      for (const d of deadlines) {
        const targetCourseId = d.courseId ? (courseIdMap.get(d.courseId) || d.courseId) : null;
        await supabase
          .from('deadlines')
          .insert({
            user_id: targetUserId,
            title: d.title,
            description: d.description || null,
            due_date: d.dueDate,
            status: d.status,
            course_id: targetCourseId,
            lesson_id: d.lessonId || null,
          });
      }
    }

    // 5. Pulihkan Study Sessions
    if (studySessions && studySessions.length > 0) {
      for (const ss of studySessions) {
        const targetCourseId = ss.courseId ? (courseIdMap.get(ss.courseId) || ss.courseId) : null;
        await supabase
          .from('study_sessions')
          .insert({
            user_id: targetUserId,
            course_id: targetCourseId,
            lesson_id: ss.lessonId || null,
            title: ss.title || null,
            mode: ss.mode,
            status: ss.status,
            target_duration_seconds: ss.targetDurationSeconds,
            actual_duration_seconds: ss.actualDurationSeconds,
            start_time: ss.startTime,
            end_time: ss.endTime || null,
            last_heartbeat_at: ss.lastHeartbeatAt || new Date().toISOString(),
          });
      }
    }

    // 6. Pulihkan Preferensi Lokal
    if (preferences) {
      if (preferences.workDuration) {
        localStorage.setItem('vlt-work-duration', preferences.workDuration.toString());
      }
      if (preferences.breakDuration) {
        localStorage.setItem('vlt-break-duration', preferences.breakDuration.toString());
      }
      if (preferences.manualPriorityOrder) {
        saveStoredManualOrder(targetUserId, preferences.manualPriorityOrder);
      }
    }

    return {
      success: true,
      message: 'Seluruh data backup berhasil dipulihkan secara aman ke akun Anda.',
    };
  } catch (err: any) {
    console.error('[VLT Backup] Gagal memulihkan backup:', err);
    return {
      success: false,
      message: `Terjadi kendala saat memulihkan data: ${err.message || 'Kesalahan jaringan/database'}`,
    };
  }
}
