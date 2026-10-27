import type { Tone } from './format';
import type { DailyBlock, Driver, DriverDeposit } from './types';

export const BLOCK_METHOD_LABEL: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  balance: 'Saldo de tarjeta',
  admin: 'Efectivo (oficina)',
};

export type BlockRow = DailyBlock & {
  driver: Driver | undefined;
  deposit: DriverDeposit | undefined;
  overdue: boolean;
};

export function blockStatus(b: { status: DailyBlock['status']; overdue: boolean }): { label: string; tone: Tone } {
  if (b.status === 'paid') return { label: 'Pagado', tone: 'green' };
  if (b.status === 'waived') return { label: 'Condonado', tone: 'slate' };
  return b.overdue ? { label: 'Vencido', tone: 'rose' } : { label: 'Pendiente hoy', tone: 'amber' };
}
