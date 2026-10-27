export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled';
export type DeadlineStatus = 'pending' | 'completed';

export interface ScheduleItem {
  id: string; // UUID
  userId: string;
  title: string;
  description?: string | null;
  startTime: string; // ISO 8601 string (e.g. 2026-10-27T09:00:00)
  endTime: string;   // ISO 8601 string (e.g. 2026-10-27T10:30:00)
  status: ScheduleStatus;
  courseId?: string | null;
  courseTitle?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineItem {
  id: string; // UUID
  userId: string;
  title: string;
  description?: string | null;
  dueDate: string; // ISO 8601 string (e.g. 2026-10-27T23:59:59)
  status: DeadlineStatus;
  courseId?: string | null;
  courseTitle?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  courseId?: string | null;
  lessonId?: string | null;
}

export interface CreateDeadlineInput {
  title: string;
  description?: string;
  dueDate: string;    // YYYY-MM-DD
  dueTime?: string;   // HH:mm (default: 23:59)
  courseId?: string | null;
  lessonId?: string | null;
}
