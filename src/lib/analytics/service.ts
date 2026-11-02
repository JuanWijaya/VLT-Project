import { supabase } from '../supabase';
import type { StudySession } from '../../types/focus';
import type { EnrichedCourse, EnrichedLesson } from '../roadmap/types';
import type { AnalyticsPeriod, AnalyticsSummary, DailyFocusBar, TimeOfDayDistribution, CourseAnalyticsBreakdown } from '../../types/analytics';
import { formatDateToLocalKey } from '../calendar/service';
import { calculateProgressPercentage } from '../roadmap/merger';

const LOCAL_SESSIONS_KEY = (userId: string) => `vlt-focus-sessions-${userId}`;
const LOCAL_ACTIVE_KEY = (userId: string) => `vlt-focus-active-${userId}`;

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Format total menit menjadi jam dan menit yang ramah pengguna.
 * Contoh: 150 menit -> "2j 30m", 45 menit -> "45m"
 */
export function formatFocusDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 menit';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}j ${mins}m`;
  if (hours > 0) return `${hours} jam`;
  return `${mins} menit`;
}

/**
 * Menghitung metrik analytics dari data aktual pengguna secara deterministik dan murni (zero dummy data).
 */
export function computeAnalyticsMetrics(
  sessions: StudySession[],
  courses: EnrichedCourse[],
  lessons: EnrichedLesson[],
  period: AnalyticsPeriod = '7d',
  now: Date = new Date()
): AnalyticsSummary {
  const todayKey = formatDateToLocalKey(now);

  // 1. Tentukan rentang hari berdasarkan periode yang dipilih
  const periodDaysCount = period === '7d' ? 7 : period === '30d' ? 30 : 0;
  const targetDateKeys: string[] = [];

  if (periodDaysCount > 0) {
    for (let i = periodDaysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      targetDateKeys.push(formatDateToLocalKey(d));
    }
  }

  // 2. Filter sesi kerja (mode === 'work') yang valid
  // PRD FR-ANA-01: Waktu istirahat dan jeda tidak dihitung sebagai waktu fokus
  const workSessions = sessions.filter((s) => {
    if (s.mode !== 'work') return false;
    if (s.status === 'cancelled') return false;
    if (s.actualDurationSeconds <= 0) return false;

    if (periodDaysCount > 0) {
      const sDateKey = formatDateToLocalKey(new Date(s.startTime));
      return targetDateKeys.includes(sDateKey);
    }
    return true;
  });

  // Jika periode 'all', kumpulkan seluruh tanggal unik yang ada sesi (atau default 7 hari jika kosong)
  if (period === 'all') {
    const datesSet = new Set<string>();
    workSessions.forEach((s) => datesSet.add(formatDateToLocalKey(new Date(s.startTime))));
    // Tambahkan minimal 7 hari terakhir jika data historis sedikit agar grafik tetap rapi
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      datesSet.add(formatDateToLocalKey(d));
    }
    const sorted = Array.from(datesSet).sort();
    targetDateKeys.push(...sorted);
  }

  // 3. Agregasi Harian (Daily Breakdown)
  const dailySecondsMap = new Map<string, { seconds: number; sessionCount: number }>();
  workSessions.forEach((s) => {
    const key = formatDateToLocalKey(new Date(s.startTime));
    const current = dailySecondsMap.get(key) || { seconds: 0, sessionCount: 0 };
    current.seconds += s.actualDurationSeconds;
    current.sessionCount += 1;
    dailySecondsMap.set(key, current);
  });

  const dailyBars: DailyFocusBar[] = targetDateKeys.map((dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayLabel = DAY_NAMES[dateObj.getDay()];
    const shortDate = `${d} ${MONTH_NAMES[m - 1]}`;
    const stats = dailySecondsMap.get(dateKey) || { seconds: 0, sessionCount: 0 };

    return {
      dateKey,
      dayLabel,
      shortDate,
      focusMinutes: Math.round(stats.seconds / 60),
      sessionCount: stats.sessionCount,
      isToday: dateKey === todayKey,
    };
  });

  // 4. Hitung Total & Rata-rata
  const totalFocusSeconds = workSessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0);
  const totalFocusMinutes = Math.round(totalFocusSeconds / 60);
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;
  const validSessionsCount = workSessions.length;

  const activeDaysCount = dailyBars.filter((b) => b.focusMinutes > 0).length;
  const effectivePeriodDays = dailyBars.length || 1;
  const averageDailyMinutes = activeDaysCount > 0 ? Math.round(totalFocusMinutes / activeDaysCount) : 0;
  const consistencyRatePercent = Math.round((activeDaysCount / effectivePeriodDays) * 100);

  // 5. Pola Jam Belajar (Time of Day Distribution)
  const timeOfDay: TimeOfDayDistribution = {
    morningMinutes: 0,
    afternoonMinutes: 0,
    eveningMinutes: 0,
    nightMinutes: 0,
  };

  workSessions.forEach((s) => {
    const hour = new Date(s.startTime).getHours();
    const mins = Math.round(s.actualDurationSeconds / 60);
    if (hour >= 5 && hour < 12) {
      timeOfDay.morningMinutes += mins;
    } else if (hour >= 12 && hour < 17) {
      timeOfDay.afternoonMinutes += mins;
    } else if (hour >= 17 && hour < 24) {
      timeOfDay.eveningMinutes += mins;
    } else {
      timeOfDay.nightMinutes += mins;
    }
  });

  // 6. Progres Belajar & Distribusi per Course
  const courseSecondsMap = new Map<string, number>();
  workSessions.forEach((s) => {
    if (s.courseId) {
      const cur = courseSecondsMap.get(s.courseId) || 0;
      courseSecondsMap.set(s.courseId, cur + s.actualDurationSeconds);
    }
  });

  const courseBreakdowns: CourseAnalyticsBreakdown[] = courses.map((c) => {
    const focusSeconds = courseSecondsMap.get(c.id) || 0;
    return {
      courseId: c.id,
      courseTitle: c.title,
      focusMinutes: Math.round(focusSeconds / 60),
      completedLessons: c.completedLessons,
      totalLessons: c.totalLessons,
      progressPercent: c.progressPercentage,
    };
  });

  const totalCompletedLessons = lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = lessons.length;
  const overallCourseProgressPercent = calculateProgressPercentage(totalLessons, totalCompletedLessons);

  return {
    period,
    totalFocusSeconds,
    totalFocusMinutes,
    totalFocusHours,
    formattedTotalFocus: formatFocusDuration(totalFocusMinutes),
    validSessionsCount,
    activeDaysCount,
    periodDaysCount: effectivePeriodDays,
    averageDailyMinutes,
    consistencyRatePercent,
    totalCompletedLessons,
    totalLessons,
    overallCourseProgressPercent,
    dailyBars,
    timeOfDay,
    courses: courseBreakdowns,
  };
}

