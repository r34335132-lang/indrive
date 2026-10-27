import { Car, Clock3, ShieldCheck, ShieldOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { DriverDrawer } from '../components/DriverDrawer';
import { Avatar, Badge, EmptyState, PageHeader, SearchInput, Segmented, Skeleton } from '../components/ui';
import { useAdminData } from '../lib/data';
import { formatMoney, REVIEW_STATUS, TIER_LABEL, timeAgo } from '../lib/format';

type Filter = 'all' | 'approved' | 'pending' | 'rejected';

export function Drivers() {
  const { drivers, loading } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers
      .filter((d) => filter === 'all' || (d.docs?.review_status ?? 'pending') === filter)
      .filter(
        (d) =>
          !q ||
          [d.name, d.email, d.phone, d.vehicle_plate].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
      )
      .sort((a, b) => b.earnings - a.earnings);
  }, [drivers, filter, query]);

  const count = (f: Filter) =>
    f === 'all' ? drivers.length : drivers.filter((d) => (d.docs?.review_status ?? 'pending') === f).length;

  const selected = drivers.find((d) => d.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Flota"
        title="Conductores"
        subtitle={`${drivers.length} conductores registrados`}
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Buscar conductor o placas…" />}
      />
      <div className="mb-6">
        <Segmented
          id="drivers"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: count('all') },
            { value: 'approved', label: 'Aprobados', count: count('approved') },
            { value: 'pending', label: 'Pendientes', count: count('pending') },
            { value: 'rejected', label: 'Rechazados', count: count('rejected') },
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
                  <th className="px-4 py-4">Vehículo</th>
                  <th className="px-4 py-4">Estado</th>
                  <th className="px-4 py-4">Bloque</th>
                  <th className="px-4 py-4 text-right">Viajes</th>
                  <th className="px-4 py-4 text-right">Ganancias</th>
                  <th className="px-6 py-4 text-right">Último viaje</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d, i) => {
                  const status = d.docs?.review_status ?? 'pending';
                  return (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 15) * 0.025 }}
                      onClick={() => setSelectedId(d.id)}
                      className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-canvas"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={d.name} src={d.avatar_url} size={38} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{d.name}</p>
                            <p className="truncate text-xs text-muted">{d.phone || d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium">
                          {[d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || '—'}
                        </p>
                        <p className="font-mono text-xs tracking-wider text-muted">
                          {d.vehicle_plate || '—'}
                          {d.driver_tier ? ` · ${TIER_LABEL[d.driver_tier] ?? d.driver_tier}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={REVIEW_STATUS[status].tone} dot>
                          {REVIEW_STATUS[status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {d.blocksOverdue.length ? (
                          <span className="flex items-center gap-1.5 font-medium text-rose-600">
                            <ShieldOff size={15} /> Vencido ({d.blocksOverdue.length})
                          </span>
                        ) : d.blockToday?.status === 'pending' ? (
                          <span className="flex items-center gap-1.5 font-medium text-amber-600">
                            <Clock3 size={15} /> Pendiente hoy
                          </span>
                        ) : d.blockToday ? (
                          <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                            <ShieldCheck size={15} /> Pagado hoy
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold">{d.completedTrips}</td>
                      <td className="px-4 py-3.5 text-right font-bold">{formatMoney(d.earnings)}</td>
                      <td className="px-6 py-3.5 text-right text-muted">{d.lastTripAt ? timeAgo(d.lastTripAt) : '—'}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Car size={24} />} title="Sin conductores" text="Prueba con otro filtro o búsqueda." />
        )}
      </div>

      <DriverDrawer driver={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
