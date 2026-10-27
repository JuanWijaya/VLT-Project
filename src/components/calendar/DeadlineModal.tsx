import React, { useState, useEffect } from 'react';
import { X, Target, Clock, BookOpen, AlertCircle, Check, Info } from 'lucide-react';
import type { DeadlineItem, CreateDeadlineInput, DeadlineStatus } from '../../types/calendar';
import type { CourseOption } from '../../lib/calendar/service';
import { formatDateToLocalKey } from '../../lib/calendar/service';

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateDeadlineInput & { status?: DeadlineStatus }, deadlineId?: string) => Promise<void>;
  initialDeadline?: DeadlineItem | null;
  defaultDate?: string;
  courseOptions: CourseOption[];
}

export const DeadlineModal: React.FC<DeadlineModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDeadline,
  defaultDate,
  courseOptions,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [courseId, setCourseId] = useState<string>('');
  const [lessonId, setLessonId] = useState<string>('');
  const [status, setStatus] = useState<DeadlineStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialDeadline) {
      setTitle(initialDeadline.title);
      setDescription(initialDeadline.description || '');
      const dDate = new Date(initialDeadline.dueDate);
      setDueDate(formatDateToLocalKey(dDate));
      setDueTime(dDate.toTimeString().substring(0, 5) || '23:59');
      setCourseId(initialDeadline.courseId || '');
      setLessonId(initialDeadline.lessonId || '');
      setStatus(initialDeadline.status);
    } else {
      setTitle('');
      setDescription('');
      setDueDate(defaultDate || formatDateToLocalKey(new Date()));
      setDueTime('23:59');
      setCourseId('');
      setLessonId('');
      setStatus('pending');
    }
    setError(null);
  }, [initialDeadline, defaultDate, isOpen]);

  if (!isOpen) return null;

  const selectedCourse = courseOptions.find((c) => c.id === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Judul deadline target wajib diisi.');
      return;
    }

    if (!dueDate) {
      setError('Tanggal deadline wajib dipilih.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime: dueTime || '23:59',
        courseId: courseId || null,
        lessonId: lessonId || null,
        status,
      }, initialDeadline?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan deadline.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        maxWidth: 540,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.12)',
              color: 'var(--rose-500, #f43f5e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Target size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                {initialDeadline ? 'Edit Target Deadline' : 'Buat Target Deadline Baru'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Batas waktu penyelesaian independen (tidak dihitung sebagai durasi belajar)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="vlt-btn-icon"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '0.8125rem',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Rule Reminder */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}>
            <Info size={14} style={{ color: 'var(--rose-500, #f43f5e)', flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Ketentuan PRD:</strong> Menyelesaikan deadline tidak otomatis menandai lesson terkait selesai, dan melewati deadline tidak mengasumsikan lesson batal.
            </span>
          </div>

          {/* Judul */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Judul Target Deadline <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Selesaikan Modul Auth & Security"
              className="vlt-input"
              autoFocus
              required
            />
          </div>

          {/* Tanggal & Waktu Batas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Tanggal Target <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="vlt-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Batas Jam
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Clock size={16} style={{ position: 'absolute', left: 10, color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="vlt-input"
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>
          </div>

          {/* Hubungkan ke Course & Lesson (Opsional) */}
          <div style={{
            padding: 14,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Hubungkan ke Course & Lesson (Opsional)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Pilih Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setLessonId('');
                  }}
                  className="vlt-input"
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="">-- Tanpa Course --</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Pilih Lesson
                </label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  disabled={!selectedCourse || selectedCourse.lessons.length === 0}
                  className="vlt-input"
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="">-- Tanpa Lesson --</option>
                  {selectedCourse?.lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.orderIndex + 1}. {l.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Status Deadline (jika sedang mengedit) */}
          {initialDeadline && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Status Target
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: status === 'pending' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: status === 'pending' ? 'var(--primary-subtle)' : 'var(--bg-elevated)',
                    color: status === 'pending' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Tertunda / Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('completed')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: status === 'completed' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    background: status === 'completed' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-elevated)',
                    color: status === 'completed' ? '#10b981' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Selesai
                </button>
              </div>
            </div>
          )}

          {/* Deskripsi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Catatan / Deskripsi Tambahan
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan kriteria keberhasilan target..."
              rows={2}
              className="vlt-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 6,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <button
              type="button"
              className="vlt-btn vlt-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="vlt-btn vlt-btn-primary"
              style={{ background: 'var(--rose-600, #e11d48)', borderColor: 'var(--rose-600, #e11d48)' }}
              disabled={submitting}
            >
              <Check size={16} />
              <span>{submitting ? 'Menyimpan...' : initialDeadline ? 'Perbarui Target' : 'Buat Target'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
