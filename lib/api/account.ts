import { supabase } from '@/lib/supabase';

/** Elimina la cuenta del usuario vía Edge Function (service role). */
export async function deleteMyAccount(): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Inicia sesión para eliminar tu cuenta');
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL');

  const res = await fetch(`${base}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo eliminar la cuenta');
  }

  await supabase.auth.signOut();
}
