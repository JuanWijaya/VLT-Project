import React from 'react';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  Info,
  Award
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const AnalyticsPage: React.FC = () => {
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
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Analytics & Consistency Trends</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Evaluasi pola belajar objektif berdasarkan catatan waktu fokus aktual dan penyelesaian lesson.
          </p>
        </div>

        <Badge variant="emerald" icon={<ShieldCheck size={13} />}>
          Prinsip Integritas Data (FR-ANA-04)
        </Badge>
      </div>

      {/* Zero Fake Data Notice Banner (FR-ANA-04 & Prompt Principle #5) */}
      <div className="vlt-banner vlt-banner-info">
        <Info size={20} />
        <div>
          <strong style={{ display: 'block', marginBottom: 2 }}>Integritas Data Bersih (FR-ANA-04)</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            VLT tidak mengisi grafik kosong dengan data palsu atau angka simulasi. Grafik dan ringkasan metrik hanya akan 
            dihitung dari sesi fokus yang benar-benar Anda selesaikan. Selain itu, hari istirahat diperlakukan netral dan tidak dihakimi secara negatif.
          </span>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Total Waktu Fokus</span>
            <Clock size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            0 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>jam</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Dari 0 sesi Pomodoro valid
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Lesson Selesai</span>
            <Award size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            0 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>/ 0</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            0% progres roadmap keseluruhan
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Hari Aktif Minggu Ini</span>
            <Calendar size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            0 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>hari</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Pola konsistensi mingguan
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Rata-rata Harian</span>
            <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            0 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>menit/hari</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Dihitung pada hari aktif belajar
          </div>
        </Card>
      </div>

      {/* Visual Analytics Sections (Ready for Phase 5 Data Aggregations) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Distribusi Waktu Fokus */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Distribusi Waktu Belajar (7 Hari Terakhir)</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Rentang: 7 Hari Terakhir • Satuan: Menit</span>
            </div>
            <Badge variant="subtle">FR-ANA-01</Badge>
          </div>

          <EmptyState
            icon={<BarChart3 size={24} />}
            title="Belum ada rekaman sesi fokus"
            description="Lakukan sesi belajar pertama Anda di Focus Room untuk melihat visualisasi distribusi waktu harian."
          />
        </Card>

        {/* Konsistensi & Perbandingan Antarperiode */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Pola Konsistensi Jam Belajar</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Distribusi Jam Efektif (Pagi, Siang, Malam)</span>
            </div>
            <Badge variant="subtle">FR-ANA-03</Badge>
          </div>

          <EmptyState
            icon={<TrendingUp size={24} />}
            title="Data pola waktu belum tersedia"
            description="Setelah beberapa sesi Pomodoro dicatat, pola jam fokus produktif Anda akan dianalisis secara objektif di sini."
          />
        </Card>
      </div>
    </div>
  );
};
