import {
  AlertTriangle,
  Banknote,
  Check,
  Copy,
  CreditCard,
  Download,
  Landmark,
  Loader2,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer } from '../components/Drawer';
import {
  AnimatedNumber,
  Avatar,
  Badge,
  cx,
  EmptyState,
  PageHeader,
  SearchInput,
  Segmented,
  Skeleton,
} from '../components/ui';
import { createPayout, deletePayout, fetchPayoutData, type PayoutData } from '../lib/api';
import { useAdminData } from '../lib/data';
import { formatDate, formatDateTime, formatMoney, formatMoneyCents, timeAgo } from '../lib/format';
import type { Driver, DriverPayout, PayoutAccount, PayoutBalance } from '../lib/types';

type Row = {
  driver: Driver;
  account: PayoutAccount | null;
  balance: PayoutBalance | null;
  owed: number;
};

type Filter = 'owed' | 'all' | 'noAccount';

const RECENT_CHANGE_MS = 3 * 24 * 60 * 60 * 1000;

function groupClabe(c: string) {
  return [c.slice(0, 3), c.slice(3, 6), c.slice(6, 17), c.slice(17)].join(' ');
}

function exportCsv(rows: Row[]) {
  const header = ['Conductor', 'Titular', 'Banco', 'CLABE', 'Por pagar', 'Viajes con tarjeta'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows
    .filter((r) => r.account && r.owed > 0)
    .map((r) =>
      [r.driver.name, r.account?.holder_name, r.account?.bank_name, `'${r.account?.clabe}`, r.owed.toFixed(2), r.balance?.card_trips ?? 0]
        .map(esc)
        .join(','),
    );
  const blob = new Blob([`\ufeff${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pagos-conductores-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Payouts() {
  const { drivers, loading: baseLoading, lastUpdated } = useAdminData();
  const [data, setData] = useState<PayoutData | null>(null);
  const [filter, setFilter] = useState<Filter>('owed');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(await fetchPayoutData());
  }, []);

  useEffect(() => {
    void load();
  }, [load, lastUpdated]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const rows = useMemo<Row[]>(() => {
    const acc = new Map((data?.accounts ?? []).map((a) => [a.driver_id, a]));
    const bal = new Map((data?.balances ?? []).map((b) => [b.driver_id, b]));
    return drivers
      .map((d) => {
        const balance = bal.get(d.id) ?? null;
        return { driver: d, account: acc.get(d.id) ?? null, balance, owed: Math.max(0, balance?.balance ?? 0) };
      })
      .sort((a, b) => b.owed - a.owed || a.driver.name.localeCompare(b.driver.name));
  }, [data, drivers]);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return {
      owed: rows.reduce((s, r) => s + r.owed, 0),
      withBalance: rows.filter((r) => r.owed > 0).length,
      paidMonth: (data?.payouts ?? [])
        .filter((p) => p.kind !== 'block_fee' && new Date(p.created_at) >= monthStart)
        .reduce((s, p) => s + p.amount, 0),
      missing: rows.filter((r) => r.owed > 0 && !r.account).length,
    };
  }, [data, rows]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'owed' && r.owed <= 0) return false;
      if (filter === 'noAccount' && r.account) return false;
      if (!q) return true;
      return [r.driver.name, r.driver.email, r.driver.phone, r.account?.clabe, r.account?.holder_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [filter, query, rows]);

  const loading = baseLoading || !data;

  return (
    <div>
      <PageHeader
        eyebrow="Finanzas"
        title="Pagos a conductores"
        subtitle="Lo que pagan los pasajeros con tarjeta llega a Mercado Pago; aquí ves cuánto transferirle a cada conductor"
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Conductor, CLABE o titular…" />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => exportCsv(rows)}
              className="flex h-11 items-center gap-2 rounded-2xl bg-navy-900 px-4 text-sm font-bold text-white shadow-lift transition hover:bg-navy-800"
            >
              <Download size={16} /> CSV por pagar
            </motion.button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Wallet size={19} />} label="Total por pagar" value={stats.owed} money accent delay={0} sub={`${stats.withBalance} conductores con saldo`} />
        <Stat icon={<Send size={19} />} label="Transferido este mes" value={stats.paidMonth} money delay={0.05} sub={new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })} />
        <Stat icon={<Landmark size={19} />} label="Cuentas registradas" value={data?.accounts.length ?? 0} delay={0.1} sub={`de ${drivers.length} conductores`} />
        <Stat icon={<AlertTriangle size={19} />} label="Con saldo y sin cuenta" value={stats.missing} delay={0.15} sub="Pídeles que agreguen su CLABE" />
      </div>

      <div className="mb-4">
        <Segmented
          id="payouts"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'owed', label: 'Por pagar', count: rows.filter((r) => r.owed > 0).length },
            { value: 'all', label: 'Todos', count: rows.length },
            { value: 'noAccount', label: 'Sin cuenta', count: rows.filter((r) => !r.account).length },
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
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th className="px-6 py-4">Conductor</th>
                  <th className="px-4 py-4">Cuenta</th>
                  <th className="px-4 py-4 text-right">Viajes tarjeta</th>
                  <th className="px-4 py-4 text-right">Por pagar</th>
                  <th className="px-4 py-4">Último pago</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => {
                  const changedRecently =
                    r.account && Date.now() - new Date(r.account.updated_at).getTime() < RECENT_CHANGE_MS;
                  return (
                    <motion.tr
                      key={r.driver.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 15) * 0.025 }}
                      className="border-b border-line/70 transition-colors last:border-0 hover:bg-canvas"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.driver.name} src={r.driver.avatar_url} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{r.driver.name}</p>
                            <p className="truncate text-xs text-muted">{r.driver.phone || r.driver.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {r.account ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13px] font-semibold tracking-wide">
                                {groupClabe(r.account.clabe)}
                              </span>
                              <CopyButton text={r.account.clabe} onCopied={() => setToast('CLABE copiada')} />
                            </div>
                            <p className="text-xs text-muted">
                              {r.account.bank_name} · {r.account.holder_name}
                            </p>
                            {changedRecently ? (
                              <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
                                Cuenta cambiada {timeAgo(r.account.updated_at)} — verifica con el conductor
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <Badge tone="amber" dot>
                            Sin cuenta
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted">{r.balance?.card_trips ?? 0}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={cx('font-bold', r.owed > 0 ? 'text-ink' : 'text-muted')}>
                          {formatMoneyCents(r.owed)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {r.balance?.last_payout_at ? formatDate(r.balance.last_payout_at) : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelected(r)}
                          className={cx(
                            'rounded-xl px-3.5 py-2 text-xs font-bold transition',
                            r.owed > 0
                              ? 'bg-teal-500 text-white hover:bg-teal-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                          )}
                        >
                          {r.owed > 0 ? 'Pagar' : 'Ver'}
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Banknote size={24} />}
            title={filter === 'owed' ? 'No hay pagos pendientes' : 'Sin resultados'}
            text={
              filter === 'owed'
                ? 'Cuando un pasajero pague un viaje con tarjeta, la ganancia del conductor aparecerá aquí.'
                : 'Prueba con otro filtro o búsqueda.'
            }
          />
        )}
      </div>

      <PayoutDrawer
        row={selected}
        payouts={(data?.payouts ?? []).filter((p) => p.driver_id === selected?.driver.id)}
        onClose={() => setSelected(null)}
        onChanged={async (msg) => {
          await load();
          setToast(msg);
        }}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-lift"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PayoutDrawer({
  row,
  payouts,
  onClose,
  onChanged,
}: {
  row: Row | null;
  payouts: DriverPayout[];
  onClose: () => void;
  onChanged: (msg: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(row && row.owed > 0 ? row.owed.toFixed(2) : '');
    setReference('');
    setNote('');
    setError(null);
  }, [row?.driver.id, row?.owed]);

  const submit = async () => {
    if (!row) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Escribe un monto válido');
      return;
    }
    if (value > row.owed + 0.01 && !window.confirm('El monto es mayor a lo que se le debe. ¿Registrar de todos modos?')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPayout({
        driverId: row.driver.id,
        amount: value,
        clabe: row.account?.clabe ?? null,
        reference,
        note,
      });
      await onChanged(`Pago de ${formatMoneyCents(value)} registrado`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: DriverPayout) => {
    if (!window.confirm(`¿Eliminar el registro de ${formatMoneyCents(p.amount)}? Solo hazlo si fue un error.`)) return;
    try {
      await deletePayout(p.id);
      await onChanged('Registro eliminado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  };

  return (
    <Drawer
      open={Boolean(row)}
      onClose={onClose}
      width={520}
      title={
        row ? (
          <div className="flex items-center gap-3">
            <Avatar name={row.driver.name} src={row.driver.avatar_url} size={44} />
            <div>
              <p>{row.driver.name}</p>
              <p className="text-sm font-medium text-muted">{row.driver.phone || row.driver.email}</p>
            </div>
          </div>
        ) : null
      }
      footer={
        row ? (
          <div className="space-y-3">
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy || !row.account}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 py-3 font-bold text-white shadow-lift transition hover:bg-navy-800 disabled:opacity-50"
              title={row.account ? '' : 'El conductor no tiene cuenta registrada'}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Ya transferí · registrar pago
            </motion.button>
          </div>
        ) : null
      }
    >
      {row ? (
        <div className="space-y-5">
          <div className="rounded-3xl bg-navy-900 p-5 text-white">
            <p className="text-sm text-white/60">Por pagar</p>
            <p className="text-3xl font-extrabold tracking-tight">{formatMoneyCents(row.owed)}</p>
            <p className="mt-1 text-xs text-white/50">
              {row.balance?.card_trips ?? 0} viajes con tarjeta · ganó {formatMoneyCents(row.balance?.card_earned ?? 0)} ·
              transferido {formatMoneyCents(row.balance?.paid_out ?? 0)}
            </p>
          </div>

          {row.account ? (
            <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
              <p className="mb-3 flex items-center gap-2 font-bold">
                <CreditCard size={17} className="text-teal-600" /> Datos para la transferencia
              </p>
              <Field label="CLABE" value={groupClabe(row.account.clabe)} copy={row.account.clabe} mono />
              <Field label="Banco" value={row.account.bank_name} />
              <Field label="Titular" value={row.account.holder_name} copy={row.account.holder_name} />
              <p className="mt-2 text-xs text-muted">Actualizada {timeAgo(row.account.updated_at)}</p>
            </div>
          ) : (
            <div className="flex gap-3 rounded-3xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle size={18} className="shrink-0" />
              Este conductor no ha registrado su CLABE. Pídele que la agregue en la app: menú → Cuenta para
              depósitos.
            </div>
          )}

          {row.account ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted">Monto transferido</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-lg font-bold ring-1 ring-line outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted">Clave de rastreo / referencia SPEI (opcional)</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej. MBAN01002610270001"
                  className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted">Nota (opcional)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. Semana 20–26 oct"
                  className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-bold">Historial de pagos</p>
            {payouts.length ? (
              <div className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
                {payouts.map((p) => {
                  const isBlock = p.kind === 'block_fee';
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={cx(
                          'flex h-8 w-8 items-center justify-center rounded-xl',
                          isBlock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
                        )}
                      >
                        {isBlock ? <ShieldCheck size={14} /> : <Send size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {formatMoneyCents(p.amount)}
                          {isBlock ? <span className="ml-2 text-xs font-semibold text-amber-600">Bloque pagado con saldo</span> : null}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {formatDateTime(p.created_at)}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.note ? ` · ${p.note}` : ''}
                        </p>
                      </div>
                      {isBlock ? null : (
                        <button
                          onClick={() => void remove(p)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">Aún no hay pagos registrados.</p>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function Field({ label, value, copy, mono }: { label: string; value: string; copy?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className={cx('truncate font-semibold', mono && 'font-mono tracking-wide')}>{value}</p>
      </div>
      {copy ? <CopyButton text={copy} /> : null}
    </div>
  );
}

function CopyButton({ text, onCopied }: { text: string; onCopied?: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          onCopied?.();
          window.setTimeout(() => setDone(false), 1400);
        });
      }}
      className="rounded-lg p-1.5 text-muted transition hover:bg-teal-50 hover:text-teal-600"
      title="Copiar"
    >
      {done ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
    </button>
  );
}

function Stat({
  icon,
  label,
  value,
  money,
  sub,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  money?: boolean;
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
      <AnimatedNumber
        value={value}
        format={money ? formatMoney : undefined}
        className="mt-1 block text-3xl font-extrabold tracking-tight"
      />
      <p className={cx('mt-1 text-xs', accent ? 'text-white/50' : 'text-muted')}>{sub}</p>
    </motion.div>
  );
}
