import type { 
  RoadmapFileV1, 
  ValidationResult, 
  ValidationError 
} from './types';

export const SUPPORTED_SCHEMA_VERSION = '1.0';

/**
 * Memvalidasi teks mentah atau parsed object JSON roadmap sesuai PRD v1.0 Bagian 14.4.
 * Menghasilkan objek ValidationResult (isValid: true/false).
 */
export function validateRoadmapJSON(rawInput: string | unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Parsing Sintaks JSON
  let parsed: unknown;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        isValid: false,
        errors: [{
          path: 'root',
          message: `Sintaks JSON tidak valid: ${err instanceof Error ? err.message : 'Gagal parsing JSON'}`
        }]
      };
    }
  } else {
    parsed = rawInput;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      errors: [{
        path: 'root',
        message: 'Konten file harus berupa JSON object yang valid.'
      }]
    };
  }

  const obj = parsed as Record<string, unknown>;

  // 2. Validasi schemaVersion (PRD Bagian 14.4)
  if (!('schemaVersion' in obj) || obj.schemaVersion === undefined || obj.schemaVersion === null) {
    errors.push({
      path: 'schemaVersion',
      message: "Field 'schemaVersion' wajib disertakan dalam file roadmap."
    });
  } else if (typeof obj.schemaVersion !== 'string') {
    errors.push({
      path: 'schemaVersion',
      message: "Field 'schemaVersion' harus bertipe string (misal: \"1.0\")."
    });
  } else {
    const ver = obj.schemaVersion.trim();
    if (ver === '') {
      errors.push({
        path: 'schemaVersion',
        message: "Field 'schemaVersion' tidak boleh kosong."
      });
    } else if (ver === SUPPORTED_SCHEMA_VERSION) {
      // Versi didukung 1.0 - OK
    } else {
      // Evaluasi apakah lebih baru atau tidak didukung
      const parsedVer = parseFloat(ver);
      const supportedVer = parseFloat(SUPPORTED_SCHEMA_VERSION);
      if (!isNaN(parsedVer) && parsedVer > supportedVer) {
        errors.push({
          path: 'schemaVersion',
          message: `Versi skema "${ver}" lebih baru dari yang didukung aplikasi saat ini (versi ${SUPPORTED_SCHEMA_VERSION}). File ditolak.`
        });
      } else {
        errors.push({
          path: 'schemaVersion',
          message: `Versi skema "${ver}" tidak didukung secara langsung dan memerlukan proses migrasi eksplisit.`
        });
      }
    }
  }

  // 3. Validasi Objek Course (PRD Bagian 7.2 & 14.4)
  if (!obj.course || typeof obj.course !== 'object' || Array.isArray(obj.course)) {
    errors.push({
      path: 'course',
      message: "Field 'course' wajib berupa objek yang memuat 'id' dan 'title'."
    });
  } else {
    const courseObj = obj.course as Record<string, unknown>;
    
    // course.id
    if (!courseObj.id || typeof courseObj.id !== 'string' || courseObj.id.trim() === '') {
      errors.push({
        path: 'course.id',
        message: "ID course ('course.id') wajib diisi sebagai stable ID (string non-kosong)."
      });
    }

    // course.title
    if (!courseObj.title || typeof courseObj.title !== 'string' || courseObj.title.trim() === '') {
      errors.push({
        path: 'course.title',
        message: "Judul course ('course.title') wajib diisi (string non-kosong)."
      });
    }

    // course.description (opsional)
    if (courseObj.description !== undefined && courseObj.description !== null && typeof courseObj.description !== 'string') {
      errors.push({
        path: 'course.description',
        message: "Deskripsi course ('course.description') harus berupa string jika disediakan."
      });
    }
  }

  // 4. Validasi Array Lessons (PRD Bagian 7.2 & 14.4)
  if (!('lessons' in obj) || !Array.isArray(obj.lessons)) {
    errors.push({
      path: 'lessons',
      message: "Field 'lessons' wajib berupa array (dapat berupa array kosong atau berisi daftar lesson)."
    });
  } else {
    const lessonList = obj.lessons;
    const seenLessonIds = new Set<string>();

    lessonList.forEach((lesson, index) => {
      const lessonPath = `lessons[${index}]`;

      if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
        errors.push({
          path: lessonPath,
          message: `Item lesson pada indeks ${index} harus berupa objek.`
        });
        return;
      }

      const lObj = lesson as Record<string, unknown>;

      // lesson.id (Stable ID)
      if (!lObj.id || typeof lObj.id !== 'string' || lObj.id.trim() === '') {
        errors.push({
          path: `${lessonPath}.id`,
          message: `ID lesson pada indeks ${index} wajib diisi sebagai stable ID (string non-kosong).`
        });
      } else {
        const trimmedId = lObj.id.trim();
        if (seenLessonIds.has(trimmedId)) {
          errors.push({
            path: `${lessonPath}.id`,
            message: `ID lesson duplikat terdeteksi: "${trimmedId}". Seluruh ID lesson dalam satu file wajib unik.`
          });
        } else {
          seenLessonIds.add(trimmedId);
        }
      }

      // lesson.title
      if (!lObj.title || typeof lObj.title !== 'string' || lObj.title.trim() === '') {
        errors.push({
          path: `${lessonPath}.title`,
          message: `Judul lesson pada indeks ${index} wajib diisi.`
        });
      }

      // lesson.order
      if (lObj.order === undefined || lObj.order === null || typeof lObj.order !== 'number' || !Number.isInteger(lObj.order) || lObj.order < 1) {
        errors.push({
          path: `${lessonPath}.order`,
          message: `Urutan lesson ('order') pada indeks ${index} harus berupa bilangan bulat positif (>= 1).`
        });
      }

      // lesson.referenceUrl (opsional)
      if (lObj.referenceUrl !== undefined && lObj.referenceUrl !== null && typeof lObj.referenceUrl !== 'string') {
        errors.push({
          path: `${lessonPath}.referenceUrl`,
          message: `Referensi belajar ('referenceUrl') pada indeks ${index} harus berupa string URL jika disediakan.`
        });
      }
    });
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  // Objek valid dan terstruktur
  const validCourse = obj.course as Record<string, unknown>;
  const validLessons = (obj.lessons as Array<Record<string, unknown>>).map((l) => ({
    id: (l.id as string).trim(),
    title: (l.title as string).trim(),
    order: l.order as number,
    referenceUrl: typeof l.referenceUrl === 'string' ? l.referenceUrl.trim() : undefined
  }));

  const sanitizedData: RoadmapFileV1 = {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    course: {
      id: (validCourse.id as string).trim(),
      title: (validCourse.title as string).trim(),
      description: typeof validCourse.description === 'string' ? validCourse.description.trim() : undefined,
    },
    lessons: validLessons
  };

  return {
    isValid: true,
    data: sanitizedData
  };
}
