import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileJson, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle
} from 'lucide-react';
import { validateRoadmapJSON } from '../../lib/roadmap/validator';
import { calculateRoadmapDiff } from '../../lib/roadmap/merger';
import { executeRoadmapImport, fetchCourseDetails, fetchUserCourses } from '../../lib/roadmap/service';
import type { RoadmapFileV1, RoadmapDiff, EnrichedLesson } from '../../lib/roadmap/types';
import { Badge } from '../common/Badge';

interface RoadmapImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (courseId?: string) => void;
}

type Step = 'SELECT_FILE' | 'VALIDATION_ERROR' | 'PREVIEW_MERGE' | 'SUBMITTING' | 'SUCCESS';

export const RoadmapImportModal: React.FC<RoadmapImportModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('SELECT_FILE');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [validatedData, setValidatedData] = useState<RoadmapFileV1 | null>(null);
  const [diff, setDiff] = useState<RoadmapDiff | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        
        // 1. Validasi JSON secara ketat (PRD Bagian 14.4)
        const validation = validateRoadmapJSON(text);

        if (!validation.isValid) {
          setValidationErrors(validation.errors);
          setStep('VALIDATION_ERROR');
          setIsProcessing(false);
          return;
        }

        const data = validation.data;
        setValidatedData(data);

        // 2. Ambil data existing dari database untuk stable_id course ini
        const userCourses = await fetchUserCourses(userId);
        const existingCourse = userCourses.find((c) => c.stableId === data.course.id) || null;

        let existingLessons: EnrichedLesson[] = [];
        if (existingCourse) {
          const details = await fetchCourseDetails(existingCourse.id, userId);
          existingLessons = details.lessons;
        }

        // 3. Hitung Diff Preview
        const computedDiff = calculateRoadmapDiff(data, existingCourse, existingLessons);
        setDiff(computedDiff);
        setStep('PREVIEW_MERGE');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Gagal memproses berkas JSON.');
        setStep('VALIDATION_ERROR');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Terjadi kesalahan saat membaca berkas dari sistem lokal Anda.');
      setStep('VALIDATION_ERROR');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleConfirmMerge = async () => {
    if (!validatedData) return;

    setStep('SUBMITTING');
    try {
      const res = await executeRoadmapImport(validatedData, userId);
      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan roadmap ke database.');
      }
      setStep('SUCCESS');
      setTimeout(() => {
        onSuccess(res.courseId);
        handleClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kegagalan saat proses penyimpanan.');
      setStep('PREVIEW_MERGE');
    }
  };

  const handleClose = () => {
    setStep('SELECT_FILE');
    setFileName('');
    setValidationErrors([]);
    setValidatedData(null);
    setDiff(null);
    setErrorMessage(null);
    onClose();
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
        maxWidth: 720,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileJson size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                Impor Roadmap Course (JSON v1.0)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Validasi Skema & Pratinjau Merge Transparan
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="vlt-btn-icon"
            style={{ borderRadius: '50%' }}
            aria-label="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* STEP 1: SELECT FILE */}
          {step === 'SELECT_FILE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 24px',
                textAlign: 'center',
                background: 'var(--bg-base)',
                position: 'relative',
                cursor: 'pointer',
              }}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <Upload size={26} />
                </div>
                <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 6 }}>
                  {isProcessing ? 'Memproses berkas...' : 'Pilih Berkas JSON Roadmap'}
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 16px' }}>
                  Klik di sini atau seret file JSON course Anda. Sistem akan memvalidasi skema v1.0 dan menampilkan pratinjau sebelum disimpan.
                </p>
                <button type="button" className="vlt-btn vlt-btn-primary vlt-btn-sm" style={{ pointerEvents: 'none' }}>
                  Jelajahi Berkas (.json)
                </button>
              </div>

              {/* Ketentuan Ringkas */}
              <div style={{
                background: 'var(--bg-subtle)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HelpCircle size={15} style={{ color: 'var(--primary)' }} />
                  Ketentuan Format JSON (PRD 14.4)
                </div>
                <div>• Wajib menyertakan <code>"schemaVersion": "1.0"</code>.</div>
                <div>• Objek <code>"course"</code> memuat <code>id</code> (stable ID) dan <code>title</code>.</div>
                <div>• Array <code>"lessons"</code> memuat item dengan <code>id</code>, <code>title</code>, dan <code>order</code>.</div>
              </div>
            </div>
          )}

          {/* STEP 2: VALIDATION ERROR */}
          {step === 'VALIDATION_ERROR' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: 'var(--accent-rose-subtle)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}>
                <AlertCircle size={22} style={{ color: 'var(--accent-rose)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--accent-rose-text)', marginBottom: 4 }}>
                    File Ditolak: Validasi Skema Gagal
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Sesuai prinsip PRD #1 (Mencegah kerusakan data), berkas invalid tidak diperkenankan mengubah data tersimpan apa pun.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Rincian Kesalahan ({validationErrors.length} masalah):
                </span>
                <div style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-base)',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {validationErrors.map((err, i) => (
                    <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--accent-rose-text)', display: 'flex', gap: 6 }}>
                      <span>•</span>
                      <span><strong>[{err.path}]</strong> {err.message}</span>
                    </div>
                  ))}
                  {errorMessage && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--accent-rose-text)' }}>
                      • {errorMessage}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setStep('SELECT_FILE')}
                  className="vlt-btn vlt-btn-secondary"
                >
                  Pilih Berkas Lain
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & MERGE DIFF */}
          {step === 'PREVIEW_MERGE' && diff && validatedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {errorMessage && (
                <div style={{
                  background: 'var(--accent-rose-subtle)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  color: 'var(--accent-rose-text)',
                }}>
                  {errorMessage}
                </div>
              )}

              {/* Summary Banner */}
              <div style={{
                background: diff.isNewCourse ? 'var(--primary-subtle)' : 'var(--accent-cyan-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Badge variant={diff.isNewCourse ? 'primary' : 'emerald'}>
                      {diff.isNewCourse ? 'Course Baru' : 'Pembaruan Course (Reimport)'}
                    </Badge>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Stable ID: <code>{diff.course.stableId}</code>
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {diff.course.title}
                  </h4>
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {fileName} ({(fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>

              {/* Statistics Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    +{diff.summary.totalNew}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Lesson Baru</div>
                </div>

                <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Δ {diff.summary.totalUpdated}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Diperbarui</div>
                </div>

                <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>
                    = {diff.summary.totalUnchanged}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Tidak Berubah</div>
                </div>

                {diff.summary.totalMissingFromSource > 0 && (
                  <div style={{ padding: '10px', background: 'var(--accent-amber-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                      ⚠️ {diff.summary.totalMissingFromSource}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--accent-amber-text)' }}>Hilang dr Sumber</div>
                  </div>
                )}
              </div>

              {/* Safeguard Notice */}
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--accent-emerald-text)',
                background: 'var(--accent-emerald-subtle)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                <span>
                  <strong>Jaminan Integritas Status:</strong> Status belajar lesson eksisting (Selesai/Sedang dipelajari) dipertahankan 100% dan tidak akan ter-reset.
                </span>
              </div>

              {/* Items List Preview */}
              <div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Daftar Lesson ({validatedData.lessons.length} item di file sumber):
                </span>
                <div style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* New Items */}
                  {diff.lessons.newItems.map((item) => (
                    <div key={item.stableId} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(16, 185, 129, 0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>+</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.order}. {item.title}</span>
                      </div>
                      <Badge variant="emerald">Baru</Badge>
                    </div>
                  ))}

                  {/* Updated Items */}
                  {diff.lessons.updatedItems.map((item) => (
                    <div key={item.stableId} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(79, 70, 229, 0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Δ</span>
                        <div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.order}. {item.title}</span>
                          {item.oldTitle && item.oldTitle !== item.title && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block' }}>
                              Sebelumnya: {item.oldTitle}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="primary">Diperbarui</Badge>
                    </div>
                  ))}

                  {/* Unchanged Items */}
                  {diff.lessons.unchangedItems.map((item) => (
                    <div key={item.stableId} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: 'var(--text-secondary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>=</span>
                        <span style={{ fontSize: '0.8125rem' }}>{item.order}. {item.title}</span>
                      </div>
                      <Badge variant="subtle">Sama</Badge>
                    </div>
                  ))}

                  {/* Missing from Source Items (PRD 14.4) */}
                  {diff.lessons.missingFromSourceItems.map((item) => (
                    <div key={item.stableId} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--accent-amber-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--accent-amber)' }}>⚠️</span>
                        <div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-amber-text)' }}>
                            {item.order}. {item.title}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--accent-amber-text)', display: 'block' }}>
                            Tidak ada di file baru — Tetap dipertahankan di database
                          </span>
                        </div>
                      </div>
                      <Badge variant="amber">Perlu Ditinjau</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep('SELECT_FILE')}
                  className="vlt-btn vlt-btn-secondary"
                >
                  Batal / Ganti Berkas
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  className="vlt-btn vlt-btn-primary"
                >
                  <span>Konfirmasi & Terapkan Perubahan</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUBMITTING */}
          {step === 'SUBMITTING' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              gap: 16,
            }}>
              <div className="status-dot-pulse" style={{ width: 16, height: 16 }} />
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                Menyimpan Roadmap ke Supabase...
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 360 }}>
                Mengeksekusi transaksi penyimpanan atomik dan menjaga konsistensi status belajar.
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 'SUCCESS' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--accent-emerald-subtle)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Roadmap Berhasil Diterapkan!
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Data course dan lessons telah tersimpan secara atomik.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
