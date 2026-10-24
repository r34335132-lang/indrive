import { supabase } from './supabase';
import type { DriverDeposit, DriverDocsRow, Profile, ReviewStatus, Ride, Tariff } from './types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchDriverDocs(): Promise<DriverDocsRow[]> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DriverDocsRow[];
}

export async function fetchRides(limit = 2000): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Ride[]).map((r) => ({
    ...r,
    price: Number(r.price) || 0,
    driver_net: Number(r.driver_net) || 0,
    app_net: Number(r.app_net) || 0,
    airport_toll: Number(r.airport_toll) || 0,
    distance_km: Number(r.distance_km) || 0,
  }));
}

/** Vacío si la migración 015 aún no se ha corrido, para no romper el resto del panel. */
export async function fetchDeposits(): Promise<DriverDeposit[]> {
  const { data, error } = await supabase
    .from('driver_deposits')
    .select(
      'id, driver_id, amount, currency, status, mp_preference_id, mp_payment_id, mp_status_detail, paid_at, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) {
    console.warn('driver_deposits', error.message);
    return [];
  }
  return ((data ?? []) as DriverDeposit[]).map((d) => ({ ...d, amount: Number(d.amount) || 0 }));
}

export async function fetchActiveTariff(): Promise<Tariff | null> {
  const { data, error } = await supabase
    .from('tariffs')
    .select('*')
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return (data as Tariff | null) ?? null;
}

export async function updateTariff(id: string, patch: Partial<Tariff>) {
  const { data, error } = await supabase
    .from('tariffs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Tariff;
}

export async function reviewDriver(userId: string, status: ReviewStatus, note?: string) {
  const { error } = await supabase
    .from('driver_documents')
    .update({ review_status: status, review_note: note?.trim() || null })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setBlockFee(userId: string, satisfied: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({
      block_fee_satisfied: satisfied,
      block_fee_satisfied_at: satisfied ? new Date().toISOString() : null,
    })
    .eq('id', userId);
  if (error) throw error;
}

const signedCache = new Map<string, { url: string; at: number }>();

/** URL temporal (1 h) para ver un documento privado del bucket driver-docs. */
export async function signedDocUrl(path: string): Promise<string | null> {
  const cached = signedCache.get(path);
  if (cached && Date.now() - cached.at < 50 * 60 * 1000) return cached.url;
  const { data, error } = await supabase.storage.from('driver-docs').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, at: Date.now() });
  return data.signedUrl;
}

export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<[number, number][] | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const coords = json.routes?.[0]?.geometry?.coordinates;
    return coords ? coords.map(([lng, lat]) => [lat, lng]) : null;
  } catch {
    return null;
  }
}
