-- ==============================================================================
-- VLT (Velgryn Learning Tracking) - Migration 20261029000000_study_sessions_and_focus_room.sql
-- Tahap 4: Focus Room / Pomodoro & Sesi Belajar Aktual
-- PRD v1.0 Compliant: Strict actual duration tracking, single-active-session per user,
-- recovery checkpointing, and row-level security isolation.
-- ==============================================================================

-- 1. Pastikan role postgres & authenticated memiliki izin pada skema public
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO authenticated;
GRANT USAGE, CREATE ON SCHEMA public TO service_role;

-- 2. TABEL: study_sessions (Sesi Fokus Pomodoro & Riwayat Belajar Aktual)
--    Aturan PRD 7.4, 8 & 14.3:
--    - Target durasi terpisah dari durasi aktual
--    - Single source of truth di server
--    - ON DELETE SET NULL agar histori tidak hilang saat course/lesson dihapus
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT,
  mode TEXT NOT NULL DEFAULT 'work' CHECK (mode IN ('work', 'break', 'long_break')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
  target_duration_seconds INTEGER NOT NULL DEFAULT 1500 CHECK (target_duration_seconds > 0),
  actual_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (actual_duration_seconds >= 0),
  start_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  end_time TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INDEX PENCARIAN & PERFORMA
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id ON public.study_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_lesson_id ON public.study_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON public.study_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON public.study_sessions(status);

-- 4. KONSISTENSI LINTAS PERANGKAT: ATURAN SATU SESI AKTIF PER AKUN (PRD 14.3)
--    Database Constraint: Menjamin tidak pernah ada lebih dari 1 sesi dengan status 'running' atau 'paused' per akun pengguna.
--    Mencegah race condition ketika dua perangkat menekan tombol 'Mulai' pada detik yang sama.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_study_session_per_user 
ON public.study_sessions (user_id) 
WHERE status IN ('running', 'paused');

-- 5. TRIGGER UPDATED_AT
DROP TRIGGER IF EXISTS set_study_sessions_updated_at ON public.study_sessions;
CREATE TRIGGER set_study_sessions_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own study sessions" ON public.study_sessions;
CREATE POLICY "Users can update own study sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own study sessions" ON public.study_sessions;
CREATE POLICY "Users can delete own study sessions"
  ON public.study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Izin akses tabel untuk user terautentikasi
GRANT ALL ON public.study_sessions TO authenticated;

