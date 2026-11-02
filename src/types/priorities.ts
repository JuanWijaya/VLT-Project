import type { LessonStatus } from './index';

export interface PriorityScoreBreakdown {
  scoreDeadline: number;      // 0 - 40
  scoreSchedule: number;      // 0 or 30
  scoreStatus: number;        // 10 (not_started) or 20 (in_progress)
  scoreUnscheduled: number;   // 0 or 10
  totalScore: number;         // 0 - 100
}

export interface DailyPriorityItem {
  id: string; // lesson.id
  lessonId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  status: LessonStatus;
  updatedAt: string;
  hasScheduleToday: boolean;
  closestDeadline?: {
    dueDate: string;
    daysRemaining: number;
    isOverdue: boolean;
  };
  hasAnyScheduleOrDeadline: boolean;
  scores: PriorityScoreBreakdown;
  urgencyLabel?: string;
}

