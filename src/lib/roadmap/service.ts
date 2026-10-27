import { supabase } from '../supabase';
import type { LessonStatus } from '../../types';
import type { 
  RoadmapFileV1, 
  EnrichedCourse, 
  EnrichedLesson 
} from './types';
import { calculateProgressPercentage } from './merger';

/**
 * Mengambil daftar seluruh course milik pengguna yang sedang terautentikasi.
 * Menghitung otomatis total lesson, lesson selesai, dan persentase progres.
 */
export async function fetchUserCourses(userId: string): Promise<EnrichedCourse[]> {
  // Ambil courses
  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('id, stable_id, title, description, schema_version, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (coursesError) {
    console.error('[VLT Roadmap] Gagal mengambil courses:', coursesError);
    throw new Error(coursesError.message);
  }

  if (!coursesData || coursesData.length === 0) {
    return [];
  }

  // Ambil data lessons milik user untuk menghitung progres
  const { data: lessonsData, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, course_id, status')
    .eq('user_id', userId);

  if (lessonsError) {
    console.error('[VLT Roadmap] Gagal mengambil lessons untuk kalkulasi progres:', lessonsError);
  }

  const lessonCountMap = new Map<string, { total: number; completed: number }>();
  (lessonsData || []).forEach((l) => {
    const current = lessonCountMap.get(l.course_id) || { total: 0, completed: 0 };
    current.total += 1;
    if (l.status === 'completed') {
      current.completed += 1;
    }
    lessonCountMap.set(l.course_id, current);
  });

  return coursesData.map((c) => {
    const stats = lessonCountMap.get(c.id) || { total: 0, completed: 0 };
    return {
      id: c.id,
      stableId: c.stable_id,
      title: c.title,
      description: c.description,
      schemaVersion: c.schema_version,
      totalLessons: stats.total,
      completedLessons: stats.completed,
      progressPercentage: calculateProgressPercentage(stats.total, stats.completed),
      updatedAt: c.updated_at,
    };
  });
}

/**
 * Mengambil detail lengkap satu course beserta daftar seluruh lesson-nya.
 */
export async function fetchCourseDetails(
  courseId: string, 
  userId: string
): Promise<{ course: EnrichedCourse; lessons: EnrichedLesson[] }> {
  // Ambil course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('user_id', userId)
    .single();

  if (courseError || !course) {
    throw new Error(courseError?.message || 'Course tidak ditemukan');
  }

  // Ambil lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (lessonsError) {
    throw new Error(lessonsError.message);
  }

  const lessonList: EnrichedLesson[] = (lessons || []).map((l) => ({
    id: l.id,
    courseId: l.course_id,
    stableId: l.stable_id,
    title: l.title,
    orderIndex: l.order_index,
    status: l.status as LessonStatus,
    referenceUrl: l.reference_url,
    isMissingFromSource: Boolean(l.is_missing_from_source),
    updatedAt: l.updated_at,
  }));

  const total = lessonList.length;
  const completed = lessonList.filter((l) => l.status === 'completed').length;

  const enrichedCourse: EnrichedCourse = {
    id: course.id,
    stableId: course.stable_id,
    title: course.title,
    description: course.description,
    schemaVersion: course.schema_version,
    totalLessons: total,
    completedLessons: completed,
    progressPercentage: calculateProgressPercentage(total, completed),
    updatedAt: course.updated_at,
  };

  return {
    course: enrichedCourse,
    lessons: lessonList,
  };
}

/**
 * Mengubah status lesson (FR-LEARN-03) secara manual.
 * Status: 'not_started' | 'in_progress' | 'completed'
 */
export async function updateLessonStatus(
  lessonId: string, 
  newStatus: LessonStatus, 
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', lessonId)
    .eq('user_id', userId);

  if (error) {
    console.error('[VLT Roadmap] Gagal memperbarui status lesson:', error);
    throw new Error(error.message);
  }
}

/**
 * Menjalankan impor & merge file JSON roadmap ke Supabase.
 * Mengutamakan pemanggilan RPC PostgreSQL 'import_roadmap_course' untuk eksekusi atomik.
 * Menyediakan fallback jika RPC belum dipasang di database.
 */
