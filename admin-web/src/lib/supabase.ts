import { createClient } from '@supabase/supabase-js';

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined);
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'https://invalid.supabase.co', anonKey ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'inride-admin-auth' },
});
