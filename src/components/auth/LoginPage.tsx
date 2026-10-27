import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Layers, 
  ShieldCheck, 
  Sun, 
  Moon,
  Database,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';

export const LoginPage: React.FC = () => {
  const { signInWithPassword, error, clearError, isConfigured } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    await signInWithPassword(email, password);
    setIsSubmitting(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at top, var(--bg-surface-elevated) 0%, var(--bg-base) 100%)',
      position: 'relative',
    }}>
      {/* Theme Toggle Button di Pojok Atas */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={`Ganti ke tema ${resolvedTheme === 'dark' ? 'terang' : 'gelap'}`}
          title={`Tema: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'}. Klik untuk beralih.`}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div style={{
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.35)',
            marginBottom: 16,
          }}>
            <Layers size={28} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Badge variant="primary" icon={<ShieldCheck size={12} />}>
              Personal Access
            </Badge>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              MVP v1.0
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Masuk ke VLT
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Velgryn Learning Tracking • Plan • Execute • Track
          </p>
        </div>

        {/* Configuration Notice jika .env.local belum diisi */}
        {!isConfigured && (
          <div style={{
            background: 'var(--accent-amber-subtle)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            fontSize: '0.8125rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <Database size={18} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: 'block', color: 'var(--accent-amber-text)', marginBottom: 2 }}>
                Konfigurasi Supabase Belum Terhubung
              </strong>
              <span>
                Tambahkan <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> pada berkas <code>.env.local</code> proyek Anda untuk mengaktifkan autentikasi riil.
              </span>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(16px)',
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              background: 'var(--accent-rose-subtle)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '0.8125rem',
              color: 'var(--accent-rose-text)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-rose)' }} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email Field */}
            <div>
              <label 
                htmlFor="vlt-email-input" 
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}
              >
                Alamat Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                  }} 
                />
                <input
                  id="vlt-email-input"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="pengguna@contoh.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) clearError();
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    transition: 'border-color var(--transition-fast)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="vlt-password-input" 
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}
              >
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                  }} 
                />
                <input
                  id="vlt-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) clearError();
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    transition: 'border-color var(--transition-fast)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="vlt-login-submit-button"
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="vlt-btn vlt-btn-primary"
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: '0.9375rem',
                borderRadius: 'var(--radius-md)',
                marginTop: 6,
                cursor: isSubmitting || !email || !password ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !email || !password ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Masuk ke Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Single-User / No Public Registration Notice (PRD Bagian 6 & 10) */}
          <div style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
              Akses Personal (Single-User MVP)
            </div>
            Registrasi publik dinonaktifkan. Akun pengguna dibuat langsung oleh pemilik proyek melalui Supabase Dashboard.
          </div>
        </div>
      </div>
    </div>
  );
};
