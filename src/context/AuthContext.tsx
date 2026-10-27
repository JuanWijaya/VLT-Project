import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Ambil sesi awal yang tersimpan
    const getInitialSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('[VLT Auth] Sesi tidak ditemukan atau kedaluwarsa:', sessionError.message);
        }
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        console.error('[VLT Auth] Kesalahan jaringan saat memeriksa sesi awal:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Dengarkan perubahan state autentikasi (token refresh, sign out, sign in)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        setError(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Sesi diperbarui secara otomatis
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithPassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    if (!configured) {
      const msg = 'Variabel lingkungan VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum terpasang di .env.local.';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const friendlyMessage = mapAuthErrorMessage(authError);
        setError(friendlyMessage);
        return { success: false, error: friendlyMessage };
      }

      setSession(data.session);
      setUser(data.user);
      return { success: true };
    } catch (err: unknown) {
      const networkMsg = err instanceof Error ? err.message : 'Gagal terhubung ke server autentikasi.';
      const friendlyMessage = networkMsg.includes('Failed to fetch') 
        ? 'Gagal menghubungi server Supabase. Periksa koneksi internet atau validitas VITE_SUPABASE_URL.' 
        : networkMsg;
      setError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  const signOut = async () => {
    if (!configured) {
      setUser(null);
      setSession(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[VLT Auth] Error saat logout:', err);
    } finally {
      setUser(null);
      setSession(null);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        error,
        signInWithPassword,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Pemetaan pesan error teknis Supabase ke pesan bahasa Indonesia yang ramah pengguna
 */
function mapAuthErrorMessage(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email atau password yang Anda masukkan salah.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Pastikan konfirmasi email telah selesai di Supabase Dashboard.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Terjadi masalah jaringan saat menghubungi server Supabase.';
  }
  if (msg.includes('too many requests')) {
    return 'Terlalu banyak percobaan login. Harap tunggu beberapa saat sebelum mencoba kembali.';
  }
  return error.message || 'Terjadi kesalahan saat proses login.';
}
