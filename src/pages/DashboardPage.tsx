import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  BookOpen, 
  ArrowRight, 
  Flame, 
  Sparkles,
  Target,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Play
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchUserCourses } from '../lib/roadmap/service';
import { fetchSchedules, fetchDeadlines, formatTimeLocal, formatDateToLocalKey } from '../lib/calendar/service';
import { 
  evaluateLessonPriority, 
  sortPrioritiesWithManualOrder, 
  getStoredManualOrder, 
  saveStoredManualOrder, 
  clearStoredManualOrder,
  type LessonForPriority 
} from '../lib/priorities/service';
import type { DailyPriorityItem } from '../types/priorities';
import type { EnrichedCourse } from '../lib/roadmap/types';
import type { ScheduleItem, DeadlineItem } from '../types/calendar';
import type { NavPage } from '../types';

interface DashboardPageProps {
  onNavigate: (page: NavPage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(true);

  // Daily Priorities state
  const [priorityItems, setPriorityItems] = useState<DailyPriorityItem[]>([]);
  const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);

  // Today Focus Stats state
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(0);
  const [todaySessionCount, setTodaySessionCount] = useState<number>(0);

  const todayKey = formatDateToLocalKey(new Date());

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    // Load manual order from localStorage
    const storedOrder = getStoredManualOrder(user.id);
    if (storedOrder) setManualOrderIds(storedOrder);

