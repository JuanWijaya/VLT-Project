import type { LessonStatus } from '../../types';
import type { ScheduleItem, DeadlineItem } from '../../types/calendar';
import type { DailyPriorityItem, PriorityScoreBreakdown } from '../../types/priorities';
import { formatDateToLocalKey } from '../calendar/service';

const LOCAL_MANUAL_ORDER_KEY = (userId: string) => `vlt-manual-priorities-${userId}`;

export interface LessonForPriority {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  status: LessonStatus;
  updatedAt: string;
}

/**
 * Menghitung hari tersisa antara batas tanggal lokal deadline dan hari ini.
 * Jika deadline jatuh pada tanggal sebelum hari ini, nilai negatif (overdue).
 */
export function calculateDaysRemaining(dueDateIso: string, referenceDate: Date = new Date()): number {
  const refKey = formatDateToLocalKey(referenceDate);
  const dueKey = formatDateToLocalKey(new Date(dueDateIso));

  const [refY, refM, refD] = refKey.split('-').map(Number);
  const [dueY, dueM, dueD] = dueKey.split('-').map(Number);

  const refUtc = Date.UTC(refY, refM - 1, refD);
  const dueUtc = Date.UTC(dueY, dueM - 1, dueD);

  const diffMs = dueUtc - refUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formula Skor Deadline (0–40) sesuai PRD Bagian 14.2:
 * 40 × max(0, (7 − hari_tersisa) / 7), dibatasi 0–40; overdue = 40 (maksimum); tanpa deadline = 0.
 */
export function calculateDeadlineScore(daysRemaining: number | null): number {
  if (daysRemaining === null) return 0;
  if (daysRemaining < 0) return 40; // Overdue mendapatkan poin maksimal 40
  if (daysRemaining > 7) return 0;  // Diluar jendela 7 hari = 0 poin

  const rawScore = 40 * Math.max(0, (7 - daysRemaining) / 7);
  // Dibulatkan ke 1 desimal untuk presisi dan konsistensi
  return Math.round(rawScore * 10) / 10;
}

/**
 * Formula Skor Jadwal Hari Ini (0 atau 30) sesuai PRD 14.2.
 */
export function calculateScheduleTodayScore(hasScheduleToday: boolean): number {
  return hasScheduleToday ? 30 : 0;
}

/**
 * Formula Skor Status Lesson (0–20) sesuai PRD 14.2:
 * "in_progress" (Sedang dipelajari) = 20, "not_started" (Belum dimulai) = 10, "completed" = null (dikecualikan).
 */
export function calculateStatusScore(status: LessonStatus): number | null {
  if (status === 'completed') return null; // Dikecualikan sepenuhnya dari prioritas aktif
  if (status === 'in_progress') return 20;
  return 10;
}

/**
 * Formula Skor Belum Berjadwal (0 atau 10) sesuai PRD 14.2:
 * 10 jika lesson belum punya jadwal maupun deadline sama sekali, 0 jika sudah.
 */
export function calculateUnscheduledScore(hasAnyScheduleOrDeadline: boolean): number {
  return hasAnyScheduleOrDeadline ? 0 : 10;
}

/**
 * Menghitung skor total dan rincian komponen untuk sebuah lesson.
 */
export function evaluateLessonPriority(
  lesson: LessonForPriority,
  schedules: ScheduleItem[],
  deadlines: DeadlineItem[],
  now: Date = new Date()
): DailyPriorityItem | null {
  // Aturan PRD: Lesson selesai dikecualikan sepenuhnya dari prioritas aktif
  const statusScore = calculateStatusScore(lesson.status);
  if (statusScore === null) return null;

  const todayKey = formatDateToLocalKey(now);

  // 1. Periksa apakah lesson dijadwalkan hari ini
  const hasScheduleToday = schedules.some((s) => {
    const isMatchingLesson = s.lessonId === lesson.id || (s.courseId === lesson.courseId && !s.lessonId);
    if (!isMatchingLesson) return false;
    const sDateKey = formatDateToLocalKey(new Date(s.startTime));
    return sDateKey === todayKey && s.status !== 'cancelled';
  });
  const scheduleScore = calculateScheduleTodayScore(hasScheduleToday);

  // 2. Periksa deadline terdekat yang relevan untuk lesson ini
  const relevantDeadlines = deadlines.filter((d) => {
    return (d.lessonId === lesson.id || (d.courseId === lesson.courseId && !d.lessonId)) && d.status === 'pending';
  });

  let closestDeadline: DailyPriorityItem['closestDeadline'] = undefined;
  let deadlineScore = 0;

  if (relevantDeadlines.length > 0) {
    let minDays = Infinity;
    let targetD: DeadlineItem = relevantDeadlines[0];

    for (const d of relevantDeadlines) {
      const days = calculateDaysRemaining(d.dueDate, now);
      if (days < minDays) {
        minDays = days;
        targetD = d;
      }
    }

    closestDeadline = {
      dueDate: targetD.dueDate,
      daysRemaining: minDays,
      isOverdue: minDays < 0,
    };
    deadlineScore = calculateDeadlineScore(minDays);
  }

  // 3. Periksa apakah lesson memiliki jadwal apa pun atau deadline apa pun
  const hasAnySchedule = schedules.some((s) => (s.lessonId === lesson.id || s.courseId === lesson.courseId) && s.status !== 'cancelled');
  const hasAnyDeadline = relevantDeadlines.length > 0;
  const hasAnyScheduleOrDeadline = hasAnySchedule || hasAnyDeadline;
  const unscheduledScore = calculateUnscheduledScore(hasAnyScheduleOrDeadline);

  // Total Skor
  const totalScore = Math.min(100, Math.round((deadlineScore + scheduleScore + statusScore + unscheduledScore) * 10) / 10);

  const scores: PriorityScoreBreakdown = {
    scoreDeadline: deadlineScore,
    scoreSchedule: scheduleScore,
    scoreStatus: statusScore,
    scoreUnscheduled: unscheduledScore,
    totalScore,
  };

  // Label urgensi informatif
  let urgencyLabel: string | undefined = undefined;
  if (closestDeadline) {
    if (closestDeadline.isOverdue) {
      urgencyLabel = `Overdue (${Math.abs(closestDeadline.daysRemaining)}h lalu)`;
    } else if (closestDeadline.daysRemaining === 0) {
      urgencyLabel = 'Deadline Hari Ini';
    } else if (closestDeadline.daysRemaining === 1) {
      urgencyLabel = 'Deadline Besok';
    } else if (closestDeadline.daysRemaining <= 7) {
      urgencyLabel = `Deadline ${closestDeadline.daysRemaining} hari lagi`;
    }
  } else if (hasScheduleToday) {
    urgencyLabel = 'Jadwal Hari Ini';
  } else if (lesson.status === 'in_progress') {
    urgencyLabel = 'Sedang Dipelajari';
  }

  return {
    id: lesson.id,
    lessonId: lesson.id,
    courseId: lesson.courseId,
    courseTitle: lesson.courseTitle,
    lessonTitle: lesson.title,
    status: lesson.status,
    updatedAt: lesson.updatedAt,
    hasScheduleToday,
    closestDeadline,
    hasAnyScheduleOrDeadline,
    scores,
    urgencyLabel,
  };
}

/**
 * Pemecah seri (Tie-breaker) sesuai PRD 14.2:
 * (1) Deadline lebih dekat/lebih lewat menang
 * (2) Jadwal hari ini menang
 * (3) updated_at lebih baru menang
 * (4) Urutan alfabetis judul lesson
 */
export function comparePrioritiesByScore(a: DailyPriorityItem, b: DailyPriorityItem): number {
  if (b.scores.totalScore !== a.scores.totalScore) {
    return b.scores.totalScore - a.scores.totalScore; // Skor tertinggi lebih dulu
  }

  // 1. Deadline lebih dekat (daysRemaining terkecil atau paling negatif)
  const aDays = a.closestDeadline ? a.closestDeadline.daysRemaining : 9999;
  const bDays = b.closestDeadline ? b.closestDeadline.daysRemaining : 9999;
  if (aDays !== bDays) {
    return aDays - bDays;
  }

  // 2. Jadwal hari ini menang
  if (a.hasScheduleToday !== b.hasScheduleToday) {
    return a.hasScheduleToday ? -1 : 1;
  }

  // 3. updated_at lebih baru menang
  const aTime = new Date(a.updatedAt).getTime() || 0;
  const bTime = new Date(b.updatedAt).getTime() || 0;
  if (aTime !== bTime) {
    return bTime - aTime;
  }

  // 4. Urutan alfabetis judul lesson
  return a.lessonTitle.localeCompare(b.lessonTitle);
}

/**
 * Menyusun urutan prioritas dengan memadukan skor otomatis dan urutan manual pengguna.
 * Sesuai aturan PRD 14.2:
 * - Skor otomatis adalah default sebelum ada urutan manual.
 * - Begitu ada urutan manual, urutan tersebut dipertahankan.
 * - Item baru yang muncul disisipkan di akhir (atau diurutkan dengan skor tanpa mengubah posisi item manual).
 */
export function sortPrioritiesWithManualOrder(
  items: DailyPriorityItem[],
  manualOrderIds: string[] | null
): DailyPriorityItem[] {
  if (!manualOrderIds || manualOrderIds.length === 0) {
    return [...items].sort(comparePrioritiesByScore);
  }

  const itemsMap = new Map<string, DailyPriorityItem>();
  items.forEach((item) => itemsMap.set(item.id, item));

  const orderedList: DailyPriorityItem[] = [];
  const processedIds = new Set<string>();

  // 1. Masukkan item yang sudah memiliki urutan manual
  for (const id of manualOrderIds) {
    const item = itemsMap.get(id);
    if (item) {
      orderedList.push(item);
      processedIds.add(id);
    }
  }

  // 2. Masukkan item baru yang belum ada di urutan manual (disortir berdasarkan skor)
  const remainingItems = items
    .filter((item) => !processedIds.has(item.id))
    .sort(comparePrioritiesByScore);

  return [...orderedList, ...remainingItems];
}

// ==============================================================================
// STORAGE UTILS: PERSISTENT MANUAL ORDER
// ==============================================================================

export function getStoredManualOrder(userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_MANUAL_ORDER_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredManualOrder(userId: string, orderIds: string[]): void {
  try {
    localStorage.setItem(LOCAL_MANUAL_ORDER_KEY(userId), JSON.stringify(orderIds));
  } catch (err) {
    console.warn('[VLT Priorities] Gagal menyimpan urutan manual ke localStorage:', err);
  }
}

export function clearStoredManualOrder(userId: string): void {
  try {
    localStorage.removeItem(LOCAL_MANUAL_ORDER_KEY(userId));
  } catch (err) {
    console.warn('[VLT Priorities] Gagal mereset urutan manual:', err);
  }
}

