import React, { useState, useEffect } from 'react';
import { 
  FileJson, 
  Upload, 
  Layers, 
  CheckCircle, 
  BookOpen, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { fetchUserCourses } from '../lib/roadmap/service';
import type { EnrichedCourse } from '../lib/roadmap/types';
import { CourseCard } from '../components/roadmap/CourseCard';
import { CourseDetailView } from '../components/roadmap/CourseDetailView';
import { RoadmapImportModal } from '../components/roadmap/RoadmapImportModal';

export const MyLearningPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<EnrichedCourse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [detailVersion, setDetailVersion] = useState<number>(0);

  const loadCourses = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserCourses(user.id);
      setCourses(data);
      // Sinkronkan selectedCourse secara aman menggunakan functional update
      // untuk mencegah stale closure mengembalikan pengguna ke detail saat sedang navigasi kembali
      setSelectedCourse((prev) => {
        if (!prev) return null;
        const found = data.find((c) => c.id === prev.id);
        return found || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar course dari Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 
        TAMPILAN 1: DETAIL COURSE VIEW
        Jika selectedCourse aktif, tampilkan CourseDetailView
      */}
      {selectedCourse && user ? (
        <CourseDetailView
          key={`${selectedCourse.id}-${detailVersion}`}
          courseId={selectedCourse.id}
          userId={user.id}
          onBack={() => {
            setSelectedCourse(null);
          }}
          onOpenImport={() => {
            setIsImportModalOpen(true);
          }}
          onCourseDeleted={() => {
            setSelectedCourse(null);
            loadCourses();
          }}
        />
      ) : (
        /* 
          TAMPILAN 2: DAFTAR COURSE UTAMA & IMPORT HERO
        */
        <>
          {/* Header Info */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>My Learning & Roadmap Management</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Pengelolaan roadmap mandiri berbasis file JSON v1.0 dan pelacakan progres aktual.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge variant="primary" icon={<FileJson size={13} />}>
                Schema v1.0
              </Badge>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="vlt-btn vlt-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                <Upload size={16} />
                <span>Impor Roadmap (.json)</span>
              </button>
            </div>
          </div>

          {/* Error Notice jika fetch gagal */}
          {error && (
            <div style={{
              background: 'var(--accent-rose-subtle)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-rose-text)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>{error}</span>
              <button onClick={loadCourses} className="vlt-btn vlt-btn-subtle vlt-btn-sm">
                Coba Lagi
              </button>
            </div>
          )}

          {/* Course List / Empty State */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
              <div className="status-dot-pulse" style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Memuat daftar roadmap dari Supabase...
              </span>
            </div>
          ) : courses.length === 0 ? (
            <>
              {/* JSON Import Specification Notice (FR-LEARN-01 & Section 14.4) */}
              <Card style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FileJson size={22} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Ketentuan Impor Roadmap (FR-LEARN-01 & PRD 14.4)</h3>
                      <Badge variant="amber">Aturan Ketat</Badge>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                      Course baru <strong>hanya</strong> dibuat melalui impor file JSON. Tidak disediakan form manual agar hierarki lesson tetap stabil.
                      File wajib memiliki <code>schemaVersion: "1.0"</code>, ID permanen unik, dan divalidasi dengan alur Preview & Merge transparan.
                    </p>

                    <div style={{
                      background: 'var(--bg-base)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}>
                      <div>&#123;</div>
                      <div style={{ paddingLeft: 16 }}>
                        <span style={{ color: 'var(--primary)' }}>"schemaVersion"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"1.0"</span>,
                      </div>
                      <div style={{ paddingLeft: 16 }}>
                        <span style={{ color: 'var(--primary)' }}>"course"</span>: &#123; <span style={{ color: 'var(--primary)' }}>"id"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"crs-react-pro"</span>, <span style={{ color: 'var(--primary)' }}>"title"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"React 19 Advanced"</span> &#125;,
                      </div>
                      <div style={{ paddingLeft: 16 }}>
                        <span style={{ color: 'var(--primary)' }}>"lessons"</span>: [ &#123; <span style={{ color: 'var(--primary)' }}>"id"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"lsn-001"</span>, <span style={{ color: 'var(--primary)' }}>"title"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"Server Actions"</span>, <span style={{ color: 'var(--primary)' }}>"order"</span>: 1 &#125; ]
                      </div>
                      <div>&#125;</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Empty State dengan Call-to-Action */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={18} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Daftar Course Tersimpan</h3>
                  </div>
                  <Badge variant="subtle">0 Course</Badge>
                </div>

                <EmptyState
                  icon={<BookOpen size={24} />}
                  title="Belum ada roadmap yang diimpor"
                  description="Pilih atau seret file JSON roadmap berversi 1.0 untuk menambahkan course pertama Anda ke database Supabase."
                  action={{
                    label: 'Impor File JSON Sekarang',
                    onClick: () => setIsImportModalOpen(true),
                  }}
                />
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
                    Course Aktif ({courses.length})
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Data tersinkronisasi via Supabase RLS
                </span>
              </div>

              {/* Grid Cards Course */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 20,
              }}>
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onSelect={(c) => setSelectedCourse(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Business Rule Checklist (Informative) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
              <CheckCircle size={16} style={{ color: 'var(--accent-emerald)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>3 Status Lesson:</strong> Belum dimulai, Sedang dipelajari, Selesai (dapat diubah manual).
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
              <AlertCircle size={16} style={{ color: 'var(--accent-amber)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Preview & Merge:</strong> Impor ulang tidak menimpa status belajar tanpa konfirmasi eksplisit.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
              <HelpCircle size={16} style={{ color: 'var(--accent-cyan)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Progres Otomatis:</strong> (Lesson selesai ÷ total lesson) × 100%, semua berbobot setara.
              </div>
            </div>
          </div>
        </>
      )}

      {/* 
        MODAL DIALOG IMPORT JSON
        Ditempatkan di luar kondisi selectedCourse sehingga SELALU TERSEDIA di DOM 
        saat dipanggil baik dari halaman utama maupun dari tombol 'Impor Ulang' di halaman detail lesson.
      */}
      {user && (
        <RoadmapImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          userId={user.id}
          onSuccess={() => {
            loadCourses();
            setDetailVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};
