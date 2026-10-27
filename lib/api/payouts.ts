import { cleanClabe, isValidClabe } from '@/lib/clabe';
import { supabase } from '@/lib/supabase';

export type PayoutAccount = {
  holderName: string;
  bankName: string;
  clabe: string;
  updatedAt: string;
};

export type Payout = {
  id: string;
  kind: 'transfer' | 'block_fee';
  amount: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export async function fetchPayoutAccount(driverId: string): Promise<PayoutAccount | null> {
  const { data, error } = await supabase
    .from('driver_payout_accounts')
    .select('holder_name, bank_name, clabe, updated_at')
    .eq('driver_id', driverId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    holderName: data.holder_name,
    bankName: data.bank_name,
    clabe: data.clabe,
    updatedAt: data.updated_at,
  };
}

export async function savePayoutAccount(
  driverId: string,
  input: { holderName: string; bankName: string; clabe: string },
): Promise<PayoutAccount> {
  const clabe = cleanClabe(input.clabe);
  const holderName = input.holderName.trim().replace(/\s+/g, ' ');
  const bankName = input.bankName.trim();
  if (holderName.length < 3) throw new Error('Escribe el nombre del titular como aparece en el banco');
  if (bankName.length < 2) throw new Error('Escribe el nombre del banco');
  if (!isValidClabe(clabe)) throw new Error('La CLABE no es válida. Revisa los 18 dígitos.');

  const { data, error } = await supabase
    .from('driver_payout_accounts')
    .upsert(
      { driver_id: driverId, holder_name: holderName, bank_name: bankName, clabe },
      { onConflict: 'driver_id' },
    )
    .select('holder_name, bank_name, clabe, updated_at')
    .single();
  if (error) throw new Error(error.message || 'No se pudo guardar la cuenta');
  return {
    holderName: data.holder_name,
    bankName: data.bank_name,
    clabe: data.clabe,
    updatedAt: data.updated_at,
  };
}

export type PayoutBalance = {
  cardEarned: number;
  cardTrips: number;
  paidOut: number;
  balance: number;
};

export async function fetchMyPayoutBalance(): Promise<PayoutBalance> {
  const { data, error } = await supabase.rpc('my_payout_balance');
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { card_earned: number; card_trips: number; paid_out: number; balance: number }
    | undefined;
  return {
    cardEarned: Number(row?.card_earned) || 0,
    cardTrips: Number(row?.card_trips) || 0,
    paidOut: Number(row?.paid_out) || 0,
    balance: Number(row?.balance) || 0,
  };
}

export async function fetchMyPayouts(driverId: string): Promise<Payout[]> {
  const { data, error } = await supabase
    .from('driver_payouts')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    kind: p.kind === 'block_fee' ? 'block_fee' : 'transfer',
    amount: Number(p.amount) || 0,
    reference: p.reference,
    note: p.note,
    createdAt: p.created_at,
  }));
}
