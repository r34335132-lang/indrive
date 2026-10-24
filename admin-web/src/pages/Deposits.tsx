import { Banknote, CheckCircle2, Clock3, Download, ShieldAlert, Wallet } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  AnimatedNumber,
  Avatar,
  Badge,
  Card,
  CardHeader,
  cx,
  EmptyState,
  PageHeader,
  SearchInput,
  Segmented,
  Skeleton,
} from '../components/ui';
import { fetchActiveTariff, setBlockFee } from '../lib/api';
import { useAdminData } from '../lib/data';
import { formatDateTime, formatMoney, timeAgo, type Tone } from '../lib/format';
import type { DepositStatus, Driver, DriverDeposit } from '../lib/types';

const DEPOSIT_STATUS: Record<DepositStatus, { label: string; tone: Tone }> = {
  approved: { label: 'Aprobado', tone: 'green' },
  pending: { label: 'Pendiente', tone: 'amber' },
  rejected: { label: 'Rechazado', tone: 'rose' },
  cancelled: { label: 'Cancelado', tone: 'slate' },
  refunded: { label: 'Reembolsado', tone: 'violet' },
  none: { label: 'Sin pago', tone: 'slate' },
};

type Filter = 'all' | 'approved' | 'pending' | 'failed';

type Row = DriverDeposit & { driver: Driver | undefined };

