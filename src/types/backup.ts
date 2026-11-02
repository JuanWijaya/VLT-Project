import type { ProfileRow, CourseRow, LessonRow } from './database';
import type { ScheduleItem, DeadlineItem } from './calendar';
import type { StudySession } from './focus';

export interface BackupMetadata {
  totalCourses: number;
  totalLessons: number;
  totalSchedules: number;
  totalDeadlines: number;
  totalStudySessions: number;
}

export interface VLTBackupFileV1 {
  schemaVersion: '1.0';
  appVersion: '1.0.0';
  exportedAt: string; // ISO string
  userId: string;
  metadata: BackupMetadata;
  data: {
    profile: ProfileRow | null;
    courses: CourseRow[];
    lessons: LessonRow[];
    schedules: ScheduleItem[];
    deadlines: DeadlineItem[];
    studySessions: StudySession[];
    preferences?: {
      theme?: string;
      workDuration?: number;
      breakDuration?: number;
      manualPriorityOrder?: string[];
    };
  };
}

export interface BackupValidationSuccess {
  isValid: true;
  data: VLTBackupFileV1;
}

export interface BackupValidationFailure {
  isValid: false;
  errors: string[];
}

export type BackupValidationResult = BackupValidationSuccess | BackupValidationFailure;

export interface BackupRestorePreview {
  coursesCount: number;
  lessonsCount: number;
  schedulesCount: number;
  deadlinesCount: number;
  studySessionsCount: number;
  exportedAt: string;
}

