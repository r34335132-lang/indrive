import { CalendarDays, ChevronDown, Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useMemo, useState } from 'react';
import { BlockActions } from '../components/BlockActions';
import { Avatar, Badge, cx, EmptyState, Segmented, Skeleton } from '../components/ui';
import { BLOCK_METHOD_LABEL, blockStatus, type BlockRow } from '../lib/blocks';
import { useAdminData } from '../lib/data';
import { dayMx, formatDay, formatMoney, shiftDay, timeAgo, todayMx, type Tone } from '../lib/format';
import type { DailyBlockStatus, Driver } from '../lib/types';

type DriverDay = {
  driverId: string;
  driver: Driver | undefined;
  trips: number;
  earned: number;
  block: BlockRow | undefined;
};

type DaySummary = {
  day: string;
  drivers: DriverDay[];
  trips: number;
  earned: number;
  generated: number;
  paid: number;
  collected: number;
  pending: number;
  pendingAmount: number;
  overdue: boolean;
};

type Range = '7' | '30' | '90';

function driverDayStatus(d: DriverDay, day: string, today: string, fee: number): { label: string; tone: Tone; hint?: string } {
  if (d.block) return blockStatus(d.block);
  if (d.earned >= fee) {
    return day === today
      ? { label: 'Alcanzó el bloque', tone: 'amber' }
      : { label: 'Alcanzó · sin bloque', tone: 'slate', hint: 'Día anterior al bloque diario' };
  }
  return { label: 'No alcanzó', tone: 'slate', hint: `Le faltaron ${formatMoney(fee - d.earned)}` };
}

