import type { LessonStatus, ThemeMode } from './index';

export interface ProfileRow {
  id: string; // references auth.users(id)
  theme: ThemeMode;
  work_duration_minutes: number;
  break_duration_minutes: number;
  long_break_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  id: string; // UUID
  user_id: string;
  stable_id: string;
  title: string;
  description: string | null;
  schema_version: string;
  created_at: string;
  updated_at: string;
}

export interface LessonRow {
  id: string; // UUID
  course_id: string;
  user_id: string;
  stable_id: string;
  title: string;
  order_index: number;
  status: LessonStatus;
  reference_url: string | null;
  created_at: string;
  updated_at: string;
}
