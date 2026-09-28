import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

export type CreatePaymentResult = {
  preferenceId: string;
  initPoint: string;
  amount: number;
  currency: string;
  alreadyPaid?: boolean;
};

/** Abre Checkout Pro de Mercado Pago para cobrar un viaje. */
export async function startCardPayment(rideId: string): Promise<CreatePaymentResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Inicia sesión para pagar');
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL');

  const res = await fetch(`${base}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rideId }),
  });

  const json = (await res.json()) as CreatePaymentResult & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || 'No se pudo iniciar el pago');
  }
  if (json.alreadyPaid) return { ...json, preferenceId: '', initPoint: '', amount: 0, currency: 'MXN' };

  if (!json.initPoint) throw new Error('Mercado Pago no devolvió URL de pago');

  await WebBrowser.openAuthSessionAsync(json.initPoint, 'inride://payment/success');
  return json;
}

export async function refreshRidePayment(rideId: string) {
  const { data, error } = await supabase
    .from('rides')
    .select('payment_status, payment_method, mp_payment_id, paid_at, price')
    .eq('id', rideId)
    .single();
  if (error) throw error;
  return data;
}
