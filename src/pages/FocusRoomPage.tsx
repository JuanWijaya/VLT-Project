import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Flame, 
  Laptop, 
  ShieldAlert, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

type TimerMode = 'work' | 'break';

export const FocusRoomPage: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState<number>(0);

  const workDuration = 25 * 60;
  const breakDuration = 5 * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (mode === 'work') {
          setTotalSecondsElapsed((prev) => prev + 1);
        }
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Mode switch
      if (mode === 'work') {
        alert('Sesi fokus 25 menit selesai! Saatnya istirahat 5 menit.');
        setMode('break');
        setTimeLeft(breakDuration);
      } else {
        alert('Waktu istirahat selesai! Siap untuk sesi fokus berikutnya?');
        setMode('work');
        setTimeLeft(workDuration);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, workDuration, breakDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? workDuration : breakDuration);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? workDuration : breakDuration);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatTime = (m: number, s: number) => 
    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  const currentDuration = mode === 'work' ? workDuration : breakDuration;
  const progressPercent = ((currentDuration - timeLeft) / currentDuration) * 100;

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
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Focus Room (Pomodoro Timer)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Menjalankan sesi fokus terukur. Waktu jeda/istirahat tidak dihitung sebagai durasi fokus.
          </p>
        </div>

        <Badge variant={mode === 'work' ? 'primary' : 'emerald'} icon={mode === 'work' ? <Flame size={13} /> : <Coffee size={13} />}>
          {mode === 'work' ? 'Mode Fokus (Work)' : 'Mode Istirahat (Break)'}
        </Badge>
      </div>

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
        {/* Subtle Progress Bar on Top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'var(--bg-subtle)',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: mode === 'work' ? 'var(--primary)' : 'var(--accent-emerald)',
            transition: 'width 1s linear',
          }} />
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'inline-flex',
          padding: 4,
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-full)',
          marginBottom: 32,
        }}>
          <button
            type="button"
            onClick={() => switchMode('work')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: mode === 'work' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'work' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'work' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Flame size={16} />
            Fokus (25m)
          </button>
          <button
            type="button"
            onClick={() => switchMode('break')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: mode === 'break' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'break' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              boxShadow: mode === 'break' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Coffee size={16} />
            Istirahat (5m)
          </button>
        </div>

        {/* Digital Clock Display */}
        <div style={{
          fontSize: 'clamp(4rem, 14vw, 7.5rem)',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 36,
          userSelect: 'none',
        }}>
          {formatTime(minutes, seconds)}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={toggleTimer}
            className={`vlt-btn ${isRunning ? 'vlt-btn-secondary' : 'vlt-btn-primary'}`}
            style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: 'var(--radius-full)' }}
          >
            {isRunning ? (
              <>
                <Pause size={20} />
                <span>Jeda (Pause)</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>{timeLeft < currentDuration ? 'Lanjutkan' : 'Mulai Fokus'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetTimer}
            className="vlt-btn vlt-btn-subtle"
            style={{ padding: '14px', borderRadius: 'var(--radius-full)' }}
            title="Reset Timer"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Live Session Counter */}
        <div style={{
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}>
          <Clock size={15} style={{ color: 'var(--primary)' }} />
          <span>Fokus aktual sesi saat ini: <strong>{Math.floor(totalSecondsElapsed / 60)}m {totalSecondsElapsed % 60}s</strong></span>
        </div>
      </div>

      {/* Rules & Architecture Notice (FR-FOCUS-05, FR-FOCUS-06 & Section 14.3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Laptop size={18} style={{ color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Aturan Multi-Perangkat (PRD 14.3)</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Satu akun hanya boleh memiliki 1 sesi aktif. Status server adalah <em>single source of truth</em>. 
            Membuka dari perangkat lain akan menampilkan sesi yang sama tanpa membuat sesi ganda.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <ShieldAlert size={18} style={{ color: 'var(--accent-amber)' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Pemulihan Crash & Sleep</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Jika browser ditutup atau komputer masuk mode tidur (sleep), sesi otomatis dipulihkan sebagai <strong>"dijeda"</strong> 
            dari checkpoint terakhir dan tidak menghitung waktu tidur sebagai jam fokus.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CheckCircle size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Pemisahan Tugas & Sesi</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Menyelesaikan sesi Pomodoro <strong>tidak</strong> otomatis menyelesaikan status lesson. 
            Pengguna memegang kendali penuh kapan materi benar-benar dipahami dan ditandai selesai.
          </p>
        </Card>
      </div>
    </div>
  );
};