/**
 * Mengambil data mentah sesi, courses, dan lessons untuk analitik dari Supabase (atau fallback).
 */
export async function fetchAllAnalyticsRawData(userId: string): Promise<{
  sessions: StudySession[];
  courses: EnrichedCourse[];
  lessons: EnrichedLesson[];
}> {
  try {
    // 1. Fetch study sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('study_sessions')
      .select(`
        id, user_id, course_id, lesson_id, title, mode, status,
        target_duration_seconds, actual_duration_seconds,
        start_time, end_time, last_heartbeat_at, created_at, updated_at,
        courses ( id, title ),
        lessons ( id, title )
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    let sessions: StudySession[] = [];
    if (sessionsError) {
      sessions = getLocalSessions(userId);
    } else {
      sessions = (sessionsData || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        courseTitle: row.courses?.title || null,
        lessonId: row.lesson_id,
        lessonTitle: row.lessons?.title || null,
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

    // 2. Fetch courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // 3. Fetch lessons
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    const lessonsMap = new Map<string, EnrichedLesson[]>();
    const allLessons: EnrichedLesson[] = (lessonsData || []).map((l: any) => ({
      id: l.id,
      courseId: l.course_id,
      stableId: l.stable_id,
      title: l.title,
      orderIndex: l.order_index,
      status: l.status,
      referenceUrl: l.reference_url,
      isMissingFromSource: Boolean(l.is_missing_from_source),
      updatedAt: l.updated_at,
    }));

    allLessons.forEach((l) => {
      const arr = lessonsMap.get(l.courseId) || [];
      arr.push(l);
      lessonsMap.set(l.courseId, arr);
    });

    const courses: EnrichedCourse[] = (coursesData || []).map((c: any) => {
      const cLessons = lessonsMap.get(c.id) || [];
      const total = cLessons.length;
      const completed = cLessons.filter((l) => l.status === 'completed').length;
      return {
        id: c.id,
        stableId: c.stable_id,
        title: c.title,
        description: c.description,
        schemaVersion: c.schema_version,
        totalLessons: total,
        completedLessons: completed,
        progressPercentage: calculateProgressPercentage(total, completed),
        updatedAt: c.updated_at,
      };
    });

    return { sessions, courses, lessons: allLessons };
  } catch (err) {
    console.warn('[VLT Analytics] Fallback loading analytics data:', err);
    return {
      sessions: getLocalSessions(userId),
      courses: [],
      lessons: [],
    };
  }
}

function getLocalSessions(userId: string): StudySession[] {
  try {
    const rawCompleted = localStorage.getItem(LOCAL_SESSIONS_KEY(userId));
    const rawActive = localStorage.getItem(LOCAL_ACTIVE_KEY(userId));
    const list: StudySession[] = rawCompleted ? JSON.parse(rawCompleted) : [];
    if (rawActive) {
      const active = JSON.parse(rawActive);
      list.push(active);
    }
    return list;
  } catch {
    return [];
  }
}

