import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  Clock, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const CalendarPage: React.FC = () => {
  const [currentDate] = useState(new Date());

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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

        <div style={{ display: 'flex', gap: 8 }}>
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
        <Info size={18} />
        <div>
          <strong style={{ display: 'block', marginBottom: 2 }}>Prinsip Inti: Rencana vs Realisasi (FR-CAL-04 & 05)</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong>Jadwal:</strong> kapan Anda berencana belajar. <strong>Deadline:</strong> target akhir penyelesaian (disimpan terpisah, bukan otomatis jam belajar). 
            <strong>Realisasi:</strong> sesi fokus Pomodoro aktual yang tercatat secara obyektif.
          </span>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Calendar View Card */}
        <Card style={{ padding: 24 }}>
          {/* Calendar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                type="button"
                className="vlt-btn-icon" 
                title="Bulan Sebelumnya"
                onClick={() => alert("Navigasi interaktif kalender akan dihubungkan di Tahap 3: Planning.")}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                type="button"
                className="vlt-btn-icon" 
                title="Bulan Berikutnya"
                onClick={() => alert("Navigasi interaktif kalender akan dihubungkan di Tahap 3: Planning.")}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', marginBottom: 12 }}>
            {daysOfWeek.map((day) => (
              <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid (Visual Foundation Layout) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {Array.from({ length: 31 }, (_, i) => {
              const dayNumber = i + 1;
              const isToday = dayNumber === currentDate.getDate();
              return (
                <div
                  key={dayNumber}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-md)',
                    border: isToday ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: isToday ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--primary)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  title={`Hari ke-${dayNumber}`}
                >
                  {dayNumber}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Date Agenda Details */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Agenda & Target Terjadwal</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Hari ini: {currentDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <Badge variant="subtle">0 Item</Badge>
          </div>

          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title="Tidak ada jadwal maupun deadline"
            description="Jadwal multi-lesson dan deadline mandiri akan dikonfigurasikan di Tahap 3 (Planning)."
          />

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              * Catatan PRD: Menyelesaikan satu jadwal tidak otomatis menandai lesson selesai. Lesson hanya selesai jika pengguna menandainya secara sadar.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
