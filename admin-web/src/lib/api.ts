import { supabase } from './supabase';
import type {
  DailyBlock,
  DailyBlockStatus,
  DriverDeposit,
  DriverDocsRow,
  DriverPayout,
  PayoutAccount,
  PayoutBalance,
  Profile,
  ReviewStatus,
  Ride,
  Tariff,
} from './types';

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
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) {
    console.warn('driver_deposits', error.message);
    return [];
  }
  return ((data ?? []) as DriverDeposit[]).map((d) => ({ ...d, amount: Number(d.amount) || 0 }));
}

/** Vacío si la migración 018 aún no se ha corrido. */
export async function fetchDailyBlocks(): Promise<DailyBlock[]> {
  const { data, error } = await supabase
    .from('driver_daily_blocks')
    .select('id, driver_id, day, amount, earned, status, method, deposit_id, note, paid_at, created_at')
    .order('day', { ascending: false })
    .limit(3000);
  if (error) {
    console.warn('driver_daily_blocks', error.message);
    return [];
  }
  return ((data ?? []) as DailyBlock[]).map((b) => ({
    ...b,
    amount: Number(b.amount) || 0,
    earned: Number(b.earned) || 0,
  }));
}

/** Efectivo en oficina (`paid`), condonar (`waived`) o deshacer (`pending`). */
export async function resolveDailyBlock(id: string, status: DailyBlockStatus, note?: string) {
  const { data: auth } = await supabase.auth.getUser();
  const patch =
    status === 'pending'
      ? { status, method: null, paid_at: null, resolved_by: null, note: null }
      : {
          status,
          method: status === 'paid' ? 'admin' : null,
          paid_at: new Date().toISOString(),
          resolved_by: auth.user?.id ?? null,
          note: note?.trim() || null,
        };
  const { error } = await supabase.from('driver_daily_blocks').update(patch).eq('id', id);
  if (error) throw error;
}

export type PayoutData = {
  accounts: PayoutAccount[];
  balances: PayoutBalance[];
  payouts: DriverPayout[];
};

/** Vacío si la migración 017 aún no se ha corrido. */
export async function fetchPayoutData(): Promise<PayoutData> {
  const [acc, bal, pay] = await Promise.all([
    supabase.from('driver_payout_accounts').select('driver_id, holder_name, bank_name, clabe, updated_at'),
    supabase.rpc('admin_payout_balances'),
    supabase
      .from('driver_payouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);
  for (const r of [acc, bal, pay]) if (r.error) console.warn('payouts', r.error.message);
  return {
    accounts: (acc.data ?? []) as PayoutAccount[],
    balances: ((bal.data ?? []) as PayoutBalance[]).map((b) => ({
      ...b,
      card_earned: Number(b.card_earned) || 0,
      card_trips: Number(b.card_trips) || 0,
      paid_out: Number(b.paid_out) || 0,
      balance: Number(b.balance) || 0,
    })),
    payouts: ((pay.data ?? []) as DriverPayout[]).map((p) => ({ ...p, amount: Number(p.amount) || 0 })),
  };
}

export async function createPayout(input: {
  driverId: string;
  amount: number;
  clabe: string | null;
  reference?: string;
  note?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('driver_payouts').insert({
    driver_id: input.driverId,
    amount: Math.round(input.amount * 100) / 100,
    clabe: input.clabe,
    reference: input.reference?.trim() || null,
    note: input.note?.trim() || null,
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function deletePayout(id: string) {
  const { error } = await supabase.from('driver_payouts').delete().eq('id', id);
  if (error) throw error;
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
