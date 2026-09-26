import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  Platform,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || '';

const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const normalizeSupabaseUrl = (
  value: string
) => {
  if (!value) return '';

  const trimmed =
    value
      .trim()
      .replace(/\/+$/, '');

  return trimmed.replace(
    /\/(?:rest|auth)\/v1$/,
    ''
  );
};

const supabaseUrl =
  normalizeSupabaseUrl(
    rawSupabaseUrl
  );

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase URL or ANON KEY is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase =
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        ...(Platform.OS !== 'web'
          ? {
              storage:
                AsyncStorage,
            }
          : {}),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );

const authRefreshGuard =
  '__gym_manager_supabase_auth_refresh__';

if (
  Platform.OS !== 'web' &&
  !(globalThis as any)[
    authRefreshGuard
  ]
) {
  (globalThis as any)[
    authRefreshGuard
  ] = true;

  if (
    AppState.currentState ===
    'active'
  ) {
    supabase.auth
      .startAutoRefresh();
  }

  AppState.addEventListener(
    'change',
    state => {
      if (
        state === 'active'
      ) {
        supabase.auth
          .startAutoRefresh();
      } else {
        supabase.auth
          .stopAutoRefresh();
      }
    }
  );
}
