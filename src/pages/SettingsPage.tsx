import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Clock, 
  Download, 
  ShieldCheck, 
  Check, 
  Database
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../types';

export const SettingsPage: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Pomodoro local preference state
  const [workMinutes, setWorkMinutes] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('vlt-work-duration');
      return stored ? parseInt(stored, 10) : 25;
    } catch {
      return 25;
    }
  });

  const [breakMinutes, setBreakMinutes] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('vlt-break-duration');
      return stored ? parseInt(stored, 10) : 5;
    } catch {
      return 5;
    }
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveTimerPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('vlt-work-duration', workMinutes.toString());
      localStorage.setItem('vlt-break-duration', breakMinutes.toString());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const themeOptions: Array<{ id: ThemeMode; label: string; icon: React.ElementType; desc: string }> = [
    { id: 'light', label: 'Terang (Light)', icon: Sun, desc: 'Latar belakang cerah dan kontras tajam' },
    { id: 'dark', label: 'Gelap (Dark)', icon: Moon, desc: 'Warna gelap elegan dan ramah di mata' },
    { id: 'system', label: 'Sistem (Auto)', icon: Monitor, desc: 'Mengikuti preferensi sistem operasi perangkat' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>
      {/* Header Info */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Pengaturan & Preferensi</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kelola tampilan tema, preferensi timer belajar, dan mekanisme cadangan data VLT.
          </p>
        </div>

        <Badge variant="primary" icon={<ShieldCheck size={13} />}>
          Konfigurasi Lokal
        </Badge>
      </div>

      {/* Tema Tampilan (FR-SET-01) */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 4 }}>
            Tema Antarmuka (FR-SET-01)
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Preferensi tema disimpan secara lokal di browser dan diterapkan langsung tanpa perlu reload.
            Saat ini aktif: <strong>{resolvedTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</strong>.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-subtle)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={18} />
                  </div>
                  {isSelected && (
                    <Badge variant="primary" icon={<Check size={12} />}>
                      Aktif
                    </Badge>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  {opt.desc}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Preferensi Pomodoro (FR-SET-02) */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Clock size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Preferensi Default Pomodoro (FR-SET-02)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Atur durasi default sesi fokus dan waktu jeda</span>
          </div>
        </div>

        <form onSubmit={handleSaveTimerPreferences}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                Durasi Fokus (Menit)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                Durasi Istirahat Singkat (Menit)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" className="vlt-btn vlt-btn-primary vlt-btn-sm">
              Simpan Preferensi
            </button>
            {saveSuccess && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} /> Preferensi tersimpan di localStorage!
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Ekspor & Backup (FR-SET-04) */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Download size={20} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Ekspor & Backup Data (FR-SET-04)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Mencegah kehilangan data sesuai Prinsip Produk #1</span>
          </div>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Pengguna memegang kendali penuh atas data belajarnya. Seluruh riwayat sesi fokus, catatan course, 
          dan agenda dapat diekspor dalam format terstandar. Modul ekspor menyeluruh akan dihubungkan pada Tahap 5 (Analytics & Stabilitas).
        </p>

        <button 
          type="button" 
          className="vlt-btn vlt-btn-secondary vlt-btn-sm"
          onClick={() => alert("Fitur ekspor data akan aktif setelah data tersimpan terhubung di fase database.")}
        >
          <Download size={14} />
          <span>Ekspor Data JSON (Tahap 5)</span>
        </button>
      </Card>

      {/* Status Arsitektur Fondasi */}
      <Card style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Database size={18} style={{ color: 'var(--text-secondary)' }} />
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Status Tahapan Rilis (PRD Bagian 11)</h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
            <strong>Tahap 1 — Fondasi:</strong> UI responsif, Navigasi (6 Halaman), Light/Dark theme, TypeScript aman (Sedang Berjalan).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-medium)' }} />
            <span>Tahap 2 — Learning Management:</span> Parser roadmap v1.0, preview & merge, status & progres.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-medium)' }} />
            <span>Tahap 3 — Planning:</span> Kalender, jadwal multi-lesson, deadline terpisah, prioritas harian.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-medium)' }} />
            <span>Tahap 4 — Focus Tracking:</span> Pomodoro recovery, checkpoint anti-crash, riwayat sesi.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-medium)' }} />
            <span>Tahap 5 — Analytics & Stabilitas:</span> Grafik metrik, validasi, ekspor & backup.
          </div>
        </div>
      </Card>
    </div>
  );
};
