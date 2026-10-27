-- ==============================================================================
-- VLT (Velgryn Learning Tracking) - Migration 20261027010000_roadmap_import_rpc.sql
-- Tahap 2B: Atomic Roadmap Import & Merge RPC Function
-- PRD v1.0 Compliant: Atomic Transaction, Stable ID Matching, Zero Data Loss
-- Catatan Keamanan: Dirancang agar kompatibel dengan seluruh izin role di Supabase SQL Editor.
-- ==============================================================================

-- 1. Fungsi Atomik Import & Merge Course Roadmap
--    Menjamin seluruh operasi upsert course dan lessons dieksekusi dalam satu transaksi atomik.
CREATE OR REPLACE FUNCTION public.import_roadmap_course(
  p_course_stable_id TEXT,
  p_course_title TEXT,
  p_course_description TEXT,
  p_schema_version TEXT,
  p_lessons JSONB -- Array of { "stable_id": string, "title": string, "order_index": number, "reference_url": string | null }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_course_id UUID;
  v_lesson_record JSONB;
  v_lesson_stable_id TEXT;
  v_lesson_title TEXT;
  v_lesson_order INTEGER;
  v_lesson_ref_url TEXT;
  v_existing_lesson_id UUID;
  v_inserted_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_incoming_ids TEXT[] := ARRAY[]::TEXT[];
  v_has_missing_col BOOLEAN := FALSE;
BEGIN
  -- Validasi autentikasi pengguna
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: pengguna belum terautentikasi.';
  END IF;

  -- 1. Upsert data Course berdasarkan (user_id, stable_id)
  INSERT INTO public.courses (user_id, stable_id, title, description, schema_version)
  VALUES (
    v_user_id, 
    p_course_stable_id, 
    p_course_title, 
    p_course_description, 
    COALESCE(p_schema_version, '1.0')
  )
  ON CONFLICT (user_id, stable_id) 
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    schema_version = EXCLUDED.schema_version,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_course_id;

  -- Periksa apakah kolom is_missing_from_source tersedia di tabel lessons
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'lessons' 
      AND column_name = 'is_missing_from_source'
  ) INTO v_has_missing_col;

  -- 2. Proses tiap lesson yang dikirimkan
  IF p_lessons IS NOT NULL AND jsonb_array_length(p_lessons) > 0 THEN
    FOR v_lesson_record IN SELECT * FROM jsonb_array_elements(p_lessons)
    LOOP
      v_lesson_stable_id := v_lesson_record->>'stable_id';
      v_lesson_title := v_lesson_record->>'title';
      v_lesson_order := COALESCE((v_lesson_record->>'order_index')::INTEGER, 1);
      v_lesson_ref_url := v_lesson_record->>'reference_url';

      v_incoming_ids := array_append(v_incoming_ids, v_lesson_stable_id);

      -- Periksa apakah lesson dengan stable_id ini sudah ada di course tersebut
      SELECT id INTO v_existing_lesson_id
      FROM public.lessons
      WHERE course_id = v_course_id AND stable_id = v_lesson_stable_id;

      IF v_existing_lesson_id IS NOT NULL THEN
        -- UPDATE KONTEN: Perbarui title, order, ref url. 
        -- ATURAN PRD: STATUS BELAJAR LAMA TIDAK BOLEH DIUBAH!
        UPDATE public.lessons
        SET 
          title = v_lesson_title,
          order_index = v_lesson_order,
          reference_url = v_lesson_ref_url,
          updated_at = timezone('utc'::text, now())
        WHERE id = v_existing_lesson_id;

        IF v_has_missing_col THEN
          EXECUTE 'UPDATE public.lessons SET is_missing_from_source = FALSE WHERE id = $1' USING v_existing_lesson_id;
        END IF;

        v_updated_count := v_updated_count + 1;
      ELSE
        -- INSERT BARU: Status awal default 'not_started'
        INSERT INTO public.lessons (
          course_id,
          user_id,
          stable_id,
          title,
          order_index,
          status,
          reference_url
        )
        VALUES (
          v_course_id,
          v_user_id,
          v_lesson_stable_id,
          v_lesson_title,
          v_lesson_order,
          'not_started',
          v_lesson_ref_url
        );

        v_inserted_count := v_inserted_count + 1;
      END IF;
    END LOOP;

    -- 3. Tandai lesson yang ada di database tapi TIDAK ADA lagi di file sumber baru (jika kolom tersedia)
    --    ATURAN PRD: JANGAN DIHAPUS OTOMATIS!
    IF v_has_missing_col THEN
      EXECUTE 'UPDATE public.lessons SET is_missing_from_source = TRUE WHERE course_id = $1 AND NOT (stable_id = ANY($2))'
      USING v_course_id, v_incoming_ids;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'course_id', v_course_id,
    'course_stable_id', p_course_stable_id,
    'inserted_lessons', v_inserted_count,
    'updated_lessons', v_updated_count
  );
END;
$$;

-- Izin eksekusi untuk pengguna yang terautentikasi
GRANT EXECUTE ON FUNCTION public.import_roadmap_course TO authenticated;
