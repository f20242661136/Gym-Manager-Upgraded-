import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration. Do NOT commit service role keys.
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const normalizeSupabaseUrl = (value: string) => {
  if (!value) return '';

  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/(?:rest|auth)\/v1$/, '');
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

if (!supabaseUrl || !supabaseKey) {
	console.warn('Supabase URL or ANON KEY is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.');
} else if (rawSupabaseUrl !== supabaseUrl) {
  console.info('Normalized Supabase URL to project root for auth and database calls.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