function exportCsv(rows: Row[]) {
  const header = ['Fecha', 'Conductor', 'Email', 'Monto', 'Estado', 'Pago MP', 'Detalle', 'Pagado'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.driver?.name ?? r.driver_id,
      r.driver?.email ?? '',
      r.amount,
      DEPOSIT_STATUS[r.status]?.label ?? r.status,
      r.mp_payment_id ?? '',
      r.mp_status_detail ?? '',
      r.paid_at ?? '',
    ]
      .map(esc)
      .join(','),
  );
  const blob = new Blob([`\ufeff${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `depositos-inridee-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Deposits() {
  const { deposits, drivers, loading, refresh } = useAdminData();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [fee, setFee] = useState(300);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveTariff()
      .then((t) => {
        if (t?.system_block_fee) setFee(Number(t.system_block_fee));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const driversById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const rows = useMemo<Row[]>(
    () => deposits.map((d) => ({ ...d, driver: driversById.get(d.driver_id) })),
    [deposits, driversById],
  );

  const stats = useMemo(() => {
    const approved = rows.filter((r) => r.status === 'approved');
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      collected: approved.reduce((s, r) => s + r.amount, 0),
      approvedCount: approved.length,
      month: approved
        .filter((r) => new Date(r.paid_at ?? r.created_at) >= monthStart)
        .reduce((s, r) => s + r.amount, 0),
      pending: rows.filter((r) => r.status === 'pending' && r.mp_payment_id).length,
    };
  }, [rows]);

  const owing = useMemo(
    () =>
      drivers
        .filter((d) => d.docs?.review_status === 'approved' && !d.block_fee_satisfied && d.earnings < fee)
        .sort((a, b) => b.earnings - a.earnings),
    [drivers, fee],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      approved: rows.filter((r) => r.status === 'approved').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      failed: rows.filter((r) => ['rejected', 'cancelled', 'refunded'].includes(r.status)).length,
    }),
    [rows],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'approved' && r.status !== 'approved') return false;
      if (filter === 'pending' && r.status !== 'pending') return false;
      if (filter === 'failed' && !['rejected', 'cancelled', 'refunded'].includes(r.status)) return false;
      if (!q) return true;
      return [r.driver?.name, r.driver?.email, r.driver?.phone, r.mp_payment_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [filter, query, rows]);

  const markCash = async (d: Driver) => {
    if (!window.confirm(`¿Marcar el depósito de ${d.name} como pagado en efectivo?`)) return;
    setBusyId(d.id);
    try {
      await setBlockFee(d.id, true);
      await refresh();
      setToast(`${d.name} ya puede recibir viajes`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Finanzas"
        title="Depósitos"
        subtitle={`Bloque de sistema de ${formatMoney(fee)} pagado por los conductores con Mercado Pago`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Conductor o ID de pago…" />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => exportCsv(list)}
              disabled={!list.length}
              className="flex h-11 items-center gap-2 rounded-2xl bg-navy-900 px-4 text-sm font-bold text-white shadow-lift transition hover:bg-navy-800 disabled:opacity-50"
            >
              <Download size={16} /> Exportar CSV
            </motion.button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Wallet size={19} />}
          label="Total cobrado"
          value={stats.collected}
          format={formatMoney}
          sub={`${stats.approvedCount} depósitos aprobados`}
          accent
          delay={0}
        />
        <Stat
          icon={<Banknote size={19} />}
          label="Este mes"
          value={stats.month}
          format={formatMoney}
          sub={new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          delay={0.05}
        />
        <Stat
          icon={<Clock3 size={19} />}
          label="En proceso"
          value={stats.pending}
          sub="Pagos esperando confirmación (OXXO, etc.)"
          delay={0.1}
        />
        <Stat
          icon={<ShieldAlert size={19} />}
          label="Sin depósito"
          value={owing.length}
          sub="Conductores aprobados que no pueden trabajar"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-4">
            <Segmented
              id="deposits"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos', count: counts.all },
                { value: 'approved', label: 'Aprobados', count: counts.approved },
                { value: 'pending', label: 'Pendientes', count: counts.pending },
                { value: 'failed', label: 'Fallidos', count: counts.failed },
              ]}
            />
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-line">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : list.length ? (
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                      <th className="px-6 py-4">Conductor</th>
                      <th className="px-4 py-4 text-right">Monto</th>
                      <th className="px-4 py-4">Estado</th>
                      <th className="px-4 py-4">Pago Mercado Pago</th>
                      <th className="px-6 py-4 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 300).map((r, i) => {
                      const st = DEPOSIT_STATUS[r.status] ?? DEPOSIT_STATUS.none;
                      const name = r.driver?.name ?? 'Conductor eliminado';
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i, 15) * 0.025 }}
                          className="border-b border-line/70 transition-colors last:border-0 hover:bg-canvas"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={name} src={r.driver?.avatar_url} size={36} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{name}</p>
                                <p className="truncate text-xs text-muted">{r.driver?.email ?? r.driver_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold">{formatMoney(r.amount)}</td>
                          <td className="px-4 py-3.5">
                            <Badge tone={st.tone} dot>
                              {r.status === 'pending' && !r.mp_payment_id ? 'Checkout abierto' : st.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {r.mp_payment_id ? (
                              <div>
                                <p className="font-mono text-xs font-semibold text-ink">#{r.mp_payment_id}</p>
                                {r.mp_status_detail ? (
                                  <p className="text-xs text-muted">{r.mp_status_detail}</p>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <p className="font-medium">{formatDateTime(r.paid_at ?? r.created_at)}</p>
                            <p className="text-xs text-muted">{timeAgo(r.paid_at ?? r.created_at)}</p>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length > 300 ? (
                  <p className="p-4 text-center text-xs text-muted">
                    Mostrando 300 de {list.length}. Usa la búsqueda o exporta el CSV para ver todo.
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={<Wallet size={24} />}
                title={rows.length ? 'Sin resultados' : 'Aún no hay depósitos'}
                text={
                  rows.length
                    ? 'Prueba con otro filtro o búsqueda.'
                    : 'Cuando un conductor pague su depósito con Mercado Pago desde la app aparecerá aquí.'
                }
              />
            )}
          </div>
        </div>

        <Card className="h-fit pb-2" delay={0.1}>
          <CardHeader
            title="Pendientes de depósito"
            subtitle="Aprobados que aún no cubren el bloque"
            action={<Badge tone={owing.length ? 'amber' : 'green'}>{owing.length}</Badge>}
          />
          <div className="scroll-thin mt-4 max-h-[560px] space-y-1 overflow-y-auto px-3">
            {loading ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="mx-3 h-14" />)
            ) : owing.length ? (
              owing.map((d) => {
                const pct = Math.min(100, Math.round((d.earnings / fee) * 100));
                return (
                  <div key={d.id} className="rounded-2xl px-3 py-3 transition hover:bg-canvas">
                    <div className="flex items-center gap-3">
                      <Avatar name={d.name} src={d.avatar_url} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{d.name}</p>
                        <p className="truncate text-xs text-muted">{d.phone || d.email}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={busyId === d.id}
                        onClick={() => void markCash(d)}
                        className="rounded-xl bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-500/20 disabled:opacity-50"
                        title="Marcar como pagado en efectivo"
                      >
                        {busyId === d.id ? '…' : 'Efectivo'}
                      </motion.button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="w-24 text-right text-[11px] font-semibold text-muted">
                        {formatMoney(d.earnings)} / {formatMoney(fee)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={<CheckCircle2 size={24} />}
                title="Todo al corriente"
                text="Todos los conductores aprobados ya cubrieron su depósito."
              />
            )}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-lift"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  format,
  sub,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: (n: number) => string;
  sub: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cx(
        'rounded-3xl p-5 shadow-soft ring-1 transition-shadow hover:shadow-lift',
        accent ? 'bg-navy-900 text-white ring-navy-800' : 'bg-white ring-line',
      )}
    >
      <span
        className={cx(
          'flex h-10 w-10 items-center justify-center rounded-2xl',
          accent ? 'bg-teal-400/15 text-teal-300' : 'bg-teal-500/10 text-teal-600',
        )}
      >
        {icon}
      </span>
      <p className={cx('mt-4 text-sm font-medium', accent ? 'text-white/60' : 'text-muted')}>{label}</p>
      <AnimatedNumber value={value} format={format} className="mt-1 block text-3xl font-extrabold tracking-tight" />
      <p className={cx('mt-1 text-xs', accent ? 'text-white/50' : 'text-muted')}>{sub}</p>
    </motion.div>
  );
}
