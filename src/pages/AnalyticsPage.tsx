import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Info,
  Award,
  BookOpen,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  RefreshCw
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { 
  fetchAllAnalyticsRawData, 
  computeAnalyticsMetrics 
} from '../lib/analytics/service';
import type { AnalyticsPeriod, AnalyticsSummary } from '../types/analytics';
import type { StudySession } from '../types/focus';
import type { EnrichedCourse, EnrichedLesson } from '../lib/roadmap/types';

interface AnalyticsPageProps {
  onNavigate?: (page: any) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const [loading, setLoading] = useState<boolean>(true);
  const [rawData, setRawData] = useState<{
    sessions: StudySession[];
    courses: EnrichedCourse[];
    lessons: EnrichedLesson[];
  }>({ sessions: [], courses: [], lessons: [] });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchAllAnalyticsRawData(user.id);
      setRawData(data);
    } catch (err) {
      console.error('[AnalyticsPage] Gagal memuat data analitik:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hitung summary metrik berdasarkan data aktual
  const summary: AnalyticsSummary = computeAnalyticsMetrics(
    rawData.sessions,
    rawData.courses,
    rawData.lessons,
    period,
    new Date()
  );

  // Nilai maksimum untuk skala grafik bar
  const maxMinutesInBar = Math.max(
    ...summary.dailyBars.map((b) => b.focusMinutes),
    30 // Minimal 30 menit agar grafik tidak gepeng saat data kecil
  );

  const totalTimeOfDayMinutes = 
    summary.timeOfDay.morningMinutes +
    summary.timeOfDay.afternoonMinutes +
    summary.timeOfDay.eveningMinutes +
    summary.timeOfDay.nightMinutes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Header Info & Period Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Analytics & Consistency Trends</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Evaluasi pola belajar objektif berdasarkan catatan waktu fokus aktual dan penyelesaian lesson.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Period Filter Tabs */}
          <div style={{
            display: 'inline-flex',
            padding: 3,
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              type="button"
              onClick={() => setPeriod('7d')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: period === '7d' ? 'var(--bg-surface)' : 'transparent',
                color: period === '7d' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: period === '7d' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: period === '7d' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: period === '30d' ? 'var(--bg-surface)' : 'transparent',
                color: period === '30d' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: period === '30d' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: period === '30d' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              30 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: period === 'all' ? 'var(--bg-surface)' : 'transparent',
                color: period === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: period === 'all' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: period === 'all' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Semua Waktu
            </button>
          </div>

          <button
            type="button"
            className="vlt-btn vlt-btn-secondary"
            onClick={loadData}
            title="Muat ulang analitik"
            style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={loading ? 'vlt-spin' : ''} />
            <span>Sinkron</span>
          </button>
        </div>
      </div>

      {/* Zero Fake Data Notice Banner (FR-ANA-04 & PRD Principle #5) */}
      <div className="vlt-banner vlt-banner-info">
        <Info size={20} />
        <div>
          <strong style={{ display: 'block', marginBottom: 2 }}>Integritas Data Bersih (FR-ANA-04)</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            VLT tidak mengisi grafik kosong dengan data simulasi atau streak palsu. Grafik dan ringkasan metrik hanya dihitung 
            dari sesi fokus yang benar-benar Anda jalani di Focus Room. Hari istirahat diperlakukan secara wajar dan netral.
          </span>
        </div>
      </div>

      {/* Primary Metric Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Total Waktu Fokus</span>
            <Clock size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {summary.formattedTotalFocus}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Dari {summary.validSessionsCount} sesi Pomodoro valid
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Lesson Selesai</span>
            <Award size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {summary.totalCompletedLessons} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>/ {summary.totalLessons}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {summary.overallCourseProgressPercent}% progres roadmap keseluruhan
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Hari Aktif Belajar</span>
            <Calendar size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {summary.activeDaysCount} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>/ {summary.periodDaysCount} hari</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {summary.consistencyRatePercent}% tingkat konsistensi periode
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Rata-rata Hari Aktif</span>
            <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {summary.averageDailyMinutes} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>menit/hari</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Dihitung pada hari di mana Anda fokus
          </div>
        </Card>
      </div>

      {/* Main Bar Chart: Distribusi Waktu Fokus Harian (FR-ANA-01) */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
              Distribusi Durasi Fokus Harian (FR-ANA-01)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Satuan: Menit Fokus Aktual • Periode: {period === '7d' ? '7 Hari Terakhir' : period === '30d' ? '30 Hari Terakhir' : 'Semua Rekaman'}
            </span>
          </div>

          <Badge variant="primary" icon={<BarChart3 size={12} />}>
            Data Aktual
          </Badge>
        </div>

        {summary.totalFocusMinutes === 0 ? (
          <EmptyState
            icon={<BarChart3 size={28} />}
            title="Belum ada durasi fokus pada periode ini"
            description="Mulai sesi belajar pertama Anda di Focus Room untuk melihat grafik distribusi waktu harian."
            action={onNavigate ? {
              label: "Buka Focus Room",
              onClick: () => onNavigate('focus')
            } : undefined}
          />
        ) : (
          <div>
            {/* Responsive Visual Bar Chart Container */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: period === '30d' ? 4 : 12,
              height: 200,
              paddingTop: 24,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-medium)',
              overflowX: 'auto',
            }}>
              {summary.dailyBars.map((bar) => {
                const heightPercent = maxMinutesInBar > 0 
                  ? Math.max(bar.focusMinutes > 0 ? 10 : 3, (bar.focusMinutes / maxMinutesInBar) * 100) 
                  : 3;
                const hasFocus = bar.focusMinutes > 0;

                return (
                  <div
                    key={bar.dateKey}
                    style={{
                      flex: 1,
                      minWidth: period === '30d' ? 18 : 36,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                    title={`${bar.dayLabel}, ${bar.shortDate}: ${bar.focusMinutes} menit (${bar.sessionCount} sesi)`}
                  >
                    {/* Minute label on top for 7d view */}
                    {period === '7d' && hasFocus && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: 4,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {bar.focusMinutes}m
                      </span>
                    )}

                    {/* Bar Pillar */}
                    <div style={{
                      width: '100%',
                      maxWidth: period === '30d' ? 14 : 32,
                      height: `${heightPercent}%`,
                      borderRadius: '4px 4px 0 0',
                      background: hasFocus 
                        ? (bar.isToday ? 'linear-gradient(180deg, var(--accent-cyan) 0%, var(--primary) 100%)' : 'var(--primary)')
                        : 'var(--border-subtle)',
                      opacity: hasFocus ? 1 : 0.4,
                      transition: 'height 0.4s ease, background var(--transition-fast)',
                      cursor: 'pointer',
                    }} />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div style={{
              display: 'flex',
              gap: period === '30d' ? 4 : 12,
              paddingTop: 8,
              overflowX: 'auto',
            }}>
              {summary.dailyBars.map((bar, idx) => (
                <div
                  key={`label-${bar.dateKey}`}
                  style={{
                    flex: 1,
                    minWidth: period === '30d' ? 18 : 36,
                    textAlign: 'center',
                    fontSize: period === '30d' ? '0.625rem' : '0.75rem',
                    color: bar.isToday ? 'var(--primary)' : 'var(--text-tertiary)',
                    fontWeight: bar.isToday ? 700 : 500,
                  }}
                >
                  {period === '7d' ? (
                    <div>
                      <div>{bar.dayLabel}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{bar.shortDate.split(' ')[0]}</div>
                    </div>
                  ) : (
                    // On 30-day view, show label every 5 days
                    (idx % 5 === 0 || bar.isToday) ? bar.shortDate.split(' ')[0] : ''
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Secondary Grid: Pola Jam Belajar & Progres per Course */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Pola Jam Belajar (Time of Day Distribution - FR-ANA-03) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                Pola Jam Fokus Efektif (FR-ANA-03)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Distribusi waktu berdasarkan rentang jam harian
              </span>
            </div>
            <Badge variant="subtle">Konsistensi</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Pagi */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Sunrise size={16} style={{ color: 'var(--accent-amber)' }} />
                  Pagi (05:00 - 12:00)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {summary.timeOfDay.morningMinutes} menit
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalTimeOfDayMinutes > 0 ? (summary.timeOfDay.morningMinutes / totalTimeOfDayMinutes) * 100 : 0}%`,
                  background: 'var(--accent-amber)',
                  borderRadius: 3,
                }} />
              </div>
            </div>

            {/* Siang */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Sun size={16} style={{ color: 'var(--accent-cyan)' }} />
                  Siang (12:00 - 17:00)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {summary.timeOfDay.afternoonMinutes} menit
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalTimeOfDayMinutes > 0 ? (summary.timeOfDay.afternoonMinutes / totalTimeOfDayMinutes) * 100 : 0}%`,
                  background: 'var(--accent-cyan)',
                  borderRadius: 3,
                }} />
              </div>
            </div>

            {/* Malam */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Sunset size={16} style={{ color: 'var(--primary)' }} />
                  Malam (17:00 - 24:00)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {summary.timeOfDay.eveningMinutes} menit
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalTimeOfDayMinutes > 0 ? (summary.timeOfDay.eveningMinutes / totalTimeOfDayMinutes) * 100 : 0}%`,
                  background: 'var(--primary)',
                  borderRadius: 3,
                }} />
              </div>
            </div>

            {/* Dini Hari */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Moon size={16} style={{ color: 'var(--text-tertiary)' }} />
                  Dini Hari (00:00 - 05:00)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {summary.timeOfDay.nightMinutes} menit
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalTimeOfDayMinutes > 0 ? (summary.timeOfDay.nightMinutes / totalTimeOfDayMinutes) * 100 : 0}%`,
                  background: 'var(--text-tertiary)',
                  borderRadius: 3,
                }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Distribusi Waktu & Progres per Course (FR-ANA-02) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                Progres & Waktu per Course (FR-ANA-02)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Perbandingan progres roadmap dan alokasi waktu fokus
              </span>
            </div>
            <Badge variant="emerald">{summary.courses.length} Course</Badge>
          </div>

          {summary.courses.length === 0 ? (
            <div style={{ padding: '24px 0' }}>
              <EmptyState
                icon={<BookOpen size={24} />}
                title="Belum ada roadmap course"
                description="Impor file roadmap JSON di My Learning untuk menghubungkan sesi fokus ke materi course."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {summary.courses.map((c) => (
                <div key={c.courseId} style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {c.courseTitle}
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {c.progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%',
                      width: `${c.progressPercent}%`,
                      background: 'var(--accent-emerald)',
                      borderRadius: 3,
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span>{c.completedLessons} dari {c.totalLessons} lesson selesai</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                      <Clock size={12} /> {c.focusMinutes} menit fokus
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
