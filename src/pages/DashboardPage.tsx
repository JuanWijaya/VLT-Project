import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  BookOpen, 
  ArrowRight, 
  Flame, 
  Info,
  Sparkles
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { fetchUserCourses } from '../lib/roadmap/service';
import type { EnrichedCourse } from '../lib/roadmap/types';
import type { NavPage } from '../types';

interface DashboardPageProps {
  onNavigate: (page: NavPage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    fetchUserCourses(user.id)
      .then((data) => {
        if (isMounted) setCourses(data);
      })
      .catch((err) => {
        console.error('[VLT Dashboard] Error loading courses:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCourses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Foundation Phase Notice Banner */}
      <div className="vlt-banner vlt-banner-info">
        <Info size={20} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Tahap 2B: Learning Management Aktif</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Pengelolaan roadmap course dan lesson melalui impor JSON v1.0 telah terhubung ke Supabase dengan perlindungan RLS.
            Sesuai batasan PRD, modul Calendar, Focus Room, dan Analytics akan dihubungkan di tahap selanjutnya.
          </p>
        </div>
      </div>

      {/* Hero Welcome & Quick Stats */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '24px',
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Badge variant="primary" icon={<Sparkles size={12} />}>
              Personal Learning Workspace
            </Badge>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>MVP v1.0</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            Selamat Datang di VLT
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Alur belajar terpadu untuk <strong>Plan</strong> (Roadmap & Jadwal), <strong>Execute</strong> (Focus Pomodoro), 
            dan <strong>Track</strong> (Data Progres Aktual).
          </p>
        </div>

        <button
          onClick={() => onNavigate('learning')}
          className="vlt-btn vlt-btn-primary"
          style={{ padding: '12px 22px', fontSize: '0.9375rem' }}
        >
          <BookOpen size={18} />
          <span>Buka My Learning</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Main Grid: Prioritas Harian & Jadwal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Prioritas Harian (FR-DASH-01, FR-DASH-06) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-amber-subtle)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Flame size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Prioritas Hari Ini</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>FR-DASH-01 • Rumus Skor Deterministik</span>
              </div>
            </div>
            <Badge variant="subtle">0/0 Selesai</Badge>
          </div>

          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title="Belum ada prioritas aktif"
            description="Prioritas belajar dihitung otomatis di Tahap 3 (Planning) berdasarkan jadwal hari ini, deadline mendekat, dan status lesson."
            action={{
              label: "Buka My Learning",
              onClick: () => onNavigate('learning')
            }}
          />
        </Card>

        {/* Jadwal & Deadline Terdekat (FR-DASH-02) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
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
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Jadwal & Deadline Terdekat</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>FR-DASH-02 • Rencana vs Target</span>
              </div>
            </div>
            <Badge variant="subtle">Agenda</Badge>
          </div>

          <EmptyState
            icon={<Calendar size={24} />}
            title="Tidak ada jadwal hari ini"
            description="Jadwal belajar dan target deadline disimpan terpisah untuk menjaga kejelasan antara rencana dan komitmen."
            action={{
              label: "Atur di Calendar",
              onClick: () => onNavigate('calendar')
            }}
          />
        </Card>
      </div>

      {/* Secondary Grid: Progres Course & Waktu Fokus */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Ringkasan Progres Course (FR-DASH-03) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-emerald-subtle)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BookOpen size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Roadmap Course Aktif</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>FR-DASH-03 • Berdasarkan Lesson Selesai</span>
              </div>
            </div>
            <Badge variant="emerald">{courses.length} Course</Badge>
          </div>

          {loadingCourses ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              Memuat data course...
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={24} />}
              title="Belum ada course terdaftar"
              description="Course baru hanya dibuat via impor file JSON roadmap berversi 1.0 (tidak ada form manual)."
              action={{
                label: "Impor Roadmap",
                onClick: () => onNavigate('learning')
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {courses.slice(0, 3).map((c) => (
                <div key={c.id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {c.completedLessons} dari {c.totalLessons} lesson selesai
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>
                      {c.progressPercentage}%
                    </span>
                  </div>
                </div>
              ))}

              <button
                onClick={() => onNavigate('learning')}
                className="vlt-btn vlt-btn-subtle vlt-btn-sm"
                style={{ width: '100%', marginTop: 4 }}
              >
                <span>Lihat Seluruh Roadmap ({courses.length})</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </Card>

        {/* Ringkasan Waktu Fokus Terbaru (FR-DASH-04) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-cyan-subtle)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Waktu Fokus Hari Ini</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>FR-DASH-04 • Durasi Aktual Bersih</span>
              </div>
            </div>
            <Badge variant="subtle">0m Tercatat</Badge>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px 20px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              0 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>menit</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Hanya durasi fokus nyata yang dihitung. Waktu istirahat dan jeda tidak dimasukkan ke total.
            </p>
            <button 
              onClick={() => onNavigate('focus')}
              className="vlt-btn vlt-btn-secondary vlt-btn-sm" 
              style={{ marginTop: 14 }}
            >
              Masuk ke Focus Room
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
