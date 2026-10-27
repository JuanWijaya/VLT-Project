import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variabel lingkungan fleksibel: mendukung VITE_ maupun NEXT_PUBLIC_ (aman di browser maupun runner pengujian)
const getEnv = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {}
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const rawUrl = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');

const rawKey = (
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || 
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

// Membersihkan nilai dari spasi atau tanda kutip ganda/tunggal yang mungkin tidak sengaja terbawa
const cleanEnv = (val?: string): string | undefined => {
  if (!val) return undefined;
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const supabaseUrl = cleanEnv(rawUrl);
const supabasePublishableKey = cleanEnv(rawKey);

/**
 * Memeriksa apakah konfigurasi Supabase telah disediakan melalui environment variables.
 * Menghindari crash runtime bila .env.local belum diisi oleh developer.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseUrl !== '' && 
    supabasePublishableKey && 
    supabasePublishableKey !== '' &&
    !supabaseUrl.includes('placeholder')
  );
};

// Inisialisasi client Supabase tunggal (singleton)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
