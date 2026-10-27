import React from 'react';
import { 
  FileJson, 
  Upload, 
  Layers, 
  CheckCircle, 
  BookOpen, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const MyLearningPage: React.FC = () => {
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
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>My Learning & Roadmap Management</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Pengelolaan roadmap terstruktur. Semua course baru diinisialisasi melalui file JSON berstandar schemaVersion 1.0.
          </p>
        </div>

        <Badge variant="primary" icon={<FileJson size={13} />}>
          Schema v1.0 Standard
        </Badge>
      </div>

      {/* JSON Import Specification Notice (FR-LEARN-01 & Section 14.4) */}
      <Card style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileJson size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Ketentuan Impor Roadmap (FR-LEARN-01 & PRD 14.4)</h3>
              <Badge variant="amber">Aturan Ketat</Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              Course baru <strong>hanya</strong> dibuat melalui impor file JSON. Tidak disediakan form manual agar hierarki lesson tetap stabil.
              File wajib memiliki <code>schemaVersion: "1.0"</code>, ID permanen unik, dan divalidasi dengan alur Preview & Merge.
            </p>

            <div style={{
              background: 'var(--bg-base)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              <div>&#123;</div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: 'var(--primary)' }}>"schemaVersion"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"1.0"</span>,
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: 'var(--primary)' }}>"course"</span>: &#123; <span style={{ color: 'var(--primary)' }}>"id"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"crs-react-pro"</span>, <span style={{ color: 'var(--primary)' }}>"title"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"React 19 Advanced"</span> &#125;,
              </div>
              <div style={{ paddingLeft: 16 }}>
                <span style={{ color: 'var(--primary)' }}>"lessons"</span>: [ &#123; <span style={{ color: 'var(--primary)' }}>"id"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"lsn-001"</span>, <span style={{ color: 'var(--primary)' }}>"title"</span>: <span style={{ color: 'var(--accent-emerald)' }}>"Server Actions"</span>, <span style={{ color: 'var(--primary)' }}>"order"</span>: 1 &#125; ]
              </div>
              <div>&#125;</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Dropzone Placeholder (Kerangka UI Fondasi) */}
      <Card>
        <div style={{
          border: '2px dashed var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-surface)',
          transition: 'border-color var(--transition-fast)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Upload size={24} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
            Impor Roadmap File (.json)
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 440, marginBottom: 16 }}>
            Pilih file JSON skema v1.0. Pada tahap fondasi, parser dan validasi skema akan diaktifkan di Tahap 2 (Learning Management).
          </p>
          <button 
            type="button" 
            className="vlt-btn vlt-btn-secondary vlt-btn-sm"
            onClick={() => alert("Fitur impor roadmap akan diaktifkan pada Tahap 2: Learning Management setelah fondasi aplikasi diverifikasi.")}
          >
            Pilih File JSON (Tahap 2)
          </button>
        </div>
      </Card>

      {/* Course List Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Daftar Course Tersimpan</h3>
          </div>
          <Badge variant="subtle">0 Course</Badge>
        </div>

        <EmptyState
          icon={<BookOpen size={24} />}
          title="Belum ada roadmap yang diimpor"
          description="Setelah file JSON roadmap diunggah dan diverifikasi, daftar course, modul, dan status per-lesson akan muncul di sini."
        />
      </div>

      {/* Business Rule Checklist (Informative) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
          <CheckCircle size={16} style={{ color: 'var(--accent-emerald)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>3 Status Lesson:</strong> Belum dimulai, Sedang dipelajari, Selesai (dapat diubah manual).
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
          <AlertCircle size={16} style={{ color: 'var(--accent-amber)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Preview & Merge:</strong> Impor ulang tidak menimpa status belajar tanpa konfirmasi eksplisit.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
          <HelpCircle size={16} style={{ color: 'var(--accent-cyan)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Progres Otomatis:</strong> (Lesson selesai ÷ total lesson) × 100%, semua berbobot setara.
          </div>
        </div>
      </div>
    </div>
  );
};
