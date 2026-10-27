export type NavPage = 
  | 'dashboard' 
  | 'learning' 
  | 'calendar' 
  | 'focus' 
  | 'analytics' 
  | 'settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface Course {
  id: string;
  title: string;
  description?: string;
  totalLessons: number;
  completedLessons: number;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  order: number;
  status: LessonStatus;
  referenceUrl?: string;
}

export interface PomodoroPreferences {
  workDurationMinutes: number;
  breakDurationMinutes: number;
  longBreakDurationMinutes: number;
  autoStartBreaks: boolean;
}

export interface DailyPriorityItem {
  id: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  status: LessonStatus;
  deadline?: string;
  isScheduledToday: boolean;
  score: number;
}
