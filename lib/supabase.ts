import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const DEMO_PASSWORD = 'InrideDemo1!';

export const DEMO_ACCOUNTS = {
  passenger: {
    email: 'sofia@inride.app',
    password: DEMO_PASSWORD,
    label: 'Sofía · Pasajera',
  },
  driver: {
    email: 'mauricio@inride.app',
    password: DEMO_PASSWORD,
    label: 'Mauricio · Conductor',
  },
  admin: {
    email: 'admin@inride.app',
    password: DEMO_PASSWORD,
    label: 'Admin INRIDE',
  },
} as const;
