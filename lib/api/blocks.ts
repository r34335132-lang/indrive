import { supabase } from '@/lib/supabase';

export type DailyBlockStatus = 'pending' | 'paid' | 'waived';
export type DailyBlockMethod = 'mercadopago' | 'balance' | 'admin';

export type DailyBlock = {
  id: string;
  day: string;
  amount: number;
  earned: number;
  status: DailyBlockStatus;
  method: DailyBlockMethod | null;
  paidAt: string | null;
};

/** Fecha local `YYYY-MM-DD`, mismo formato que `driver_daily_blocks.day`. */
export function localDay(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatBlockDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Vacío si la migración 018 aún no se ha corrido. */
export async function fetchMyDailyBlocks(driverId: string): Promise<DailyBlock[]> {
  const { data, error } = await supabase
    .from('driver_daily_blocks')
    .select('id, day, amount, earned, status, method, paid_at')
    .eq('driver_id', driverId)
    .order('day', { ascending: false })
    .limit(30);
  if (error) {
    console.warn('driver_daily_blocks', error.message);
    return [];
  }
  return (data ?? []).map((b) => ({
    id: b.id,
    day: b.day,
    amount: Number(b.amount) || 0,
    earned: Number(b.earned) || 0,
    status: b.status as DailyBlockStatus,
    method: (b.method as DailyBlockMethod | null) ?? null,
    paidAt: b.paid_at,
  }));
}

export async function payDailyBlockWithBalance(blockId: string): Promise<void> {
  const { error } = await supabase.rpc('pay_daily_block_with_balance', { p_block_id: blockId });
  if (error) throw new Error(error.message || 'No se pudo pagar con tu saldo');
}
