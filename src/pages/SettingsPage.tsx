import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Clock, 
  Download, 
  Upload,
  ShieldCheck, 
  Check, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { generateUserBackup, triggerBackupDownload } from '../lib/backup/service';
import { RestoreModal } from '../components/backup/RestoreModal';
import type { ThemeMode } from '../types';

export const SettingsPage: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();

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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);

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

  const handleExportBackup = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const backup = await generateUserBackup(user.id);
      triggerBackupDownload(backup);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('[SettingsPage] Gagal membuat backup:', err);
      alert('Gagal mengekspor data backup.');
    } finally {
      setIsExporting(false);
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
          Konfigurasi Personal
        </Badge>
      </div>

      {/* Tema Tampilan */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 4 }}>
            Tema Antarmuka
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

      {/* Preferensi Pomodoro */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Clock size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Preferensi Default Pomodoro</h3>
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

      {/* Ekspor & Backup */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Download size={20} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Ekspor & Backup Data</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Mencegah kehilangan data sesuai Prinsip Produk #1</span>
          </div>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Pengguna memegang kendali penuh atas data belajarnya. Seluruh course, roadmap lesson, target deadline, jadwal kalender, 
          dan riwayat sesi Pomodoro aktual dapat dicadangkan ke dalam file JSON terstandar (schemaVersion: "1.0").
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="vlt-btn vlt-btn-primary vlt-btn-sm"
            onClick={handleExportBackup}
            disabled={isExporting}
          >
            {isExporting ? <RefreshCw size={14} className="vlt-spin" /> : <Download size={14} />}
            <span>{isExporting ? 'Mengekspor Data...' : 'Ekspor Data JSON (v1.0)'}</span>
          </button>

          <button 
            type="button" 
            className="vlt-btn vlt-btn-secondary vlt-btn-sm"
            onClick={() => setIsRestoreModalOpen(true)}
          >
            <Upload size={14} />
            <span>Pulihkan Data dari Backup</span>
          </button>

          {exportSuccess && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={15} /> File backup berhasil diunduh!
            </span>
          )}
        </div>
      </Card>


      {/* Restore Modal */}
      {user && (
        <RestoreModal
          isOpen={isRestoreModalOpen}
          onClose={() => setIsRestoreModalOpen(false)}
          userId={user.id}
          onRestored={() => {
            alert('Data backup berhasil dipulihkan. Halaman akan menyinkronkan data terbaru.');
          }}
        />
      )}
    </div>
  );
};