export function BlocksByDay({
  rows,
  fee,
  query,
  busyId,
  onResolve,
}: {
  rows: BlockRow[];
  fee: number;
  query: string;
  busyId: string | null;
  onResolve: (row: BlockRow, status: DailyBlockStatus) => void;
}) {
  const { rides, drivers, loading } = useAdminData();
  const today = todayMx();
  const [range, setRange] = useState<Range>('30');
  const [open, setOpen] = useState<string | null>(today);

  const driversById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const summaries = useMemo<DaySummary[]>(() => {
    const first = shiftDay(today, -(Number(range) - 1));
    const byDay = new Map<string, Map<string, DriverDay>>();
    const entry = (day: string, driverId: string) => {
      const map = byDay.get(day) ?? new Map<string, DriverDay>();
      byDay.set(day, map);
      const found = map.get(driverId);
      if (found) return found;
      const created: DriverDay = { driverId, driver: driversById.get(driverId), trips: 0, earned: 0, block: undefined };
      map.set(driverId, created);
      return created;
    };

    for (const r of rides) {
      if (r.status !== 'completed' || !r.driver_id) continue;
      const day = dayMx(r.completed_at ?? r.created_at);
      if (day < first || day > today) continue;
      const e = entry(day, r.driver_id);
      e.trips += 1;
      e.earned += r.driver_net;
    }
    for (const b of rows) {
      if (b.day < first || b.day > today) continue;
      entry(b.day, b.driver_id).block = b;
    }

    const q = query.trim().toLowerCase();
    const out: DaySummary[] = [];
    for (let i = 0; i < Number(range); i += 1) {
      const day = shiftDay(today, -i);
      const all = [...(byDay.get(day)?.values() ?? [])];
      if (!all.length && day !== today) continue;
      const list = (
        q
          ? all.filter((d) =>
              [d.driver?.name, d.driver?.email, d.driver?.phone]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
            )
          : all
      ).sort((a, b) => b.earned - a.earned);
      if (q && !list.length) continue;
      const blocks = list.map((d) => d.block).filter((b): b is BlockRow => Boolean(b));
      const pending = blocks.filter((b) => b.status === 'pending');
      out.push({
        day,
        drivers: list,
        trips: list.reduce((s, d) => s + d.trips, 0),
        earned: list.reduce((s, d) => s + d.earned, 0),
        generated: blocks.length,
        paid: blocks.filter((b) => b.status === 'paid').length,
        collected: blocks.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0),
        pending: pending.length,
        pendingAmount: pending.reduce((s, b) => s + b.amount, 0),
        overdue: pending.some((b) => b.overdue),
      });
    }
    return out;
  }, [driversById, query, range, rides, rows, today]);

  const totals = useMemo(
    () => ({
      collected: summaries.reduce((s, d) => s + d.collected, 0),
      pendingAmount: summaries.reduce((s, d) => s + d.pendingAmount, 0),
      generated: summaries.reduce((s, d) => s + d.generated, 0),
    }),
    [summaries],
  );

  const exportCsv = () => {
    const header = ['Día', 'Conductor', 'Email', 'Viajes', 'Ganó', 'Bloque', 'Estado', 'Método', 'Pagado'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = summaries.flatMap((s) =>
      s.drivers.map((d) =>
        [
          s.day,
          d.driver?.name ?? d.driverId,
          d.driver?.email ?? '',
          d.trips,
          d.earned.toFixed(2),
          d.block ? d.block.amount : '',
          driverDayStatus(d, s.day, today, fee).label,
          d.block?.method ? BLOCK_METHOD_LABEL[d.block.method] : '',
          d.block?.paid_at ?? '',
        ]
          .map(esc)
          .join(','),
      ),
    );
    const blob = new Blob([`\ufeff${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bloques-por-dia-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          id="blocks-range"
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 días' },
            { value: '30', label: '30 días' },
            { value: '90', label: '90 días' },
          ]}
        />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">
            Cobrado <b className="text-ink">{formatMoney(totals.collected)}</b>
          </span>
          <span className="text-muted">
            Por cobrar <b className={totals.pendingAmount ? 'text-rose-600' : 'text-ink'}>{formatMoney(totals.pendingAmount)}</b>
          </span>
          <button
            onClick={exportCsv}
            disabled={!summaries.length}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-teal-700 transition hover:bg-teal-500/10 disabled:opacity-50"
          >
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-line">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : summaries.length ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th className="px-6 py-4">Día</th>
                  <th className="px-4 py-4 text-right">Conductores</th>
                  <th className="px-4 py-4 text-right">Viajes</th>
                  <th className="px-4 py-4 text-right">Ganancias</th>
                  <th className="px-4 py-4 text-right">Bloques</th>
                  <th className="px-4 py-4 text-right">Cobrado</th>
                  <th className="px-4 py-4">Por cobrar</th>
                  <th className="w-10 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const isOpen = open === s.day;
                  return (
                    <Fragment key={s.day}>
                      <tr
                        onClick={() => setOpen(isOpen ? null : s.day)}
                        className={cx(
                          'cursor-pointer border-b border-line/70 transition-colors hover:bg-canvas',
                          isOpen && 'bg-canvas',
                        )}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <CalendarDays size={16} className="text-teal-600" />
                            <span className="font-semibold capitalize">{formatDay(s.day)}</span>
                            {s.day === today ? <Badge tone="teal">Hoy</Badge> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium">{s.drivers.length}</td>
                        <td className="px-4 py-3.5 text-right text-muted">{s.trips}</td>
                        <td className="px-4 py-3.5 text-right text-muted">{formatMoney(s.earned)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold">{s.paid}</span>
                          <span className="text-muted"> / {s.generated}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold">{formatMoney(s.collected)}</td>
                        <td className="px-4 py-3.5">
                          {s.pending ? (
                            <Badge tone={s.overdue ? 'rose' : 'amber'} dot>
                              {s.pending} · {formatMoney(s.pendingAmount)}
                            </Badge>
                          ) : s.generated ? (
                            <Badge tone="green">Al corriente</Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="inline-flex text-muted">
                            <ChevronDown size={16} />
                          </motion.span>
                        </td>
                      </tr>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <tr className="border-b border-line/70 bg-canvas/60">
                            <td colSpan={8} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <DayDetail
                                  summary={s}
                                  today={today}
                                  fee={fee}
                                  busyId={busyId}
                                  onResolve={onResolve}
                                />
                              </motion.div>
                            </td>
                          </tr>
                        ) : null}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {rides.length >= 2000 ? (
              <p className="p-4 text-center text-xs text-muted">
                Los viajes se calculan con los 2,000 más recientes; los días más antiguos pueden salir incompletos.
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays size={24} />}
            title="Sin actividad"
            text="No hay conductores con viajes en este periodo."
          />
        )}
      </div>
    </div>
  );
}

function DayDetail({
  summary,
  today,
  fee,
  busyId,
  onResolve,
}: {
  summary: DaySummary;
  today: string;
  fee: number;
  busyId: string | null;
  onResolve: (row: BlockRow, status: DailyBlockStatus) => void;
}) {
  if (!summary.drivers.length) {
    return <p className="px-6 py-5 text-sm text-muted">Ningún conductor ha completado viajes este día.</p>;
  }
  return (
    <div className="space-y-1 px-4 py-3">
      {summary.drivers.map((d) => {
        const st = driverDayStatus(d, summary.day, today, fee);
        const pct = Math.min(100, Math.round((d.earned / Math.max(fee, 1)) * 100));
        const name = d.driver?.name ?? 'Conductor eliminado';
        return (
          <div key={d.driverId} className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
            <div className="flex w-56 min-w-0 items-center gap-3">
              <Avatar name={name} src={d.driver?.avatar_url} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted">{d.driver?.phone || d.driver?.email}</p>
              </div>
            </div>
            <div className="w-44">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-ink">{formatMoney(d.earned)}</span>
                <span className="text-muted">
                  {d.trips} viaje{d.trips === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cx('h-full rounded-full', pct >= 100 ? 'bg-teal-500' : 'bg-slate-300')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <Badge tone={st.tone} dot>
                {st.label}
              </Badge>
              <p className="mt-1 truncate text-xs text-muted">
                {d.block?.method
                  ? `${BLOCK_METHOD_LABEL[d.block.method]}${d.block.paid_at ? ` · ${timeAgo(d.block.paid_at)}` : ''}`
                  : st.hint ?? ''}
              </p>
            </div>
            <div className="w-48">
              {d.block?.status === 'pending' ? (
                <BlockActions busy={busyId === d.block.id} onResolve={(s) => onResolve(d.block!, s)} />
              ) : d.block ? (
                <p className="text-right text-sm font-bold">{formatMoney(d.block.amount)}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