    Promise.all([
      fetchUserCourses(user.id),
      fetchSchedules(user.id),
      fetchDeadlines(user.id),
      // Fetch lessons for priority evaluation
      supabase.from('lessons').select('id, course_id, title, status, updated_at').eq('user_id', user.id),
      // Fetch study sessions for today's focus metrics
      supabase.from('study_sessions').select('mode, status, actual_duration_seconds, start_time').eq('user_id', user.id),
    ])
      .then(([coursesData, schedulesData, deadlinesData, lessonsRes, sessionsRes]) => {
        if (!isMounted) return;

        setCourses(coursesData);
        setSchedules(schedulesData);
        setDeadlines(deadlinesData);

        // 1. Process Lessons into Priority Items
        const courseTitleMap = new Map<string, string>();
        coursesData.forEach((c) => courseTitleMap.set(c.id, c.title));

        const rawLessons = lessonsRes.data || [];
        const lessonsForPriority: LessonForPriority[] = rawLessons.map((l: any) => ({
          id: l.id,
          courseId: l.course_id,
          courseTitle: courseTitleMap.get(l.course_id) || 'Course',
          title: l.title,
          status: l.status,
          updatedAt: l.updated_at,
        }));

        const now = new Date();
        const evaluated: DailyPriorityItem[] = [];
        for (const l of lessonsForPriority) {
          const item = evaluateLessonPriority(l, schedulesData, deadlinesData, now);
          if (item) evaluated.push(item);
        }

        const sorted = sortPrioritiesWithManualOrder(evaluated, storedOrder);
        setPriorityItems(sorted);

        // 2. Process Today's Focus Metrics
        let sessions = sessionsRes.data || [];
        if (!sessions || sessions.length === 0) {
          try {
            const raw = localStorage.getItem(`vlt-focus-sessions-${user.id}`);
            if (raw) sessions = JSON.parse(raw);
          } catch {}
        }

        let todaySecs = 0;
        let todayCount = 0;
        (sessions || []).forEach((s: any) => {
          if (s.mode === 'work' && s.status !== 'cancelled' && s.actual_duration_seconds > 0) {
            const dateKey = formatDateToLocalKey(new Date(s.start_time));
            if (dateKey === todayKey) {
              todaySecs += s.actual_duration_seconds;
              todayCount += 1;
            }
          }
        });

        setTodayFocusMinutes(Math.round(todaySecs / 60));
        setTodaySessionCount(todayCount);
      })
      .catch((err) => {
        console.error('[VLT Dashboard] Error loading dashboard data:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCourses(false);
          setLoadingCalendar(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, todayKey]);

  // Reordering handlers for Daily Priorities
  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    if (!user) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= priorityItems.length) return;

    const newItems = [...priorityItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const newOrderIds = newItems.map((item) => item.id);
    setPriorityItems(newItems);
    setManualOrderIds(newOrderIds);
    saveStoredManualOrder(user.id, newOrderIds);
  };

  const handleResetManualOrder = () => {
    if (!user) return;
    clearStoredManualOrder(user.id);
    setManualOrderIds(null);
    const sorted = sortPrioritiesWithManualOrder(priorityItems, null);
    setPriorityItems(sorted);
  };

  // Today key and upcoming calendar items
  const todaySchedules = schedules.filter(s => formatDateToLocalKey(new Date(s.startTime)) === todayKey);
  const upcomingDeadlines = deadlines.filter(d => d.status === 'pending').slice(0, 3);
  const activeItemsCount = todaySchedules.length + upcomingDeadlines.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
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
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            Selamat Datang di VLT
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Alur belajar terpadu untuk Plan, Execute, dan Track.
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
        {/* Prioritas Harian (FR-DASH-01, FR-DASH-06 & PRD 14.2) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
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
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Prioritas Hari Ini</h3>
                {manualOrderIds && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Urutan Manual (Kustom)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {manualOrderIds && (
                <button
                  type="button"
                  onClick={handleResetManualOrder}
                  className="vlt-btn vlt-btn-subtle vlt-btn-sm"
                  style={{ fontSize: '0.6875rem', padding: '2px 8px' }}
                  title="Kembalikan ke urutan rekomendasi skor otomatis"
                >
                  <RotateCcw size={11} />
                  <span>Reset Urutan</span>
                </button>
              )}
              <Badge variant={priorityItems.length > 0 ? "amber" : "subtle"}>
                {priorityItems.length} Aktif
              </Badge>
            </div>
          </div>

          {priorityItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={24} />}
              title="Semua materi aktif telah selesai"
              description="Tidak ada materi berstatus sedang dipelajari atau belum dimulai. Impor roadmap baru di My Learning untuk melanjutkan belajar."
              action={{
                label: "Buka My Learning",
                onClick: () => onNavigate('learning')
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {priorityItems.slice(0, 5).map((item, idx) => (
                <div
                  key={`prio-${item.id}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `4px solid ${item.scores.totalScore >= 60 ? 'var(--accent-amber)' : 'var(--primary)'}`,
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  {/* Reorder Buttons (PRD 14.2) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMovePriority(idx, 'up')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 1,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        color: idx === 0 ? 'var(--border-medium)' : 'var(--text-tertiary)',
                        lineHeight: 1,
                      }}
                      title="Geser Prioritas Naik"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === priorityItems.length - 1}
                      onClick={() => handleMovePriority(idx, 'down')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 1,
                        cursor: idx === priorityItems.length - 1 ? 'not-allowed' : 'pointer',
                        color: idx === priorityItems.length - 1 ? 'var(--border-medium)' : 'var(--text-tertiary)',
                        lineHeight: 1,
                      }}
                      title="Geser Prioritas Turun"
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>

                  {/* Lesson Info & Badges */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 240,
                      }}>
                        {item.lessonTitle}
                      </span>

                      {item.urgencyLabel && (
                        <Badge 
                          variant={item.closestDeadline?.isOverdue ? 'rose' : item.hasScheduleToday ? 'primary' : 'amber'}
                          style={{ fontSize: '0.6875rem', padding: '1px 6px' }}
                        >
                          {item.urgencyLabel}
                        </Badge>
                      )}

