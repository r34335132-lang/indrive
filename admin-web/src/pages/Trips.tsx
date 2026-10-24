import { CreditCard, Download, MapPin, Navigation, Route as RouteIcon, Star, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Drawer } from '../components/Drawer';
import { TripMap } from '../components/TripMap';
import { Avatar, Badge, cx, EmptyState, PageHeader, SearchInput, Segmented, Skeleton } from '../components/ui';
import { useAdminData } from '../lib/data';
import {
  ACTIVE_STATUSES,
  formatDateTime,
  formatMoney,
  formatMoneyCents,
  RIDE_STATUS,
  timeAgo,
} from '../lib/format';
import type { Ride } from '../lib/types';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';

function exportCsv(rows: Ride[]) {
  const header = [
    'id',
    'fecha',
    'estado',
    'pasajero',
    'conductor',
    'origen',
    'destino',
    'km',
    'precio',
    'conductor_neto',
    'app_neto',
    'pago',
    'calificacion',
  ];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.id,
      r.created_at,
      RIDE_STATUS[r.status].label,
      r.passenger_name,
      r.driver_name,
      r.origin,
      r.destination,
      r.distance_km,
      r.price,
      r.driver_net,
      r.app_net,
      r.payment_method,
      r.rating,
    ]
      .map(esc)
      .join(','),
  );
  const blob = new Blob([`\ufeff${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `viajes-inridee-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Trips() {
  const { rides, loading } = useAdminData();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Ride | null>(null);

  const matches = (r: Ride, f: Filter) =>
    f === 'all' ||
    (f === 'active' && ACTIVE_STATUSES.includes(r.status)) ||
    (f === 'completed' && r.status === 'completed') ||
    (f === 'cancelled' && r.status === 'cancelled');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rides
      .filter((r) => matches(r, filter))
      .filter(
        (r) =>
          !q ||
          [r.origin, r.destination, r.passenger_name, r.driver_name, r.driver_plate, r.id]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
      );
  }, [filter, query, rides]);

  const totals = useMemo(() => {
    const done = list.filter((r) => r.status === 'completed');
    return {
      revenue: done.reduce((s, r) => s + r.price, 0),
      app: done.reduce((s, r) => s + r.app_net, 0),
      km: done.reduce((s, r) => s + r.distance_km, 0),
    };
  }, [list]);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Viajes"
        subtitle={`${list.length} viajes · ${formatMoney(totals.revenue)} cobrados · ${formatMoney(totals.app)} de comisión`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar dirección, persona…" />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => exportCsv(list)}
              className="flex h-11 items-center gap-2 rounded-2xl bg-navy-900 px-4 text-sm font-bold text-white shadow-lift transition hover:bg-navy-800"
            >
              <Download size={16} /> Exportar CSV
            </motion.button>
          </>
        }
      />

      <div className="mb-6">
        <Segmented
          id="trips"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: rides.length },
            { value: 'active', label: 'En curso', count: rides.filter((r) => matches(r, 'active')).length },
            { value: 'completed', label: 'Completados', count: rides.filter((r) => r.status === 'completed').length },
            { value: 'cancelled', label: 'Cancelados', count: rides.filter((r) => r.status === 'cancelled').length },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-line">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : list.length ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th className="px-6 py-4">Ruta</th>
                  <th className="px-4 py-4">Pasajero</th>
                  <th className="px-4 py-4">Conductor</th>
                  <th className="px-4 py-4">Estado</th>
                  <th className="px-4 py-4 text-right">Distancia</th>
                  <th className="px-4 py-4 text-right">Precio</th>
                  <th className="px-6 py-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 300).map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 15) * 0.02 }}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-canvas"
                  >
                    <td className="max-w-[320px] px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="h-2 w-2 rounded-full bg-brand-green" />
                          <span className="h-3 w-px bg-slate-300" />
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.origin}</p>
                          <p className="truncate text-muted">{r.destination}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium">{r.passenger_name || '—'}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium">{r.driver_name || '—'}</p>
                      {r.driver_plate ? (
                        <p className="font-mono text-xs tracking-wider text-muted">{r.driver_plate}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={RIDE_STATUS[r.status].tone} dot>
                        {RIDE_STATUS[r.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted">{r.distance_km.toFixed(1)} km</td>
                    <td className="px-4 py-3.5 text-right font-bold">{formatMoney(r.price)}</td>
                    <td className="px-6 py-3.5 text-right text-muted">{timeAgo(r.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {list.length > 300 ? (
              <p className="p-4 text-center text-xs text-muted">
                Mostrando 300 de {list.length}. Usa la búsqueda o exporta el CSV para ver todo.
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState icon={<RouteIcon size={24} />} title="Sin viajes" text="Prueba con otro filtro o búsqueda." />
        )}
      </div>

      <TripDrawer ride={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TripDrawer({ ride, onClose }: { ride: Ride | null; onClose: () => void }) {
  const steps = ride
    ? [
        { label: 'Solicitado', at: ride.created_at },
        { label: 'Aceptado', at: ride.accepted_at },
        { label: 'Inició el viaje', at: ride.started_at },
        { label: ride.status === 'cancelled' ? 'Cancelado' : 'Completado', at: ride.completed_at },
      ]
    : [];

  return (
    <Drawer
      open={Boolean(ride)}
      onClose={onClose}
      width={600}
      title={ride ? `Viaje · ${formatMoney(ride.price)}` : ''}
      subtitle={ride ? `${formatDateTime(ride.created_at)} · #${ride.id.slice(0, 8)}` : undefined}
    >
      {ride ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl ring-1 ring-line">
            <TripMap ride={ride} />
          </div>

          <div className="space-y-3 rounded-3xl bg-white p-5 ring-1 ring-line">
            <div className="flex gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-green" />
              <div>
                <p className="text-xs text-muted">Origen</p>
                <p className="font-semibold">{ride.origin}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Navigation size={18} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs text-muted">Destino</p>
                <p className="font-semibold">{ride.destination}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone={RIDE_STATUS[ride.status].tone} dot>
                {RIDE_STATUS[ride.status].label}
              </Badge>
              <Badge tone="slate">{ride.vehicle}</Badge>
              <Badge tone="slate">
                {ride.distance_km.toFixed(1)} km · {ride.duration_label}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Person role="Pasajero" name={ride.passenger_name || 'Pasajero'} />
            <Person
              role="Conductor"
              name={ride.driver_name || 'Sin asignar'}
              src={ride.driver_photo_url}
              extra={[ride.driver_car, ride.driver_plate].filter(Boolean).join(' · ')}
            />
          </div>

          <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
            <p className="mb-4 flex items-center gap-2 font-bold">
              <Wallet size={18} className="text-teal-600" /> Desglose
            </p>
            <Row label="Total cobrado" value={formatMoneyCents(ride.price)} strong />
            <Row label="Para el conductor" value={formatMoneyCents(ride.driver_net)} />
            <Row label="Comisión INRIDEE" value={formatMoneyCents(ride.app_net)} />
            {ride.airport_toll > 0 ? <Row label="Peaje aeropuerto" value={formatMoneyCents(ride.airport_toll)} /> : null}
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm text-muted">
              <CreditCard size={15} />
              {ride.payment_method === 'card' ? 'Tarjeta' : 'Efectivo'}
              {ride.payment_status && ride.payment_status !== 'none' ? ` · ${ride.payment_status}` : ''}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
            <p className="mb-4 font-bold">Línea de tiempo</p>
            <ol className="relative space-y-4 border-l-2 border-line pl-6">
              {steps.map((s, i) => (
                <motion.li
                  key={s.label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative"
                >
                  <span
                    className={cx(
                      'absolute top-1 -left-[31px] h-3.5 w-3.5 rounded-full ring-4 ring-white',
                      s.at ? (s.label === 'Cancelado' ? 'bg-rose-500' : 'bg-teal-500') : 'bg-slate-300',
                    )}
                  />
                  <p className={cx('text-sm font-semibold', !s.at && 'text-muted')}>{s.label}</p>
                  <p className="text-xs text-muted">{s.at ? formatDateTime(s.at) : 'Pendiente'}</p>
                </motion.li>
              ))}
            </ol>
          </div>

          {ride.rating ? (
            <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
              <p className="mb-2 font-bold">Calificación del pasajero</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={20}
                    className={n <= (ride.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                  />
                ))}
              </div>
              {ride.comment ? <p className="mt-3 text-sm text-muted italic">“{ride.comment}”</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function Person({ role, name, src, extra }: { role: string; name: string; src?: string | null; extra?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-line">
      <Avatar name={name} src={src} size={44} />
      <div className="min-w-0">
        <p className="text-xs text-muted">{role}</p>
        <p className="truncate font-bold">{name}</p>
        {extra ? <p className="truncate text-xs text-muted">{extra}</p> : null}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={strong ? 'text-base font-extrabold' : 'font-semibold'}>{value}</span>
    </div>
  );
}
