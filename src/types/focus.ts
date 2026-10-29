export type FocusMode = 'work' | 'break' | 'long_break';

export type SessionStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export interface StudySession {
  id: string;
  userId: string;
  courseId: string | null;
  courseTitle?: string | null;
  lessonId: string | null;
  lessonTitle?: string | null;
  title: string | null;
  mode: FocusMode;
  status: SessionStatus;
  targetDurationSeconds: number;
  actualDurationSeconds: number;
  startTime: string; // ISO string
  endTime: string | null; // ISO string
  lastHeartbeatAt: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface StartSessionInput {
  mode: FocusMode;
  targetDurationSeconds: number;
  courseId?: string | null;
  lessonId?: string | null;
  title?: string | null;
}

export interface CheckpointUpdateInput {
  actualDurationSeconds: number;
  status?: SessionStatus;
}

