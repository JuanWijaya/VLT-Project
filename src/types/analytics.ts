export type AnalyticsPeriod = '7d' | '30d' | 'all';

export interface DailyFocusBar {
  dateKey: string;      // YYYY-MM-DD
  dayLabel: string;     // Sen, Sel, Rab, dll
  shortDate: string;    // 28 Okt
  focusMinutes: number; // Durasi fokus aktual (menit)
  sessionCount: number; // Jumlah sesi valid
  isToday: boolean;
}

export interface TimeOfDayDistribution {
  morningMinutes: number;   // Pagi (05:00 - 11:59)
  afternoonMinutes: number; // Siang (12:00 - 16:59)
  eveningMinutes: number;   // Malam (17:00 - 23:59)
  nightMinutes: number;     // Dini Hari (00:00 - 04:59)
}

export interface CourseAnalyticsBreakdown {
  courseId: string;
  courseTitle: string;
  focusMinutes: number;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
}

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  totalFocusSeconds: number;
  totalFocusMinutes: number;
  totalFocusHours: number;
  formattedTotalFocus: string; // Misal: "4j 30m" atau "45m"
  validSessionsCount: number;
  activeDaysCount: number;
  periodDaysCount: number;
  averageDailyMinutes: number; // Rata-rata pada hari aktif
  consistencyRatePercent: number; // (activeDays / periodDays) * 100
  totalCompletedLessons: number;
  totalLessons: number;
  overallCourseProgressPercent: number;
  dailyBars: DailyFocusBar[];
  timeOfDay: TimeOfDayDistribution;
  courses: CourseAnalyticsBreakdown[];
}

