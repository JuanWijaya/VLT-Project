import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variabel lingkungan fleksibel: mendukung VITE_ maupun NEXT_PUBLIC_
const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL
) as string | undefined;

const rawKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string | undefined;

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
