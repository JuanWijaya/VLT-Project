import type { 
  RoadmapFileV1, 
  RoadmapDiff, 
  LessonDiffItem, 
  EnrichedCourse, 
  EnrichedLesson 
} from './types';

/**
 * Menghitung perbedaan (Diff) antara file roadmap JSON baru dengan data course & lesson
 * yang saat ini tersimpan di database.
 * 
 * Prinsip Produk PRD Bagian 7.2 & 14.4:
 * 1. Matching HANYA berbasis Stable ID.
 * 2. Status belajar lesson eksisting (not_started, in_progress, completed) WAJIB dipertahankan.
 * 3. Item yang hilang dari file sumber TIDAK dihapus otomatis; ditandai sebagai MISSING_FROM_SOURCE.
 */
export function calculateRoadmapDiff(
  incoming: RoadmapFileV1,
  existingCourse: EnrichedCourse | null,
  existingLessons: EnrichedLesson[] = []
): RoadmapDiff {
  const isNewCourse = !existingCourse;

  // 1. Course Diff
  const courseDiff = {
    stableId: incoming.course.id,
    title: incoming.course.title,
    oldTitle: existingCourse?.title,
    description: incoming.course.description,
    oldDescription: existingCourse?.description ?? undefined,
    isUpdated: isNewCourse 
      ? false 
      : (incoming.course.title !== existingCourse.title || 
         (incoming.course.description ?? null) !== (existingCourse.description ?? null)),
  };

  // 2. Lessons Diff
  const existingMap = new Map<string, EnrichedLesson>();
  existingLessons.forEach((l) => existingMap.set(l.stableId, l));

  const incomingIds = new Set<string>();
  const newItems: LessonDiffItem[] = [];
  const updatedItems: LessonDiffItem[] = [];
  const unchangedItems: LessonDiffItem[] = [];
  const missingFromSourceItems: LessonDiffItem[] = [];

  // Proses semua incoming lessons
  incoming.lessons.forEach((inLesson) => {
    incomingIds.add(inLesson.id);
    const existing = existingMap.get(inLesson.id);

    if (!existing) {
      // Item Baru
      newItems.push({
        stableId: inLesson.id,
        category: 'NEW',
        title: inLesson.title,
        order: inLesson.order,
        referenceUrl: inLesson.referenceUrl,
        currentStatus: 'not_started',
        note: 'Akan ditambahkan sebagai materi baru dengan status awal Belum dimulai.'
      });
    } else {
      // Item Cocok via Stable ID
      const titleChanged = inLesson.title !== existing.title;
      const orderChanged = inLesson.order !== existing.orderIndex;
      const refChanged = (inLesson.referenceUrl ?? null) !== (existing.referenceUrl ?? null);

      if (titleChanged || orderChanged || refChanged) {
        // Konten Berubah (Status tetap terjaga)
        updatedItems.push({
          stableId: inLesson.id,
          category: 'UPDATED',
          title: inLesson.title,
          oldTitle: existing.title,
          order: inLesson.order,
          oldOrder: existing.orderIndex,
          referenceUrl: inLesson.referenceUrl,
          oldReferenceUrl: existing.referenceUrl ?? undefined,
          currentStatus: existing.status, // Tetap gunakan status lama
          note: `Konten diperbarui. Status belajar tetap dipertahankan (${formatStatusName(existing.status)}).`
        });
      } else {
        // Konten Identik / Tidak Berubah
        unchangedItems.push({
          stableId: inLesson.id,
          category: 'UNCHANGED',
          title: inLesson.title,
          order: inLesson.order,
          referenceUrl: inLesson.referenceUrl,
          currentStatus: existing.status,
          note: 'Tidak ada perubahan pada materi ini.'
        });
      }
    }
  });

  // Periksa existing lessons yang tidak ada di file sumber baru
  existingLessons.forEach((exLesson) => {
    if (!incomingIds.has(exLesson.stableId)) {
      missingFromSourceItems.push({
        stableId: exLesson.stableId,
        category: 'MISSING_FROM_SOURCE',
        title: exLesson.title,
        order: exLesson.orderIndex,
        referenceUrl: exLesson.referenceUrl ?? undefined,
        currentStatus: exLesson.status,
        note: 'Tidak ditemukan lagi pada file sumber baru. Sesuai aturan PRD 14.4, data ini TETAP DIPERTAHANKAN dan tidak dihapus.'
      });
    }
  });

  return {
    isNewCourse,
    course: courseDiff,
    lessons: {
      totalIncoming: incoming.lessons.length,
      newItems,
      updatedItems,
      unchangedItems,
      missingFromSourceItems,
    },
    summary: {
      totalNew: newItems.length,
      totalUpdated: updatedItems.length,
      totalUnchanged: unchangedItems.length,
      totalMissingFromSource: missingFromSourceItems.length,
    }
  };
}

/**
 * Menghitung persentase progres course secara objektif (PRD Bagian 8):
 * (jumlah lesson selesai ÷ total lesson) × 100%
 * Course tanpa lesson mengembalikan 0 (menghindari division by zero).
 */
export function calculateProgressPercentage(totalLessons: number, completedLessons: number): number {
  if (!totalLessons || totalLessons <= 0) return 0;
  if (!completedLessons || completedLessons <= 0) return 0;
  const pct = (completedLessons / totalLessons) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function formatStatusName(status: string): string {
  switch (status) {
    case 'completed': return 'Selesai';
    case 'in_progress': return 'Sedang dipelajari';
    case 'not_started': return 'Belum dimulai';
    default: return status;
  }
}
