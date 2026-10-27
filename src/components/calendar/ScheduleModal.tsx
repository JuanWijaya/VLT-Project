import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import type { ScheduleItem, CreateScheduleInput, ScheduleStatus } from '../../types/calendar';
import type { CourseOption } from '../../lib/calendar/service';
import { formatDateToLocalKey } from '../../lib/calendar/service';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateScheduleInput & { status?: ScheduleStatus }, scheduleId?: string) => Promise<void>;
  initialSchedule?: ScheduleItem | null;
  defaultDate?: string;
  courseOptions: CourseOption[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialSchedule,
  defaultDate,
  courseOptions,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [courseId, setCourseId] = useState<string>('');
  const [lessonId, setLessonId] = useState<string>('');
  const [status, setStatus] = useState<ScheduleStatus>('scheduled');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSchedule) {
      setTitle(initialSchedule.title);
      setDescription(initialSchedule.description || '');
      const sDate = new Date(initialSchedule.startTime);
      setDate(formatDateToLocalKey(sDate));
      setStartTime(sDate.toTimeString().substring(0, 5));
      const eDate = new Date(initialSchedule.endTime);
      setEndTime(eDate.toTimeString().substring(0, 5));
      setCourseId(initialSchedule.courseId || '');
      setLessonId(initialSchedule.lessonId || '');
      setStatus(initialSchedule.status);
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate || formatDateToLocalKey(new Date()));
      setStartTime('09:00');
      setEndTime('10:00');
      setCourseId('');
      setLessonId('');
      setStatus('scheduled');
    }
    setError(null);
  }, [initialSchedule, defaultDate, isOpen]);

  if (!isOpen) return null;

  const selectedCourse = courseOptions.find((c) => c.id === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Judul jadwal wajib diisi.');
      return;
    }

    if (!date) {
      setError('Tanggal jadwal wajib dipilih.');
      return;
    }

    const startMs = new Date(`${date}T${startTime}:00`).getTime();
    const endMs = new Date(`${date}T${endTime}:00`).getTime();
    if (endMs < startMs) {
      setError('Waktu selesai tidak boleh lebih awal dari waktu mulai.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime,
        courseId: courseId || null,
        lessonId: lessonId || null,
        status,
      }, initialSchedule?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal.');
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
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                {initialSchedule ? 'Edit Jadwal Aktivitas' : 'Buat Jadwal Belajar Baru'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Rencana waktu belajar terstruktur (FR-CAL-01 / 02 / 03)
              </span>
            </div>
          </div>

          <button onClick={onClose} className="vlt-btn-icon" style={{ borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{
              background: 'var(--accent-rose-subtle)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.8125rem',
              color: 'var(--accent-rose-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Judul Aktivitas <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Belajar Server Actions & Practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Date & Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Tanggal
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Waktu Mulai
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Waktu Selesai
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Course & Lesson Linking (Opsional - FR-CAL-01 / 02 / 03) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Hubungkan ke Course (Opsional)
              </label>
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setLessonId('');
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="">⚪ Aktivitas Umum (Tanpa Course)</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Hubungkan ke Lesson (Opsional)
              </label>
              <select
                value={lessonId}
                disabled={!courseId || !selectedCourse || selectedCourse.lessons.length === 0}
                onChange={(e) => setLessonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  opacity: !courseId ? 0.6 : 1,
                }}
              >
                <option value="">Seluruh Course / Umum</option>
                {selectedCourse?.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.orderIndex}. {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Catatan / Deskripsi Tambahan
            </label>
            <textarea
              rows={2}
              placeholder="Catatan persiapan atau target materi dalam sesi ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Status Selection (Saat Edit) */}
          {initialSchedule && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Status Pelaksanaan Jadwal
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="scheduled">🔵 Terjadwal (Rencana)</option>
                <option value="completed">🟢 Selesai Terlaksana</option>
                <option value="cancelled">⚪ Dibatalkan</option>
              </select>
            </div>
          )}

          {/* Business Rule Notice */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-subtle)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            lineHeight: 1.5,
          }}>
            * <strong>Aturan PRD:</strong> Menyelesaikan jadwal aktivitas <strong>tidak otomatis</strong> menyelesaikan status lesson. Status lesson tetap dikendalikan mandiri oleh Anda.
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="vlt-btn vlt-btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="vlt-btn vlt-btn-primary">
              {submitting ? 'Menyimpan...' : initialSchedule ? 'Simpan Perubahan' : 'Tambah Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
