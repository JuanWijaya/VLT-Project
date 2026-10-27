import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  ExternalLink, 
  Upload, 
  Trash2, 
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { fetchCourseDetails, updateLessonStatus, deleteCourse } from '../../lib/roadmap/service';
import { calculateProgressPercentage } from '../../lib/roadmap/merger';
import type { EnrichedCourse, EnrichedLesson } from '../../lib/roadmap/types';
import type { LessonStatus } from '../../types';

interface CourseDetailViewProps {
  courseId: string;
  userId: string;
  onBack: () => void;
  onOpenImport: () => void;
  onCourseDeleted: () => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  userId,
  onBack,
  onOpenImport,
  onCourseDeleted,
}) => {
  const [course, setCourse] = useState<EnrichedCourse | null>(null);
  const [lessons, setLessons] = useState<EnrichedLesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | LessonStatus>('ALL');
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourseDetails(courseId, userId);
      setCourse(data.course);
      setLessons(data.lessons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail course.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId, userId]);

  const handleStatusChange = async (lessonId: string, newStatus: LessonStatus) => {
    setUpdatingLessonId(lessonId);
    try {
      await updateLessonStatus(lessonId, newStatus, userId);

      // Perbarui state lokal secara instan
      setLessons((prev) => {
        const updated = prev.map((l) => (l.id === lessonId ? { ...l, status: newStatus } : l));
        
        // Hitung ulang progres
        const total = updated.length;
        const completed = updated.filter((l) => l.status === 'completed').length;
        if (course) {
          setCourse({
            ...course,
            totalLessons: total,
            completedLessons: completed,
            progressPercentage: calculateProgressPercentage(total, completed),
          });
        }
        return updated;
      });
    } catch (err) {
      alert(`Gagal mengubah status lesson: ${err instanceof Error ? err.message : 'Kesalahan jaringan'}`);
    } finally {
      setUpdatingLessonId(null);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    const confirmText = `Apakah Anda yakin ingin menghapus course "${course.title}"?\n\nSesuai PRD, penghapusan ini akan menghapus course dan daftar lesson-nya. Tindakan ini tidak dapat dibatalkan.`;
    if (window.confirm(confirmText)) {
      try {
        await deleteCourse(course.id, userId);
        onCourseDeleted();
      } catch (err) {
        alert(`Gagal menghapus course: ${err instanceof Error ? err.message : 'Error'}`);
      }
    }
  };

  const filteredLessons = lessons.filter((l) => {
    if (statusFilter === 'ALL') return true;
    return l.status === statusFilter;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12 }}>
        <div className="status-dot-pulse" style={{ width: 14, height: 14 }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Memuat detail course...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={onBack} className="vlt-btn vlt-btn-subtle vlt-btn-sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={16} /> Kembali ke Semua Course
        </button>
        <div style={{ background: 'var(--accent-rose-subtle)', padding: 18, borderRadius: 'var(--radius-md)', color: 'var(--accent-rose-text)' }}>
          {error || 'Course tidak ditemukan.'}
        </div>
      </div>
    );
  }

  const isCompleted = course.totalLessons > 0 && course.completedLessons === course.totalLessons;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Navigation & Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={onBack}
          className="vlt-btn vlt-btn-secondary vlt-btn-sm"
          style={{ gap: 6 }}
        >
          <ArrowLeft size={16} />
          <span>Semua Course</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onOpenImport}
            className="vlt-btn vlt-btn-secondary vlt-btn-sm"
            style={{ gap: 6 }}
            title="Impor ulang file JSON untuk memperbarui course ini"
          >
            <Upload size={14} />
            <span>Impor Ulang (Reimport)</span>
          </button>

          <button
            onClick={handleDeleteCourse}
            className="vlt-btn vlt-btn-subtle vlt-btn-sm"
            style={{ gap: 6, color: 'var(--accent-rose)' }}
            title="Hapus course ini beserta lesson-nya"
          >
            <Trash2 size={14} />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Course Header Banner */}
      <Card style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Badge variant={isCompleted ? 'emerald' : 'primary'} icon={<Sparkles size={12} />}>
            {isCompleted ? 'Course Selesai' : 'Roadmap Aktif'}
          </Badge>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Stable ID: {course.stableId}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>•</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            v{course.schemaVersion}
          </span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
          {course.title}
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 840, marginBottom: 24 }}>
          {course.description || 'Tidak ada deskripsi course.'}
        </p>

        {/* Big Progress Section */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Progres Pembelajaran
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                ({course.completedLessons} dari {course.totalLessons} lesson selesai)
              </span>
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isCompleted ? 'var(--accent-emerald)' : 'var(--primary)' }}>
              {course.progressPercentage}%
            </div>
          </div>

          <div style={{
            height: 10,
            width: '100%',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${course.progressPercentage}%`,
              background: isCompleted ? 'var(--accent-emerald)' : 'linear-gradient(90deg, #4F46E5 0%, #06B6D4 100%)',
              transition: 'width var(--transition-normal)',
            }} />
          </div>
        </div>
      </Card>

      {/* Filter Tabs & Lesson Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`vlt-btn vlt-btn-sm ${statusFilter === 'ALL' ? 'vlt-btn-primary' : 'vlt-btn-secondary'}`}
          >
            Semua ({lessons.length})
          </button>
          <button
            onClick={() => setStatusFilter('not_started')}
            className={`vlt-btn vlt-btn-sm ${statusFilter === 'not_started' ? 'vlt-btn-primary' : 'vlt-btn-secondary'}`}
          >
            Belum dimulai ({lessons.filter((l) => l.status === 'not_started').length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`vlt-btn vlt-btn-sm ${statusFilter === 'in_progress' ? 'vlt-btn-primary' : 'vlt-btn-secondary'}`}
          >
            Sedang dipelajari ({lessons.filter((l) => l.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`vlt-btn vlt-btn-sm ${statusFilter === 'completed' ? 'vlt-btn-primary' : 'vlt-btn-secondary'}`}
          >
            Selesai ({lessons.filter((l) => l.status === 'completed').length})
          </button>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          * Ubah status kapan saja secara manual sesuai kemajuan Anda.
        </span>
      </div>

      {/* Lessons List */}
      {filteredLessons.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Tidak ada lesson pada filter ini"
          description="Pilih tab filter lain untuk melihat daftar materi pembelajaran Anda."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredLessons.map((lesson) => {
            const isUpdating = updatingLessonId === lesson.id;

            return (
              <Card key={lesson.id} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  {/* Left: Order, Title, Reference URL, Missing badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {lesson.orderIndex}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {lesson.title}
                        </h4>

                        {lesson.isMissingFromSource && (
                          <Badge variant="amber" icon={<AlertTriangle size={11} />}>
                            Tidak di file sumber baru
                          </Badge>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {lesson.stableId}</span>
                        {lesson.referenceUrl && (
                          <a
                            href={lesson.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}
                          >
                            <span>Referensi Materi</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Selector Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isUpdating && <div className="status-dot-pulse" style={{ width: 8, height: 8 }} />}

                    <select
                      value={lesson.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(lesson.id, e.target.value as LessonStatus)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-medium)',
                        background: lesson.status === 'completed' 
                          ? 'var(--accent-emerald-subtle)' 
                          : lesson.status === 'in_progress' 
                          ? 'var(--primary-subtle)' 
                          : 'var(--bg-surface)',
                        color: lesson.status === 'completed' 
                          ? 'var(--accent-emerald-text)' 
                          : lesson.status === 'in_progress' 
                          ? 'var(--primary-text)' 
                          : 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all var(--transition-fast)',
                      }}
                      title="Ubah status lesson ini"
                    >
                      <option value="not_started">⚪ Belum dimulai</option>
                      <option value="in_progress">🔵 Sedang dipelajari</option>
                      <option value="completed">🟢 Selesai</option>
                    </select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
