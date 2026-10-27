import { Banknote, CheckCircle2, Clock3, Download, ShieldAlert, Undo2, Wallet } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { BlockActions } from '../components/BlockActions';
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
import { fetchActiveTariff, resolveDailyBlock } from '../lib/api';
import { BLOCK_METHOD_LABEL as METHOD_LABEL, blockStatus as statusOf, type BlockRow as Row } from '../lib/blocks';
import { useAdminData } from '../lib/data';
import { formatDateTime, formatDay, formatMoney, timeAgo, todayMx } from '../lib/format';
import type { DailyBlockStatus } from '../lib/types';
import { BlocksByDay } from './BlocksByDay';

type Filter = 'all' | 'pending' | 'paid' | 'waived';
type View = 'days' | 'list';

function exportCsv(rows: Row[]) {
  const header = ['Día', 'Conductor', 'Email', 'Ganó ese día', 'Bloque', 'Estado', 'Método', 'Pago MP', 'Pagado'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.day,
      r.driver?.name ?? r.driver_id,
      r.driver?.email ?? '',
      r.earned,
      r.amount,
      statusOf(r).label,
      r.method ? METHOD_LABEL[r.method] : '',
      r.deposit?.mp_payment_id ?? '',
      r.paid_at ?? '',
    ]
      .map(esc)
      .join(','),
  );
  const blob = new Blob([`\ufeff${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bloques-inridee-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Deposits() {
  const { dailyBlocks, deposits, drivers, loading, refresh } = useAdminData();
  const [view, setView] = useState<View>('days');
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
  const depositsById = useMemo(() => new Map(deposits.map((d) => [d.id, d])), [deposits]);
  const today = todayMx();

  const rows = useMemo<Row[]>(
    () =>
      dailyBlocks.map((b) => ({
        ...b,
        driver: driversById.get(b.driver_id),
        deposit: b.deposit_id ? depositsById.get(b.deposit_id) : undefined,
        overdue: b.status === 'pending' && b.day < today,
      })),
    [dailyBlocks, depositsById, driversById, today],
  );

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'paid');
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      collected: paid.reduce((s, r) => s + r.amount, 0),
      paidCount: paid.length,
      month: paid
        .filter((r) => new Date(r.paid_at ?? r.created_at) >= monthStart)
        .reduce((s, r) => s + r.amount, 0),
      pendingToday: rows.filter((r) => r.status === 'pending' && !r.overdue).length,
      blockedDrivers: new Set(rows.filter((r) => r.overdue).map((r) => r.driver_id)).size,
    };
  }, [rows]);

  const owing = useMemo(
    () =>
      rows
        .filter((r) => r.status === 'pending')
        .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.day.localeCompare(b.day)),
    [rows],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      paid: rows.filter((r) => r.status === 'paid').length,
      waived: rows.filter((r) => r.status === 'waived').length,
    }),
    [rows],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      return [r.driver?.name, r.driver?.email, r.driver?.phone, r.deposit?.mp_payment_id, r.day]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [filter, query, rows]);

  const resolve = async (r: Row, status: DailyBlockStatus) => {
    const name = r.driver?.name ?? 'el conductor';
    const day = formatDay(r.day);
    const question =
      status === 'paid'
        ? `¿Registrar que ${name} pagó en efectivo el bloque del ${day} (${formatMoney(r.amount)})?`
        : status === 'waived'
          ? `¿Condonar el bloque del ${day} de ${name}? No se le cobrará.`
          : `¿Regresar a pendiente el bloque del ${day} de ${name}?`;
    if (!window.confirm(question)) return;
    setBusyId(r.id);
    try {
      await resolveDailyBlock(r.id, status);
      await refresh();
      setToast(
        status === 'paid' ? 'Bloque marcado como pagado' : status === 'waived' ? 'Bloque condonado' : 'Bloque pendiente otra vez',
      );
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
        title="Bloques de sistema"
        subtitle={`Bloque diario de ${formatMoney(fee)}: se genera el día que el conductor junta ese monto en ganancias`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Conductor, fecha o ID de pago…" />
            {view === 'list' ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => exportCsv(list)}
                disabled={!list.length}
                className="flex h-11 items-center gap-2 rounded-2xl bg-navy-900 px-4 text-sm font-bold text-white shadow-lift transition hover:bg-navy-800 disabled:opacity-50"
              >
                <Download size={16} /> Exportar CSV
              </motion.button>
            ) : null}
          </>
        }
      />

      <div className="mb-5">
        <Segmented
          id="blocks-view"
          value={view}
          onChange={setView}
          options={[
            { value: 'days', label: 'Historial por día' },
            { value: 'list', label: 'Todos los bloques', count: rows.length },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Wallet size={19} />}
          label="Total cobrado"
          value={stats.collected}
          format={formatMoney}
          sub={`${stats.paidCount} bloques pagados`}
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
          label="Pendientes de hoy"
          value={stats.pendingToday}
          sub="Ya juntaron el bloque; tienen hasta las 11:59 pm"
          delay={0.1}
        />
        <Stat
          icon={<ShieldAlert size={19} />}
          label="Conductores bloqueados"
          value={stats.blockedDrivers}
          sub="Con bloques vencidos: no pueden aceptar viajes"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {view === 'days' ? (
          <BlocksByDay
            rows={rows}
            fee={fee}
            query={query}
            busyId={busyId}
            onResolve={(r, s) => void resolve(r, s)}
          />
        ) : (
        <div>
          <div className="mb-4">
            <Segmented
              id="blocks"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos', count: counts.all },
                { value: 'pending', label: 'Pendientes', count: counts.pending },
                { value: 'paid', label: 'Pagados', count: counts.paid },
                { value: 'waived', label: 'Condonados', count: counts.waived },
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
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                      <th className="px-6 py-4">Conductor</th>
                      <th className="px-4 py-4">Día</th>
                      <th className="px-4 py-4 text-right">Bloque</th>
                      <th className="px-4 py-4">Estado</th>
                      <th className="px-4 py-4">Cómo pagó</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 300).map((r, i) => {
                      const st = statusOf(r);
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
                                <p className="truncate text-xs text-muted">{r.driver?.phone || r.driver?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium capitalize">{formatDay(r.day)}</p>
                            <p className="text-xs text-muted">Ganó {formatMoney(r.earned)}</p>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold">{formatMoney(r.amount)}</td>
                          <td className="px-4 py-3.5">
                            <Badge tone={st.tone} dot>
                              {st.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {r.method ? (
                              <div>
                                <p className="font-medium">{METHOD_LABEL[r.method]}</p>
                                <p className="text-xs text-muted">
                                  {r.deposit?.mp_payment_id ? `#${r.deposit.mp_payment_id} · ` : ''}
                                  {r.paid_at ? timeAgo(r.paid_at) : ''}
                                </p>
                              </div>
                            ) : r.status === 'waived' ? (
                              <span className="text-xs text-muted">{r.paid_at ? formatDateTime(r.paid_at) : '—'}</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {r.status === 'pending' ? (
                              <BlockActions busy={busyId === r.id} onResolve={(s) => void resolve(r, s)} />
                            ) : r.method !== 'mercadopago' && r.method !== 'balance' ? (
                              <button
                                onClick={() => void resolve(r, 'pending')}
                                disabled={busyId === r.id}
                                className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink"
                                title="Regresar a pendiente"
                              >
                                <Undo2 size={15} />
                              </button>
                            ) : null}
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
                title={rows.length ? 'Sin resultados' : 'Aún no hay bloques'}
                text={
                  rows.length
                    ? 'Prueba con otro filtro o búsqueda.'
                    : `Cuando un conductor junte ${formatMoney(fee)} en un día se generará su bloque aquí.`
                }
              />
            )}
          </div>
        </div>
        )}

        <Card className="h-fit pb-2" delay={0.1}>
          <CardHeader
            title="Por cobrar"
            subtitle="Vencidos primero; los de hoy vencen a las 11:59 pm"
            action={<Badge tone={owing.length ? 'amber' : 'green'}>{owing.length}</Badge>}
          />
          <div className="scroll-thin mt-4 max-h-[560px] space-y-1 overflow-y-auto px-3">
            {loading ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="mx-3 h-14" />)
            ) : owing.length ? (
              owing.map((r) => {
                const name = r.driver?.name ?? 'Conductor eliminado';
                return (
                  <div key={r.id} className="rounded-2xl px-3 py-3 transition hover:bg-canvas">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} src={r.driver?.avatar_url} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-muted capitalize">
                          {formatDay(r.day)} · {formatMoney(r.amount)}
                        </p>
                      </div>
                      <Badge tone={r.overdue ? 'rose' : 'amber'}>{r.overdue ? 'Vencido' : 'Hoy'}</Badge>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <BlockActions busy={busyId === r.id} onResolve={(s) => void resolve(r, s)} />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={<CheckCircle2 size={24} />}
                title="Todo al corriente"
                text="Ningún conductor debe bloques."
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
