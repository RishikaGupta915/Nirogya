// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

const safeUrl = supabaseUrl?.trim() || 'https://placeholder.supabase.co';
const safeAnonKey = supabaseAnonKey?.trim() || 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false // we persist manually via SecureStore for mobile
  }
});
