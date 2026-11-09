import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Coffee, 
  Flame, 
  Laptop, 
  ShieldAlert, 
  CheckCircle,
  Clock,
  BookOpen,
  AlertTriangle,
  History,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useFocus } from '../context/FocusContext';
import { 
  fetchCoursesWithLessons, 
  type CourseOption,
  formatTimeLocal 
} from '../lib/calendar/service';
import type { 
  FocusMode 
} from '../types/focus';

export const FocusRoomPage: React.FC = () => {
  const { user } = useAuth();
  const {
    activeSession,
    liveActualSeconds,
    loadingActive,
    recentSessions,
    startSession,
    pauseSession,
    resumeSession,
    stopEarlySession,
    cancelSession,
    refreshActiveSession,
    refreshRecentSessions,
  } = useFocus();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // New Session Configuration Form State (when no active session)
  const [selectedMode, setSelectedMode] = useState<FocusMode>('work');
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('25');
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);

  // Stop / Cancel Confirmation Dialogs
  const [confirmStopOpen, setConfirmStopOpen] = useState<boolean>(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState<boolean>(false);

  // Load course options
  useEffect(() => {
    if (!user) return;
    fetchCoursesWithLessons(user.id)
      .then(setCourseOptions)
      .catch((err) => console.warn('[FocusRoom] Gagal memuat opsi kursus:', err));
  }, [user]);

  const handleStartSession = async () => {
    if (!user) return;
    setActionLoading(true);
    setErrorMessage(null);

    const targetSec = isCustomDuration 
      ? Math.max(60, (parseInt(customMinutesInput, 10) || 25) * 60)
      : targetMinutes * 60;

    try {
      await startSession({
        mode: selectedMode,
        targetDurationSeconds: targetSec,
        courseId: selectedCourseId || null,
        lessonId: selectedLessonId || null,
        title: sessionTitle.trim() || undefined,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memulai sesi fokus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await pauseSession();
    } catch (err) {
      setErrorMessage('Gagal menjeda sesi fokus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeSession();
    } catch (err) {
      setErrorMessage('Gagal melanjutkan sesi fokus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopEarlyConfirm = async () => {
    setActionLoading(true);
    setConfirmStopOpen(false);
    try {
      await stopEarlySession();
    } catch (err) {
      setErrorMessage('Gagal menyelesaikan sesi fokus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSessionConfirm = async () => {
    setActionLoading(true);
    setConfirmCancelOpen(false);
    try {
      await cancelSession();
    } catch (err) {
      setErrorMessage('Gagal membatalkan sesi fokus.');
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Calculations for UI Display
  // ---------------------------------------------------------------------------
  const remainingSeconds = activeSession 
    ? Math.max(0, activeSession.targetDurationSeconds - liveActualSeconds) 
    : (isCustomDuration ? (parseInt(customMinutesInput, 10) || 25) * 60 : targetMinutes * 60);

  const displayMinutes = Math.floor(remainingSeconds / 60);
  const displaySeconds = remainingSeconds % 60;
  const formatTime = (m: number, s: number) => 
    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  const currentTargetSeconds = activeSession ? activeSession.targetDurationSeconds : targetMinutes * 60;
  const progressPercent = Math.min(100, (liveActualSeconds / Math.max(1, currentTargetSeconds)) * 100);

  const selectedCourse = courseOptions.find(c => c.id === selectedCourseId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Header Info */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Focus Room (Pomodoro Timer)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Menjalankan sesi fokus terukur. Waktu jeda dan waktu aplikasi tertutup tidak dihitung sebagai waktu fokus.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeSession ? (
            <Badge 
              variant={activeSession.mode === 'work' ? 'primary' : 'emerald'} 
              icon={activeSession.mode === 'work' ? <Flame size={13} /> : <Coffee size={13} />}
            >
              {activeSession.status === 'running' 
                ? (activeSession.mode === 'work' ? 'Sedang Fokus (Berjalan)' : 'Sedang Istirahat (Berjalan)') 
                : 'Sesi Dijeda'}
            </Badge>
          ) : (
            <Badge variant="subtle" icon={<Clock size={13} />}>
              Siap Memulai Sesi
            </Badge>
          )}

          <button
            type="button"
            className="vlt-btn vlt-btn-secondary"
            onClick={() => {
              refreshActiveSession();
              refreshRecentSessions();
            }}
            title="Sinkronkan status dari server"
            style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={loadingActive ? 'vlt-spin' : ''} />
            <span>Sinkron</span>
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div style={{
          background: 'var(--accent-rose-subtle)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          color: 'var(--accent-rose-text)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)} 
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Recovery Banner (PRD FR-FOCUS-05 & Section 14.3) */}
      {activeSession && activeSession.status === 'paused' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={20} style={{ color: 'var(--accent-amber)' }} />
            <div>
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block' }}>
                Sesi Sebelumnya Dipulihkan (Status: Dijeda)
              </strong>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Durasi terlaksana: <strong>{Math.floor(liveActualSeconds / 60)}m {liveActualSeconds % 60}s</strong> dari target {Math.floor(activeSession.targetDurationSeconds / 60)} menit. Waktu saat browser ditutup tidak dihitung sebagai fokus.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="vlt-btn vlt-btn-primary"
              onClick={handleResume}
              disabled={actionLoading}
              style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
            >
              <Play size={14} />
              <span>Lanjutkan Sesi</span>
            </button>
            <button
              type="button"
              className="vlt-btn vlt-btn-secondary"
              onClick={() => setConfirmStopOpen(true)}
              disabled={actionLoading}
              style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              <Square size={14} />
              <span>Selesaikan Sekarang</span>
            </button>
            <button
              type="button"
              className="vlt-btn vlt-btn-subtle"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={actionLoading}
              style={{ padding: '6px 10px', fontSize: '0.8125rem', color: 'var(--accent-rose)' }}
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* Main Timer Display Card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Progress Bar Top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: 'var(--bg-subtle)',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: (activeSession?.mode || selectedMode) === 'work' ? 'var(--primary)' : 'var(--accent-emerald)',
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* If NO Active Session: Configuration Preset Tabs */}
        {!activeSession ? (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 28,
          }}>
            <button
              type="button"
              onClick={() => {
                setSelectedMode('work');
                setTargetMinutes(25);
                setIsCustomDuration(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: (!isCustomDuration && selectedMode === 'work' && targetMinutes === 25) ? 'var(--primary)' : 'var(--border-subtle)',
                background: (!isCustomDuration && selectedMode === 'work' && targetMinutes === 25) ? 'var(--primary-subtle)' : 'var(--bg-subtle)',
                color: (!isCustomDuration && selectedMode === 'work' && targetMinutes === 25) ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Flame size={15} />
              Fokus (25m)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedMode('work');
                setTargetMinutes(50);
                setIsCustomDuration(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: (!isCustomDuration && selectedMode === 'work' && targetMinutes === 50) ? 'var(--primary)' : 'var(--border-subtle)',
                background: (!isCustomDuration && selectedMode === 'work' && targetMinutes === 50) ? 'var(--primary-subtle)' : 'var(--bg-subtle)',
                color: (!isCustomDuration && selectedMode === 'work' && targetMinutes === 50) ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Flame size={15} />
              Deep Work (50m)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedMode('break');
                setTargetMinutes(5);
                setIsCustomDuration(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: (!isCustomDuration && selectedMode === 'break' && targetMinutes === 5) ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                background: (!isCustomDuration && selectedMode === 'break' && targetMinutes === 5) ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                color: (!isCustomDuration && selectedMode === 'break' && targetMinutes === 5) ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Coffee size={15} />
              Istirahat (5m)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedMode('long_break');
                setTargetMinutes(15);
                setIsCustomDuration(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: (!isCustomDuration && selectedMode === 'long_break') ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                background: (!isCustomDuration && selectedMode === 'long_break') ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                color: (!isCustomDuration && selectedMode === 'long_break') ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Coffee size={15} />
              Istirahat Panjang (15m)
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCustomDuration(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: isCustomDuration ? 'var(--primary)' : 'var(--border-subtle)',
                background: isCustomDuration ? 'var(--primary-subtle)' : 'var(--bg-subtle)',
                color: isCustomDuration ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Kustom
            </button>
          </div>
        ) : (
          /* When In Active Session: Show Mode & Linked Info */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge 
                variant={activeSession.mode === 'work' ? 'primary' : 'emerald'} 
                icon={activeSession.mode === 'work' ? <Flame size={14} /> : <Coffee size={14} />}
              >
                {activeSession.mode === 'work' ? 'Sesi Fokus Terjadwal' : 'Sesi Istirahat'}
              </Badge>
              {activeSession.status === 'paused' && (
                <Badge variant="amber">Dijeda</Badge>
              )}
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '4px 0 0', textAlign: 'center' }}>
              {activeSession.title || (activeSession.lessonTitle ? `${activeSession.lessonTitle}` : 'Sesi Fokus Mandiri')}
            </h3>

            {activeSession.courseTitle && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                📚 {activeSession.courseTitle} {activeSession.lessonTitle ? `› ${activeSession.lessonTitle}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Digital Clock Display */}
        <div style={{
          fontSize: 'clamp(4.5rem, 15vw, 8rem)',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: activeSession?.status === 'paused' ? 'var(--text-tertiary)' : 'var(--text-primary)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 32,
          userSelect: 'none',
          transition: 'color var(--transition-fast)',
        }}>
          {formatTime(displayMinutes, displaySeconds)}
        </div>

        {/* Timer Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!activeSession ? (
            <button
              type="button"
              onClick={handleStartSession}
              disabled={actionLoading}
              className="vlt-btn vlt-btn-primary"
              style={{ padding: '14px 36px', fontSize: '1rem', borderRadius: 'var(--radius-full)' }}
            >
              <Play size={20} />
              <span>{actionLoading ? 'Menyiapkan...' : 'Mulai Sesi Fokus'}</span>
            </button>
          ) : (
            <>
              {activeSession.status === 'running' ? (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="vlt-btn vlt-btn-secondary"
                  style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: 'var(--radius-full)' }}
                >
                  <Pause size={20} />
                  <span>Jeda (Pause)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="vlt-btn vlt-btn-primary"
                  style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: 'var(--radius-full)' }}
                >
                  <Play size={20} />
                  <span>Lanjutkan</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setConfirmStopOpen(true)}
                disabled={actionLoading}
                className="vlt-btn vlt-btn-secondary"
                style={{ padding: '14px 24px', fontSize: '0.9375rem', borderRadius: 'var(--radius-full)' }}
                title="Hentikan lebih awal dan simpan durasi aktual yang valid"
              >
                <Square size={18} />
                <span>Selesai Lebih Awal</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmCancelOpen(true)}
                disabled={actionLoading}
                className="vlt-btn vlt-btn-subtle"
                style={{ padding: '14px', borderRadius: 'var(--radius-full)', color: 'var(--accent-rose)' }}
                title="Batalkan sesi tanpa mencatat waktu"
              >
                <RotateCcw size={18} />
              </button>
            </>
          )}
        </div>

        {/* Live Actual Focus Counter */}
        {activeSession && (
          <div style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}>
            <Clock size={15} style={{ color: 'var(--primary)' }} />
            <span>
              Fokus aktual yang sudah tercatat: <strong>{Math.floor(liveActualSeconds / 60)}m {liveActualSeconds % 60}s</strong>
            </span>
          </div>
        )}
      </div>

      {/* Optional Course / Lesson Linking Form (When starting a new session) */}
      {!activeSession && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <BookOpen size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Kaitkan Sesi ke Roadmap (Opsional — FR-FOCUS-03)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {/* Custom Minutes (If selected) */}
            {isCustomDuration && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6 }}>
                  Durasi Kustom (Menit)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
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
            )}

            {/* Title / Topic */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6 }}>
                Topik / Aktivitas (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Eksplorasi React 19 Actions"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
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

            {/* Course Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6 }}>
                Pilih Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedLessonId('');
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
                <option value="">⚪ Sesi Mandiri (Tanpa Course)</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6 }}>
                Pilih Lesson (Opsional)
              </label>
              <select
                value={selectedLessonId}
                disabled={!selectedCourseId || !selectedCourse || selectedCourse.lessons.length === 0}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  opacity: !selectedCourseId ? 0.6 : 1,
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
        </Card>
      )}

      {/* Session History Section */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
              Riwayat Sesi Fokus Terbaru
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Menyimpan durasi aktual valid
          </span>
        </div>

        {recentSessions.length === 0 ? (
          <EmptyState
            icon={<Clock size={28} />}
            title="Belum ada riwayat sesi fokus"
            description="Mulai sesi fokus pertama Anda di atas untuk mencatat waktu belajar aktual."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentSessions.map((session) => {
              const actualMins = Math.floor(session.actualDurationSeconds / 60);
              const targetMins = Math.floor(session.targetDurationSeconds / 60);
              const isWork = session.mode === 'work';
              const isCancelled = session.status === 'cancelled';

              return (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isCancelled ? 'rgba(244, 63, 94, 0.12)' : isWork ? 'var(--primary-subtle)' : 'rgba(16, 185, 129, 0.12)',
                      color: isCancelled ? 'var(--accent-rose)' : isWork ? 'var(--primary)' : 'var(--accent-emerald)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isCancelled ? <XCircle size={16} /> : isWork ? <Flame size={16} /> : <Coffee size={16} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {session.title || session.lessonTitle || (isWork ? 'Sesi Fokus Mandiri' : 'Sesi Istirahat')}
                        </span>
                        <Badge variant={isCancelled ? 'rose' : isWork ? 'primary' : 'emerald'}>
                          {isCancelled ? 'Dibatalkan' : isWork ? 'Fokus' : 'Istirahat'}
                        </Badge>
                      </div>

                      {session.courseTitle && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          📚 {session.courseTitle} {session.lessonTitle ? `› ${session.lessonTitle}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {actualMins}m <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>/ {targetMins}m</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {new Date(session.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, {formatTimeLocal(session.startTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Rules & Architecture Notice Cards (PRD Section 14.3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Laptop size={18} style={{ color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Aturan Multi-Perangkat (PRD 14.3)</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Satu akun hanya boleh memiliki 1 sesi aktif (berjalan atau dijeda). Status server adalah <em>single source of truth</em> yang dilindungi konstrain unik di database PostgreSQL.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <ShieldAlert size={18} style={{ color: 'var(--accent-amber)' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Pemulihan Crash & Sleep</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Sesi melakukan checkpoint otomatis setiap 10 detik. Jika aplikasi ditutup atau komputer tidur, sesi otomatis dipulihkan sebagai <strong>"dijeda"</strong> dan tidak menghitung durasi saat tidur sebagai waktu fokus.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CheckCircle size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Pemisahan Tugas & Sesi</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Menyelesaikan sesi Pomodoro <strong>tidak</strong> otomatis menyelesaikan status lesson. Riwayat waktu fokus tetap aman tersimpan meskipun struktur materi diubah.
          </p>
        </Card>
      </div>

      {/* Confirmation Modal: Selesai Lebih Awal (Stop Early) */}
      {confirmStopOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            maxWidth: 440,
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 10 }}>
              Selesaikan Sesi Lebih Awal?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
              Durasi fokus aktual yang sudah berjalan selama <strong>{Math.floor(liveActualSeconds / 60)} menit {liveActualSeconds % 60} detik</strong> akan tetap dicatat ke dalam riwayat belajar Anda.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="vlt-btn vlt-btn-secondary"
                onClick={() => setConfirmStopOpen(false)}
              >
                Kembali
              </button>
              <button
                type="button"
                className="vlt-btn vlt-btn-primary"
                onClick={handleStopEarlyConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Menyimpan...' : 'Ya, Selesaikan & Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Batalkan Sesi (Cancel) */}
      {confirmCancelOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            maxWidth: 440,
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 10, color: 'var(--accent-rose)' }}>
              Batalkan Sesi Fokus?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
              Sesi ini akan dibatalkan dan waktu yang berjalan tidak akan dihitung ke dalam statistik total waktu fokus.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="vlt-btn vlt-btn-secondary"
                onClick={() => setConfirmCancelOpen(false)}
              >
                Lanjutkan Sesi
              </button>
              <button
                type="button"
                className="vlt-btn"
                style={{ background: 'var(--accent-rose)', color: '#fff', border: 'none' }}
                onClick={handleCancelSessionConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