export async function executeRoadmapImport(
  roadmapData: RoadmapFileV1,
  userId: string
): Promise<{ success: boolean; courseId?: string; error?: string }> {
  const preparedLessons = roadmapData.lessons.map((l) => ({
    stable_id: l.id,
    title: l.title,
    order_index: l.order,
    reference_url: l.referenceUrl || null,
  }));

  // 1. Coba eksekusi via RPC Atomik jika fungsi terpasang di database
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('import_roadmap_course', {
      p_course_stable_id: roadmapData.course.id,
      p_course_title: roadmapData.course.title,
      p_course_description: roadmapData.course.description || null,
      p_schema_version: roadmapData.schemaVersion,
      p_lessons: preparedLessons,
    });

    if (!rpcError && rpcData?.success) {
      return { success: true, courseId: rpcData.course_id };
    }
  } catch {
    // RPC belum dipasang di database, beralih langsung ke fallback client-side
  }

  // 2. Fallback: Eksekusi client-side jika RPC belum dijalankan di SQL Editor
  try {
    // Upsert Course
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', userId)
      .eq('stable_id', roadmapData.course.id)
      .maybeSingle();

    let courseId = existingCourse?.id;

    if (courseId) {
      const { error: updErr } = await supabase
        .from('courses')
        .update({
          title: roadmapData.course.title,
          description: roadmapData.course.description || null,
          schema_version: roadmapData.schemaVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .eq('user_id', userId);

      if (updErr) throw updErr;
    } else {
      const { data: newCourse, error: insErr } = await supabase
        .from('courses')
        .insert({
          user_id: userId,
          stable_id: roadmapData.course.id,
          title: roadmapData.course.title,
          description: roadmapData.course.description || null,
          schema_version: roadmapData.schemaVersion,
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      courseId = newCourse.id;
    }

    // Ambil existing lessons untuk mempertahankan status lama
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('id, stable_id, status')
      .eq('course_id', courseId)
      .eq('user_id', userId);

    const existingMap = new Map((existingLessons || []).map((l) => [l.stable_id, l]));
    const incomingIds = new Set<string>();

    for (const l of roadmapData.lessons) {
      incomingIds.add(l.id);
      const ex = existingMap.get(l.id);

      if (ex) {
        // Update konten, PERTAHANKAN STATUS BELAJAR LAMA
        const updatePayload: Record<string, unknown> = {
          title: l.title,
          order_index: l.order,
          reference_url: l.referenceUrl || null,
          updated_at: new Date().toISOString(),
        };

        // Coba sertakan is_missing_from_source jika ada
        const { error: uErr } = await supabase
          .from('lessons')
          .update({ ...updatePayload, is_missing_from_source: false })
          .eq('id', ex.id);

        if (uErr && uErr.message.includes('is_missing_from_source')) {
          // Fallback tanpa kolom is_missing_from_source
          const { error: uFallbackErr } = await supabase
            .from('lessons')
            .update(updatePayload)
            .eq('id', ex.id);
          if (uFallbackErr) throw uFallbackErr;
        } else if (uErr) {
          throw uErr;
        }
      } else {
        // Insert Baru dengan status 'not_started'
        const insertPayload: Record<string, unknown> = {
          course_id: courseId,
          user_id: userId,
          stable_id: l.id,
          title: l.title,
          order_index: l.order,
          status: 'not_started',
          reference_url: l.referenceUrl || null,
        };

        const { error: iErr } = await supabase
          .from('lessons')
          .insert({ ...insertPayload, is_missing_from_source: false });

        if (iErr && iErr.message.includes('is_missing_from_source')) {
          // Fallback tanpa kolom is_missing_from_source
          const { error: iFallbackErr } = await supabase
            .from('lessons')
            .insert(insertPayload);
          if (iFallbackErr) throw iFallbackErr;
        } else if (iErr) {
          throw iErr;
        }
      }
    }

    // Tandai existing lessons yang hilang dari file sumber (PRD 14.4) jika kolom tersedia
    if (existingLessons && existingLessons.length > 0) {
      for (const ex of existingLessons) {
        if (!incomingIds.has(ex.stable_id)) {
          try {
            await supabase
              .from('lessons')
              .update({ is_missing_from_source: true })
              .eq('id', ex.id);
          } catch {
            // Abaikan jika kolom belum tersedia
          }
        }
      }
    }

    return { success: true, courseId };
  } catch (err) {
    console.error('[VLT Roadmap] Gagal import course:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan course.'
    };
  }
}

/**
 * Menghapus course (dengan konfirmasi sadar).
 */
export async function deleteCourse(courseId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
