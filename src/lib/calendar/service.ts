import { supabase } from '../supabase';
import type { 
  ScheduleItem, 
  DeadlineItem, 
  CreateScheduleInput, 
  CreateDeadlineInput,
  ScheduleStatus,
  DeadlineStatus
} from '../../types/calendar';

/**
 * Helper untuk format tanggal lokal ke YYYY-MM-DD tanpa risiko pergeseran zona waktu.
 */
export function formatDateToLocalKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format string ISO/Date menjadi jam:menit (HH:mm) lokal.
 */
export function formatTimeLocal(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

// ==============================================================================
// 1. KURSUS & LESSON SELECTOR HELPER
// ==============================================================================

export interface CourseOption {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string; orderIndex: number }>;
}

export async function fetchCoursesWithLessons(userId: string): Promise<CourseOption[]> {
  try {
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('user_id', userId)
      .order('title', { ascending: true });

    if (coursesError || !coursesData) return [];

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    const lessonsMap = new Map<string, Array<{ id: string; title: string; orderIndex: number }>>();
    (lessonsData || []).forEach((l) => {
      const arr = lessonsMap.get(l.course_id) || [];
      arr.push({ id: l.id, title: l.title, orderIndex: l.order_index });
      lessonsMap.set(l.course_id, arr);
    });

    return coursesData.map((c) => ({
      id: c.id,
      title: c.title,
      lessons: lessonsMap.get(c.id) || [],
    }));
  } catch (err) {
    console.warn('[VLT Calendar] Gagal memuat daftar course untuk selector:', err);
    return [];
  }
}

// ==============================================================================
// 2. JADWAL AKTIVITAS (SCHEDULES)
// ==============================================================================

const LOCAL_SCHEDULES_KEY = (userId: string) => `vlt-schedules-${userId}`;

export async function fetchSchedules(userId: string): Promise<ScheduleItem[]> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id, user_id, title, description, start_time, end_time, status, course_id, lesson_id, created_at, updated_at,
        courses ( id, title ),
        lessons ( id, title )
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) {
      // Jika tabel belum dibuat di Supabase, fallback ke localStorage
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return getLocalSchedules(userId);
      }
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status as ScheduleStatus,
      courseId: row.course_id,
      courseTitle: row.courses?.title || null,
      lessonId: row.lesson_id,
      lessonTitle: row.lessons?.title || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn('[VLT Calendar] Memuat schedules dari fallback lokal:', err);
    return getLocalSchedules(userId);
  }
}

export async function createSchedule(userId: string, input: CreateScheduleInput): Promise<ScheduleItem> {
  // Validasi waktu
  const startISO = new Date(`${input.date}T${input.startTime}:00`).toISOString();
  const endISO = new Date(`${input.date}T${input.endTime}:00`).toISOString();

  if (new Date(endISO).getTime() < new Date(startISO).getTime()) {
    throw new Error('Waktu selesai tidak boleh lebih awal dari waktu mulai.');
  }

  const payload = {
    user_id: userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    start_time: startISO,
    end_time: endISO,
    status: 'scheduled',
    course_id: input.courseId || null,
    lesson_id: input.lessonId || null,
  };

  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select('id, user_id, title, description, start_time, end_time, status, course_id, lesson_id, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return saveLocalSchedule(userId, payload);
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      startTime: data.start_time,
      endTime: data.end_time,
      status: data.status as ScheduleStatus,
      courseId: data.course_id,
      lessonId: data.lesson_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn('[VLT Calendar] Menyimpan schedule ke fallback lokal:', err);
    return saveLocalSchedule(userId, payload);
  }
}

export async function updateSchedule(
  userId: string, 
  id: string, 
  input: Partial<CreateScheduleInput> & { status?: ScheduleStatus }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.courseId !== undefined) updateData.course_id = input.courseId || null;
  if (input.lessonId !== undefined) updateData.lesson_id = input.lessonId || null;

  if (input.date && input.startTime && input.endTime) {
    const startISO = new Date(`${input.date}T${input.startTime}:00`).toISOString();
    const endISO = new Date(`${input.date}T${input.endTime}:00`).toISOString();
    if (new Date(endISO).getTime() < new Date(startISO).getTime()) {
      throw new Error('Waktu selesai tidak boleh lebih awal dari waktu mulai.');
    }
    updateData.start_time = startISO;
    updateData.end_time = endISO;
  }

  try {
    const { error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        updateLocalSchedule(userId, id, updateData);
        return;
      }
      throw error;
    }
  } catch (err) {
    updateLocalSchedule(userId, id, updateData);
  }
}

export async function deleteSchedule(userId: string, id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
      deleteLocalSchedule(userId, id);
      return;
    }
  } catch {
    deleteLocalSchedule(userId, id);
  }
}

// ==============================================================================
// 3. TARGET DEADLINES (DEADLINES)
// ==============================================================================

const LOCAL_DEADLINES_KEY = (userId: string) => `vlt-deadlines-${userId}`;

export async function fetchDeadlines(userId: string): Promise<DeadlineItem[]> {
  try {
    const { data, error } = await supabase
      .from('deadlines')
      .select(`
        id, user_id, title, description, due_date, status, course_id, lesson_id, created_at, updated_at,
        courses ( id, title ),
        lessons ( id, title )
      `)
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return getLocalDeadlines(userId);
      }
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      status: row.status as DeadlineStatus,
      courseId: row.course_id,
      courseTitle: row.courses?.title || null,
      lessonId: row.lesson_id,
      lessonTitle: row.lessons?.title || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn('[VLT Calendar] Memuat deadlines dari fallback lokal:', err);
    return getLocalDeadlines(userId);
  }
}