                      <Badge variant="subtle" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                        {item.status === 'in_progress' ? 'Sedang Dipelajari' : 'Belum Dimulai'}
                      </Badge>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      📚 {item.courseTitle} • Skor: <strong>{item.scores.totalScore} pts</strong>
                      <span style={{ marginLeft: 6, fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                        (D:{item.scores.scoreDeadline} J:{item.scores.scoreSchedule} S:{item.scores.scoreStatus})
                      </span>
                    </div>
                  </div>

                  {/* Quick Action: Focus Room */}
                  <button
                    type="button"
                    onClick={() => onNavigate('focus')}
                    className="vlt-btn vlt-btn-secondary vlt-btn-sm"
                    style={{ fontSize: '0.75rem', padding: '5px 10px', flexShrink: 0 }}
                    title="Mulai Sesi Fokus untuk materi ini"
                  >
                    <Play size={12} />
                    <span>Fokus</span>
                  </button>
                </div>
              ))}

              {priorityItems.length > 5 && (
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  +{priorityItems.length - 5} materi aktif lainnya dalam prioritas
                </div>
              )}
            </div>
          )}
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
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Jadwal & Deadline Terdekat</h3>
              </div>
            </div>
            <Badge variant={activeItemsCount > 0 ? "primary" : "subtle"}>
              {activeItemsCount} Item
            </Badge>
          </div>

          {loadingCalendar ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              Memuat agenda...
            </div>
          ) : activeItemsCount === 0 ? (
            <EmptyState
              icon={<Calendar size={24} />}
              title="Tidak ada jadwal hari ini"
              description="Jadwal belajar dan target deadline disimpan terpisah untuk menjaga kejelasan antara rencana dan komitmen."
              action={{
                label: "Atur di Calendar",
                onClick: () => onNavigate('calendar')
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Schedules */}
              {todaySchedules.map((s) => (
                <div
                  key={`dash-s-${s.id}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '3px solid var(--primary)',
                    background: s.status === 'completed' ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: s.status === 'completed' ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {s.title}
                      </span>
                      <Badge variant="primary" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                        Jadwal
                      </Badge>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {formatTimeLocal(s.startTime)} - {formatTimeLocal(s.endTime)}
                      {s.courseTitle ? ` • ${s.courseTitle}` : ''}
                    </span>
                  </div>
                  {s.status === 'completed' ? (
                    <Badge variant="emerald" style={{ fontSize: '0.6875rem' }}>Selesai</Badge>
                  ) : (
                    <Badge variant="subtle" style={{ fontSize: '0.6875rem' }}>Hari Ini</Badge>
                  )}
                </div>
              ))}

              {/* Deadlines */}
              {upcomingDeadlines.map((d) => (
                <div
                  key={`dash-d-${d.id}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '3px solid var(--accent-rose, #f43f5e)',
                    background: d.status === 'completed' ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {d.title}
                      </span>
                      <Badge variant="rose" icon={<Target size={10} />} style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                        Deadline
                      </Badge>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Batas: {formatDateToLocalKey(new Date(d.dueDate))} {formatTimeLocal(d.dueDate)}
                      {d.courseTitle ? ` • ${d.courseTitle}` : ''}
                    </span>
                  </div>
                  <Badge variant="subtle" style={{ fontSize: '0.6875rem', color: 'var(--accent-rose, #f43f5e)' }}>
                    Target
                  </Badge>
                </div>
              ))}

              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="vlt-btn vlt-btn-secondary"
                style={{ marginTop: 4, width: '100%', fontSize: '0.75rem', padding: '6px 12px', justifyContent: 'center' }}
              >
                <span>Buka Kalender Lengkap</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Secondary Grid: Progres Course & Waktu Fokus Hari Ini */}
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
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Roadmap Course Aktif</h3>
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

        {/* Ringkasan Waktu Fokus Hari Ini Aktual (FR-DASH-04) */}
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
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Waktu Fokus Hari Ini</h3>
              </div>
            </div>
            <Badge variant={todayFocusMinutes > 0 ? "primary" : "subtle"}>
              {todayFocusMinutes}m Tercatat
            </Badge>
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
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {todayFocusMinutes} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>menit</span>
            </div>
            {todaySessionCount === 0 && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Belum ada sesi fokus yang tercatat hari ini. Mulai sesi Pomodoro pertama Anda di Focus Room.
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button 
                onClick={() => onNavigate('focus')}
                className="vlt-btn vlt-btn-primary vlt-btn-sm" 
              >
                <Play size={14} />
                <span>Masuk ke Focus Room</span>
              </button>
              <button 
                onClick={() => onNavigate('analytics')}
                className="vlt-btn vlt-btn-secondary vlt-btn-sm" 
              >
                <span>Lihat Analitik Lengkap</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
