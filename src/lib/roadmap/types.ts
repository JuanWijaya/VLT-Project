import type { LessonStatus } from '../../types';

// ==============================================================================
// 1. KONTRAK ROADMAP JSON SCHEMA v1.0 (PRD Bagian 7.2 & 14.4)
// ==============================================================================

export interface RoadmapCourseV1 {
  id: string; // Stable ID unik, misal: "crs-react-pro"
  title: string;
  description?: string;
}

export interface RoadmapLessonV1 {
  id: string; // Stable ID unik per course, misal: "lsn-001"
  title: string;
  order: number;
  referenceUrl?: string;
}

export interface RoadmapFileV1 {
  schemaVersion: '1.0';
  course: RoadmapCourseV1;
  lessons: RoadmapLessonV1[];
}

// ==============================================================================
// 2. HASIL VALIDASI FILE JSON
// ==============================================================================

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationSuccess {
  isValid: true;
  data: RoadmapFileV1;
}

export interface ValidationFailure {
  isValid: false;
  errors: ValidationError[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ==============================================================================
// 3. PREVIEW & MERGE DIFF TYPES (PRD Bagian 7.2 & 14.4)
// ==============================================================================

export type DiffCategory = 
  | 'NEW'                  // Item baru yang akan ditambahkan
  | 'UPDATED'              // Item cocok via stable_id yang mengalami pembaruan konten
  | 'UNCHANGED'            // Item cocok via stable_id yang datanya persis sama
  | 'MISSING_FROM_SOURCE'; // Item ada di DB namun tidak ada lagi di file JSON baru (dipertahankan)

export interface LessonDiffItem {
  stableId: string;
  category: DiffCategory;
  title: string;
  oldTitle?: string;
  order: number;
  oldOrder?: number;
  referenceUrl?: string;
  oldReferenceUrl?: string;
  currentStatus: LessonStatus; // Status lama selalu dipertahankan
  note?: string;
}

export interface RoadmapDiff {
  isNewCourse: boolean;
  course: {
    stableId: string;
    title: string;
    oldTitle?: string;
    description?: string;
    oldDescription?: string;
    isUpdated: boolean;
  };
  lessons: {
    totalIncoming: number;
    newItems: LessonDiffItem[];
    updatedItems: LessonDiffItem[];
    unchangedItems: LessonDiffItem[];
    missingFromSourceItems: LessonDiffItem[];
  };
  summary: {
    totalNew: number;
    totalUpdated: number;
    totalUnchanged: number;
    totalMissingFromSource: number;
  };
}

// ==============================================================================
// 4. ENTITAS RUNTIME ROADMAP DENGAN PROGRES
// ==============================================================================

export interface EnrichedCourse {
  id: string; // UUID DB
  stableId: string;
  title: string;
  description: string | null;
  schemaVersion: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  updatedAt: string;
}

export interface EnrichedLesson {
  id: string; // UUID DB
  courseId: string;
  stableId: string;
  title: string;
  orderIndex: number;
  status: LessonStatus;
  referenceUrl: string | null;
  isMissingFromSource: boolean;
  updatedAt: string;
}