export async function createDeadline(userId: string, input: CreateDeadlineInput): Promise<DeadlineItem> {
  const timeStr = input.dueTime || '23:59';
  const dueISO = new Date(`${input.dueDate}T${timeStr}:00`).toISOString();

  const payload = {
    user_id: userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    due_date: dueISO,
    status: 'pending',
    course_id: input.courseId || null,
    lesson_id: input.lessonId || null,
  };

  try {
    const { data, error } = await supabase
      .from('deadlines')
      .insert(payload)
      .select('id, user_id, title, description, due_date, status, course_id, lesson_id, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return saveLocalDeadline(userId, payload);
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      status: data.status as DeadlineStatus,
      courseId: data.course_id,
      lessonId: data.lesson_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn('[VLT Calendar] Menyimpan deadline ke fallback lokal:', err);
    return saveLocalDeadline(userId, payload);
  }
}

export async function updateDeadline(
  userId: string, 
  id: string, 
  input: Partial<CreateDeadlineInput> & { status?: DeadlineStatus }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.courseId !== undefined) updateData.course_id = input.courseId || null;
  if (input.lessonId !== undefined) updateData.lesson_id = input.lessonId || null;

  if (input.dueDate) {
    const timeStr = input.dueTime || '23:59';
    updateData.due_date = new Date(`${input.dueDate}T${timeStr}:00`).toISOString();
  }

  try {
    const { error } = await supabase
      .from('deadlines')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        updateLocalDeadline(userId, id, updateData);
        return;
      }
      throw error;
    }
  } catch {
    updateLocalDeadline(userId, id, updateData);
  }
}

export async function deleteDeadline(userId: string, id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('deadlines')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
      deleteLocalDeadline(userId, id);
      return;
    }
  } catch {
    deleteLocalDeadline(userId, id);
  }
}

// ==============================================================================
// 4. LOCALSTORAGE HELPERS (RESILIENT CLIENT FALLBACK)
// ==============================================================================

function getLocalSchedules(userId: string): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_SCHEDULES_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSchedule(userId: string, payload: any): ScheduleItem {
  const items = getLocalSchedules(userId);
  const now = new Date().toISOString();
  const newItem: ScheduleItem = {
    id: `local-sch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: payload.title,
    description: payload.description,
    startTime: payload.start_time,
    endTime: payload.end_time,
    status: payload.status,
    courseId: payload.course_id,
    lessonId: payload.lesson_id,
    createdAt: now,
    updatedAt: now,
  };
  items.push(newItem);
  localStorage.setItem(LOCAL_SCHEDULES_KEY(userId), JSON.stringify(items));
  return newItem;
}

function updateLocalSchedule(userId: string, id: string, updates: any) {
  const items = getLocalSchedules(userId).map((s) => {
    if (s.id === id) {
      return {
        ...s,
        title: updates.title !== undefined ? updates.title : s.title,
        description: updates.description !== undefined ? updates.description : s.description,
        status: updates.status !== undefined ? updates.status : s.status,
        startTime: updates.start_time !== undefined ? updates.start_time : s.startTime,
        endTime: updates.end_time !== undefined ? updates.end_time : s.endTime,
        courseId: updates.course_id !== undefined ? updates.course_id : s.courseId,
        lessonId: updates.lesson_id !== undefined ? updates.lesson_id : s.lessonId,
        updatedAt: new Date().toISOString(),
      };
    }
    return s;
  });
  localStorage.setItem(LOCAL_SCHEDULES_KEY(userId), JSON.stringify(items));
}

function deleteLocalSchedule(userId: string, id: string) {
  const items = getLocalSchedules(userId).filter((s) => s.id !== id);
  localStorage.setItem(LOCAL_SCHEDULES_KEY(userId), JSON.stringify(items));
}

function getLocalDeadlines(userId: string): DeadlineItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEADLINES_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDeadline(userId: string, payload: any): DeadlineItem {
  const items = getLocalDeadlines(userId);
  const now = new Date().toISOString();
  const newItem: DeadlineItem = {
    id: `local-dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: payload.title,
    description: payload.description,
    dueDate: payload.due_date,
    status: payload.status,
    courseId: payload.course_id,
    lessonId: payload.lesson_id,
    createdAt: now,
    updatedAt: now,
  };
  items.push(newItem);
  localStorage.setItem(LOCAL_DEADLINES_KEY(userId), JSON.stringify(items));
  return newItem;
}

function updateLocalDeadline(userId: string, id: string, updates: any) {
  const items = getLocalDeadlines(userId).map((d) => {
    if (d.id === id) {
      return {
        ...d,
        title: updates.title !== undefined ? updates.title : d.title,
        description: updates.description !== undefined ? updates.description : d.description,
        status: updates.status !== undefined ? updates.status : d.status,
        dueDate: updates.due_date !== undefined ? updates.due_date : d.dueDate,
        courseId: updates.course_id !== undefined ? updates.course_id : d.courseId,
        lessonId: updates.lesson_id !== undefined ? updates.lesson_id : d.lessonId,
        updatedAt: new Date().toISOString(),
      };
    }
    return d;
  });
  localStorage.setItem(LOCAL_DEADLINES_KEY(userId), JSON.stringify(items));
}

function deleteLocalDeadline(userId: string, id: string) {
  const items = getLocalDeadlines(userId).filter((d) => d.id !== id);
  localStorage.setItem(LOCAL_DEADLINES_KEY(userId), JSON.stringify(items));
}
