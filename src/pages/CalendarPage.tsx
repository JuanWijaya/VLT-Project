import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  Clock, 
  CheckCircle2,
  Circle,
  Plus,
  Info,
  Trash2,
  Edit2,
  BookOpen,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { 
  fetchSchedules, 
  fetchDeadlines, 
  createSchedule, 
  updateSchedule, 
  deleteSchedule,
  createDeadline,
  updateDeadline,
  deleteDeadline,
  fetchCoursesWithLessons,
  formatDateToLocalKey,
  formatTimeLocal,
  type CourseOption
} from '../lib/calendar/service';
import type { 
  ScheduleItem, 
  DeadlineItem, 
  CreateScheduleInput, 
  CreateDeadlineInput,
  ScheduleStatus,
  DeadlineStatus
} from '../types/calendar';
import { ScheduleModal } from '../components/calendar/ScheduleModal';
import { DeadlineModal } from '../components/calendar/DeadlineModal';

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();

  // Navigation state (month & year)
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  // Selected date key (YYYY-MM-DD)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateToLocalKey(new Date()));

  // Data state
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active filter tab for agenda
  const [activeFilter, setActiveFilter] = useState<'all' | 'schedules' | 'deadlines'>('all');

  // Modal states
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineItem | null>(null);

  // Deletion confirmation state
  const [deletingItem, setDeletingItem] = useState<{
    type: 'schedule' | 'deadline';
    id: string;
    title: string;
  } | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Load data
  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedSchedules, fetchedDeadlines, fetchedCourses] = await Promise.all([
        fetchSchedules(user.id),
        fetchDeadlines(user.id),
        fetchCoursesWithLessons(user.id),
      ]);
      setSchedules(fetchedSchedules);
      setDeadlines(fetchedDeadlines);
      setCourseOptions(fetchedCourses);
    } catch (err) {
      console.error('[CalendarPage] Gagal memuat data kalender:', err);
      setError('Gagal memuat jadwal & deadline. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate month
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(formatDateToLocalKey(today));
  };

  // Maps of dateKey -> items for fast lookups
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    schedules.forEach((item) => {
      const dateKey = formatDateToLocalKey(new Date(item.startTime));
      const list = map.get(dateKey) || [];
      list.push(item);
      map.set(dateKey, list);
    });
    return map;
  }, [schedules]);

  const deadlineMap = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    deadlines.forEach((item) => {
      const dateKey = formatDateToLocalKey(new Date(item.dueDate));
      const list = map.get(dateKey) || [];
      list.push(item);
      map.set(dateKey, list);
    });
    return map;
  }, [deadlines]);

  // Calendar matrix calculation (Monday start)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6; // Sunday becomes 6

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasSchedule: boolean;
      hasDeadline: boolean;
    }> = [];

    const todayKey = formatDateToLocalKey(new Date());

    // Previous month filler
    for (let i = startingDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, day);
      const dateKey = formatDateToLocalKey(prevDate);
      cells.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDateKey,
        hasSchedule: (scheduleMap.get(dateKey)?.length || 0) > 0,
        hasDeadline: (deadlineMap.get(dateKey)?.length || 0) > 0,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(currentYear, currentMonth, day);
      const dateKey = formatDateToLocalKey(thisDate);
      cells.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDateKey,
        hasSchedule: (scheduleMap.get(dateKey)?.length || 0) > 0,
        hasDeadline: (deadlineMap.get(dateKey)?.length || 0) > 0,
      });
    }

    // Next month filler to make 35 or 42 cells (5 or 6 rows)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      const dateKey = formatDateToLocalKey(nextDate);
      cells.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDateKey,
        hasSchedule: (scheduleMap.get(dateKey)?.length || 0) > 0,
        hasDeadline: (deadlineMap.get(dateKey)?.length || 0) > 0,
      });
    }

    return cells;
  }, [currentYear, currentMonth, selectedDateKey, scheduleMap, deadlineMap]);

  // Selected date's schedules & deadlines
  const selectedSchedules = useMemo(() => {
    return scheduleMap.get(selectedDateKey) || [];
  }, [scheduleMap, selectedDateKey]);

  const selectedDeadlines = useMemo(() => {
    return deadlineMap.get(selectedDateKey) || [];
  }, [deadlineMap, selectedDateKey]);

  // Human readable selected date header
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDateKey.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDateKey;
    }
  }, [selectedDateKey]);

  // Handlers for Schedule operations
  const handleScheduleSubmit = async (
    input: CreateScheduleInput & { status?: ScheduleStatus },
    scheduleId?: string
  ) => {
    if (!user) return;
    if (scheduleId) {
      await updateSchedule(user.id, scheduleId, input);
    } else {
      await createSchedule(user.id, input);
    }
    await loadData();
  };

  const handleToggleScheduleStatus = async (item: ScheduleItem) => {
    if (!user) return;
    const newStatus: ScheduleStatus = item.status === 'completed' ? 'scheduled' : 'completed';
    // Optimistic update
    setSchedules(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus } : s));
    try {
      await updateSchedule(user.id, item.id, { status: newStatus });
    } catch (err) {
      console.error('[CalendarPage] Gagal memperbarui status schedule:', err);
      await loadData();
    }
  };

  // Handlers for Deadline operations
  const handleDeadlineSubmit = async (
    input: CreateDeadlineInput & { status?: DeadlineStatus },
    deadlineId?: string
  ) => {
    if (!user) return;
    if (deadlineId) {
      await updateDeadline(user.id, deadlineId, input);
    } else {
      await createDeadline(user.id, input);
    }
    await loadData();
  };

  const handleToggleDeadlineStatus = async (item: DeadlineItem) => {
    if (!user) return;
    const newStatus: DeadlineStatus = item.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setDeadlines(prev => prev.map(d => d.id === item.id ? { ...d, status: newStatus } : d));
    try {
      await updateDeadline(user.id, item.id, { status: newStatus });
    } catch (err) {
      console.error('[CalendarPage] Gagal memperbarui status deadline:', err);
      await loadData();
    }
  };

  // Deletion confirm execution
  const executeDelete = async () => {
    if (!user || !deletingItem) return;
    try {
      if (deletingItem.type === 'schedule') {
        await deleteSchedule(user.id, deletingItem.id);
      } else {
        await deleteDeadline(user.id, deletingItem.id);
      }
      setDeletingItem(null);
      await loadData();
    } catch (err) {
      console.error('[CalendarPage] Gagal menghapus agenda:', err);
      alert('Gagal menghapus item.');
    }
  };

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
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Calendar & Planning</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Perencanaan jadwal belajar dan pemisahan tegas antara target deadline dan aktivitas aktual.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="vlt-btn vlt-btn-secondary"
            onClick={loadData}
            title="Muat ulang data kalender"
            style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'vlt-spin' : ''} />
            <span>Sinkron</span>
          </button>
          <Badge variant="primary" icon={<CalendarIcon size={12} />}>
            Rencana
          </Badge>
          <Badge variant="rose" icon={<Target size={12} />}>
            Deadline
          </Badge>
          <Badge variant="emerald" icon={<Clock size={12} />}>
            Realisasi
          </Badge>
        </div>
      </div>

      {/* Distinction Rules Banner (FR-CAL-04 & FR-CAL-05) */}
      <div className="vlt-banner vlt-banner-info">
        <Info size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ display: 'block', marginBottom: 2 }}>Prinsip Inti: Rencana vs Realisasi (FR-CAL-04 & 05)</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong>Jadwal:</strong> kapan Anda berencana belajar. <strong>Deadline:</strong> target batas waktu akhir (disimpan terpisah, bukan durasi belajar). 
            Menandai jadwal atau deadline selesai <em>tidak otomatis</em> mengubah status lesson di roadmap menjadi selesai.
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#ef4444',
          fontSize: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="vlt-btn vlt-btn-secondary"
            onClick={loadData}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Main Grid: Calendar Card (Left) & Agenda Panel (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Calendar View Card */}
        <Card style={{ padding: 24 }}>
          {/* Calendar Header with Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Klik tanggal untuk melihat dan menambah agenda
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="vlt-btn vlt-btn-secondary"
                onClick={handleGoToToday}
                style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: 4 }}
              >
                Hari Ini
              </button>
              <button 
                type="button"
                className="vlt-btn-icon" 
                title="Bulan Sebelumnya"
                onClick={handlePrevMonth}
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                type="button"
                className="vlt-btn-icon" 
                title="Bulan Berikutnya"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', marginBottom: 12 }}>
            {daysOfWeek.map((day) => (
              <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Interactive Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {calendarCells.map((cell) => {
              const { dayNumber, dateKey, isCurrentMonth, isToday, isSelected, hasSchedule, hasDeadline } = cell;

              let border = '1px solid var(--border-subtle)';
              let bg = 'var(--bg-surface)';
              let textColor = isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)';

              if (isSelected) {
                border = '2px solid var(--primary)';
                bg = 'var(--primary-subtle)';
                textColor = 'var(--primary)';
              } else if (isToday) {
                border = '2px solid var(--accent-cyan, #0284c7)';
              }

              return (
                <button
                  type="button"
                  key={dateKey}
                  onClick={() => setSelectedDateKey(dateKey)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-md)',
                    border,
                    background: bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: isToday || isSelected ? 700 : 500,
                    color: textColor,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all var(--transition-fast)',
                    padding: 4,
                  }}
                  title={`Pilih tanggal ${dateKey}`}
                >
                  <span>{dayNumber}</span>
                  
                  {/* Indicators for schedules & deadlines */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, height: 5, alignItems: 'center' }}>
                    {hasSchedule && (
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'inline-block',
                        }}
                        title="Ada jadwal aktivitas"
                      />
                    )}
                    {hasDeadline && (
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: 'var(--accent-rose, #f43f5e)',
                          display: 'inline-block',
                        }}
                        title="Ada target deadline"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
              <span>Jadwal Aktivitas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-rose, #f43f5e)' }} />
              <span>Target Deadline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, border: '2px solid var(--accent-cyan, #0284c7)' }} />
              <span>Hari Ini</span>
            </div>
          </div>
        </Card>

        {/* Selected Date Agenda Details (Right Panel) */}
        <Card style={{ display: 'flex', flexDirection: 'column', padding: 24, minHeight: 460 }}>
          {/* Agenda Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                Agenda & Target
              </h3>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {formattedSelectedDate}
              </span>
            </div>

            {/* Quick Add Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="vlt-btn vlt-btn-secondary"
                onClick={() => {
                  setEditingDeadline(null);
                  setDeadlineModalOpen(true);
                }}
                style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--accent-rose, #f43f5e)' }}
                title="Tambah Target Deadline pada tanggal ini"
              >
                <Plus size={14} />
                <span>+ Deadline</span>
              </button>
              <button
                type="button"
                className="vlt-btn vlt-btn-primary"
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleModalOpen(true);
                }}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                title="Tambah Jadwal Belajar pada tanggal ini"
              >
                <Plus size={14} />
                <span>+ Jadwal</span>
              </button>
            </div>
          </div>

          {/* Agenda Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: 6,
            background: 'var(--bg-subtle)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
          }}>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeFilter === 'all' ? 'var(--bg-surface)' : 'transparent',
                color: activeFilter === 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: activeFilter === 'all' ? 600 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: activeFilter === 'all' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Semua ({selectedSchedules.length + selectedDeadlines.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('schedules')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeFilter === 'schedules' ? 'var(--bg-surface)' : 'transparent',
                color: activeFilter === 'schedules' ? 'var(--primary)' : 'var(--text-tertiary)',
                fontWeight: activeFilter === 'schedules' ? 600 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: activeFilter === 'schedules' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Jadwal ({selectedSchedules.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('deadlines')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeFilter === 'deadlines' ? 'var(--bg-surface)' : 'transparent',
                color: activeFilter === 'deadlines' ? 'var(--accent-rose, #f43f5e)' : 'var(--text-tertiary)',
                fontWeight: activeFilter === 'deadlines' ? 600 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: activeFilter === 'deadlines' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Deadline ({selectedDeadlines.length})
            </button>
          </div>

          {/* Agenda Items List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* When Empty */}
            {((activeFilter === 'all' && selectedSchedules.length === 0 && selectedDeadlines.length === 0) ||
              (activeFilter === 'schedules' && selectedSchedules.length === 0) ||
              (activeFilter === 'deadlines' && selectedDeadlines.length === 0)) && (
              <div style={{ margin: 'auto 0', padding: '32px 16px' }}>
                <EmptyState
                  icon={<CalendarIcon size={28} />}
                  title="Tidak ada agenda pada tanggal ini"
                  description="Gunakan tombol di atas untuk merencanakan sesi belajar atau menetapkan target deadline."
                />
              </div>
            )}

            {/* Schedules Section */}
            {(activeFilter === 'all' || activeFilter === 'schedules') && selectedSchedules.map((item) => {
              const isCompleted = item.status === 'completed';
              const startTimeStr = formatTimeLocal(item.startTime);
              const endTimeStr = formatTimeLocal(item.endTime);

              return (
                <div
                  key={`schedule-${item.id}`}
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    background: isCompleted ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    borderLeft: '4px solid var(--primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all var(--transition-fast)',
                    opacity: isCompleted ? 0.8 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleScheduleStatus(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: isCompleted ? '#10b981' : 'var(--text-tertiary)',
                          marginTop: 2,
                        }}
                        title={isCompleted ? 'Tandai belum selesai' : 'Tandai jadwal selesai'}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}>
                            {item.title}
                          </span>
                          <Badge variant="primary">Jadwal Belajar</Badge>
                          {isCompleted && <Badge variant="emerald">Selesai</Badge>}
                          {item.status === 'cancelled' && <Badge variant="subtle">Dibatalkan</Badge>}
                        </div>

                        {item.description && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="vlt-btn-icon"
                        onClick={() => {
                          setEditingSchedule(item);
                          setScheduleModalOpen(true);
                        }}
                        title="Edit Jadwal"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="vlt-btn-icon"
                        onClick={() => setDeletingItem({ type: 'schedule', id: item.id, title: item.title })}
                        title="Hapus Jadwal"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Meta: Time & Course/Lesson badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} style={{ color: 'var(--primary)' }} />
                      <span>{startTimeStr} - {endTimeStr}</span>
                    </div>

                    {(item.courseTitle || item.lessonTitle) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={13} style={{ color: 'var(--text-secondary)' }} />
                        <span>
                          {item.courseTitle}
                          {item.lessonTitle ? ` • ${item.lessonTitle}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Deadlines Section */}
            {(activeFilter === 'all' || activeFilter === 'deadlines') && selectedDeadlines.map((item) => {
              const isCompleted = item.status === 'completed';
              const dueTimeStr = formatTimeLocal(item.dueDate);

              return (
                <div
                  key={`deadline-${item.id}`}
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    background: isCompleted ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    borderLeft: '4px solid var(--accent-rose, #f43f5e)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all var(--transition-fast)',
                    opacity: isCompleted ? 0.8 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleDeadlineStatus(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: isCompleted ? '#10b981' : 'var(--text-tertiary)',
                          marginTop: 2,
                        }}
                        title={isCompleted ? 'Tandai deadline belum tercapai' : 'Tandai deadline selesai'}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}>
                            {item.title}
                          </span>
                          <Badge variant="rose">Target Deadline</Badge>
                          {isCompleted ? (
                            <Badge variant="emerald">Tercapai</Badge>
                          ) : (
                            <Badge variant="subtle">Tertunda</Badge>
                          )}
                        </div>

                        {item.description && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="vlt-btn-icon"
                        onClick={() => {
                          setEditingDeadline(item);
                          setDeadlineModalOpen(true);
                        }}
                        title="Edit Target Deadline"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="vlt-btn-icon"
                        onClick={() => setDeletingItem({ type: 'deadline', id: item.id, title: item.title })}
                        title="Hapus Target Deadline"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Meta: Due Time & Course/Lesson badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Target size={13} style={{ color: 'var(--accent-rose, #f43f5e)' }} />
                      <span>Batas: {dueTimeStr || '23:59'}</span>
                    </div>

                    {(item.courseTitle || item.lessonTitle) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={13} style={{ color: 'var(--text-secondary)' }} />
                        <span>
                          {item.courseTitle}
                          {item.lessonTitle ? ` • ${item.lessonTitle}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              * Catatan PRD: Menyelesaikan jadwal atau deadline tidak otomatis menandai lesson selesai. Lesson hanya selesai jika pengguna menandainya secara sadar di My Learning.
            </div>
          </div>
        </Card>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        onSubmit={handleScheduleSubmit}
        initialSchedule={editingSchedule}
        defaultDate={selectedDateKey}
        courseOptions={courseOptions}
      />

      {/* Deadline Modal */}
      <DeadlineModal
        isOpen={deadlineModalOpen}
        onClose={() => {
          setDeadlineModalOpen(false);
          setEditingDeadline(null);
        }}
        onSubmit={handleDeadlineSubmit}
        initialDeadline={editingDeadline}
        defaultDate={selectedDateKey}
        courseOptions={courseOptions}
      />

      {/* Deletion Confirmation Dialog */}
      {deletingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: 420,
            width: '100%',
            padding: 24,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                <AlertCircle size={20} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Konfirmasi Hapus
                </h4>
              </div>
              <button
                type="button"
                className="vlt-btn-icon"
                onClick={() => setDeletingItem(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus {deletingItem.type === 'schedule' ? 'jadwal' : 'target deadline'} <strong>"{deletingItem.title}"</strong>?
              <br />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Tindakan ini tidak akan menghapus course, lesson, maupun riwayat belajar Anda.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="vlt-btn vlt-btn-secondary"
                onClick={() => setDeletingItem(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="vlt-btn vlt-btn-primary"
                onClick={executeDelete}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
