import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  BookOpen, 
  Calendar, 
  Clock, 
  Target,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { validateBackupFile, generateRestorePreview, restoreUserBackup } from '../../lib/backup/service';
import type { VLTBackupFileV1, BackupRestorePreview } from '../../types/backup';
import { Badge } from '../common/Badge';

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onRestored: () => void;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  isOpen,
  onClose,
  userId,
  onRestored,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validatedBackup, setValidatedBackup] = useState<VLTBackupFileV1 | null>(null);
  const [preview, setPreview] = useState<BackupRestorePreview | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreSuccess, setRestoreSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setValidationErrors([]);
    setValidatedBackup(null);
    setPreview(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      const result = validateBackupFile(text);
      if (!result.isValid) {
        setValidationErrors(result.errors);
      } else {
        setValidatedBackup(result.data);
        setPreview(generateRestorePreview(result.data));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!validatedBackup) return;
    setIsRestoring(true);
    setValidationErrors([]);

    try {
      const res = await restoreUserBackup(userId, validatedBackup);
      if (res.success) {
        setRestoreSuccess(true);
        setTimeout(() => {
          onRestored();
          onClose();
        }, 1800);
      } else {
        setValidationErrors([res.message]);
      }
    } catch (err: any) {
      setValidationErrors([err.message || 'Gagal memulihkan data backup']);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleReset = () => {
    setFileName('');
    setValidationErrors([]);
    setValidatedBackup(null);
    setPreview(null);
    setRestoreSuccess(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        maxWidth: 580,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Upload size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                Pemulihan Data Backup VLT
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Validasi Skema v1.0 & Pratinjau Penggabungan (Safe Merge)
              </span>
            </div>
          </div>

          <button onClick={onClose} className="vlt-btn-icon" style={{ borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {restoreSuccess ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle2 size={28} />
              </div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                Pemulihan Selesai!
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 400 }}>
                Seluruh data course, roadmap, jadwal, target deadline, dan riwayat sesi fokus berhasil disinkronkan ke akun Anda.
              </p>
            </div>
          ) : (
            <>
              {/* File Uploader */}
              {!preview ? (
                <div>
                  <label
                    style={{
                      border: '2px dashed var(--border-medium)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '36px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      background: 'var(--bg-subtle)',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    <Upload size={32} style={{ color: 'var(--primary)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        Pilih file backup VLT (.json)
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                        Hanya mendukung format backup terstandar schemaVersion "1.0"
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Selected File Details */}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} style={{ color: 'var(--primary)' }} />
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                          {fileName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          Diekspor: {new Date(preview.exportedAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant="emerald" icon={<ShieldCheck size={12} />}>
                        Valid v1.0
                      </Badge>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="vlt-btn vlt-btn-subtle vlt-btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Ganti File
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Grid */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 10 }}>
                      Pratinjau Data yang Akan Dipulihkan:
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', marginBottom: 4 }}>
                          <BookOpen size={15} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Courses</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                          {preview.coursesCount}
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)', marginBottom: 4 }}>
                          <CheckCircle2 size={15} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Lessons</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                          {preview.lessonsCount}
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-cyan)', marginBottom: 4 }}>
                          <Calendar size={15} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Jadwal</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                          {preview.schedulesCount}
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-rose)', marginBottom: 4 }}>
                          <Target size={15} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Deadlines</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                          {preview.deadlinesCount}
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber)', marginBottom: 4 }}>
                          <Clock size={15} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sesi Fokus</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                          {preview.studySessionsCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Non-destructive Merge Guarantee Notice */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}>
                    🛡️ <strong>Jaminan Keamanan Data:</strong> Pemulihan ini menggunakan strategi <em>Safe Upsert</em>. 
                    Data lama yang tidak berkaitan tidak akan dihapus. Riwayat fokus dan progres belajar yang sudah ada tetap terjaga utuh.
                  </div>
                </div>
              )}

              {/* Error List Banner */}
              {validationErrors.length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-rose-subtle)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: 'var(--accent-rose-text)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    <AlertCircle size={16} />
                    <span>File backup tidak memenuhi kriteria:</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!restoreSuccess && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}>
            <button
              type="button"
              onClick={onClose}
              className="vlt-btn vlt-btn-secondary"
              disabled={isRestoring}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmRestore}
              disabled={!validatedBackup || isRestoring}
              className="vlt-btn vlt-btn-primary"
            >
              {isRestoring ? (
                <>
                  <RefreshCw size={14} className="vlt-spin" />
                  <span>Memulihkan...</span>
                </>
              ) : (
                <span>Konfirmasi & Pulihkan Data</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
