-- ==============================================================================
-- VLT (Velgryn Learning Tracking) - Migration 20261027000000_init_vlt_schema.sql
-- Tahap 2A: Supabase Foundation (Profiles, Courses, Lessons, RLS Policies)
-- PRD v1.0 Compliant: Single User / Personal Self-Use, Row-Level Security Enforced
-- ==============================================================================

-- 1. Helper function untuk auto update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. TABEL: profiles (Preferensi Pengguna)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  work_duration_minutes INTEGER NOT NULL DEFAULT 25 CHECK (work_duration_minutes > 0),
  break_duration_minutes INTEGER NOT NULL DEFAULT 5 CHECK (break_duration_minutes > 0),
  long_break_duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (long_break_duration_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger untuk updated_at pada profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger untuk membuat profile default saat user didaftarkan di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, theme, work_duration_minutes, break_duration_minutes, long_break_duration_minutes)
  VALUES (NEW.id, 'system', 25, 5, 15)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. TABEL: courses (Course Roadmap)
--    Aturan PRD 7.2: Course dibuat via impor JSON berversi 1.0, memiliki ID stabil
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stable_id TEXT NOT NULL, -- ID unik course dari file JSON (mis. 'crs-react-pro')
  title TEXT NOT NULL,
  description TEXT,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_courses_user_stable_id UNIQUE (user_id, stable_id)
);

-- Index pencarian
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_stable_id ON public.courses(stable_id);

-- Trigger untuk updated_at pada courses
DROP TRIGGER IF EXISTS set_courses_updated_at ON public.courses;
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. TABEL: lessons (Modul Pembelajaran dalam Course)
--    Aturan PRD 7.2 & 8: Status lesson (not_started, in_progress, completed)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stable_id TEXT NOT NULL, -- ID unik lesson dari file JSON (mis. 'lsn-001')
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  reference_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_lessons_course_stable_id UNIQUE (course_id, stable_id)
);

-- Index pencarian
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON public.lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);

-- Trigger untuk updated_at pada lessons
DROP TRIGGER IF EXISTS set_lessons_updated_at ON public.lessons;
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--    Semua tabel data personal WAJIB mengaktifkan RLS (PRD Bagian 10)
-- ==============================================================================

-- A. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- B. Courses RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;
CREATE POLICY "Users can view own courses"
  ON public.courses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own courses" ON public.courses;
CREATE POLICY "Users can insert own courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own courses" ON public.courses;
CREATE POLICY "Users can update own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own courses" ON public.courses;
CREATE POLICY "Users can delete own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = user_id);

-- C. Lessons RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lessons" ON public.lessons;
CREATE POLICY "Users can view own lessons"
  ON public.lessons FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own lessons" ON public.lessons;
CREATE POLICY "Users can insert own lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lessons" ON public.lessons;
CREATE POLICY "Users can update own lessons"
  ON public.lessons FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lessons" ON public.lessons;
CREATE POLICY "Users can delete own lessons"
  ON public.lessons FOR DELETE
  USING (auth.uid() = user_id);
