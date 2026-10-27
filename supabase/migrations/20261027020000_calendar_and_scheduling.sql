-- ==============================================================================
-- VLT (Velgryn Learning Tracking) - Migration 20261027020000_calendar_and_scheduling.sql
-- Tahap 3: Calendar & Scheduling (Schedules, Deadlines, and Strict RLS)
-- PRD v1.0 Compliant: Separation of Schedule (Plan) vs Deadline (Target)
-- ==============================================================================

-- 1. Pastikan role postgres & authenticated memiliki izin pada skema public
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO authenticated;
GRANT USAGE, CREATE ON SCHEMA public TO service_role;

-- 2. Pastikan helper function handle_updated_at tersedia
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. TABEL: schedules (Jadwal Aktivitas Belajar / Rencana)
--    Aturan PRD 7.3 & 8: Waktu pelaksanaan rencana, status pelaksanaan mandiri
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_schedule_times CHECK (end_time >= start_time)
);

-- Index pencarian
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON public.schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_course_id ON public.schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_schedules_lesson_id ON public.schedules(lesson_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_schedules_updated_at ON public.schedules;
CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. TABEL: deadlines (Target Batas Waktu Mandiri)
--    Aturan PRD 7.3 & 8: Deadline disimpan terpisah dari jadwal, bukan jam belajar
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index pencarian
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON public.deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON public.deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_course_id ON public.deadlines(course_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_lesson_id ON public.deadlines(lesson_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_deadlines_updated_at ON public.deadlines;
CREATE TRIGGER set_deadlines_updated_at
  BEFORE UPDATE ON public.deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. Schedules RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedules" ON public.schedules;
CREATE POLICY "Users can view own schedules"
  ON public.schedules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own schedules" ON public.schedules;
CREATE POLICY "Users can insert own schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own schedules" ON public.schedules;
CREATE POLICY "Users can update own schedules"
  ON public.schedules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own schedules" ON public.schedules;
CREATE POLICY "Users can delete own schedules"
  ON public.schedules FOR DELETE
  USING (auth.uid() = user_id);

-- B. Deadlines RLS
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deadlines" ON public.deadlines;
CREATE POLICY "Users can view own deadlines"
  ON public.deadlines FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own deadlines" ON public.deadlines;
CREATE POLICY "Users can insert own deadlines"
  ON public.deadlines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own deadlines" ON public.deadlines;
CREATE POLICY "Users can update own deadlines"
  ON public.deadlines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own deadlines" ON public.deadlines;
CREATE POLICY "Users can delete own deadlines"
  ON public.deadlines FOR DELETE
  USING (auth.uid() = user_id);

-- Izin akses tabel untuk user terautentikasi
GRANT ALL ON public.schedules TO authenticated;
GRANT ALL ON public.deadlines TO authenticated;
