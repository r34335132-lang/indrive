import { ChevronRight, FileCheck2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { DriverDrawer } from '../components/DriverDrawer';
import { Avatar, Badge, EmptyState, PageHeader, SearchInput, Segmented, Skeleton, cx } from '../components/ui';
import { useAdminData } from '../lib/data';
import { REVIEW_STATUS, TIER_LABEL, timeAgo } from '../lib/format';
import { DOC_KEYS, type Driver } from '../lib/types';

type Filter = 'review' | 'incomplete' | 'approved' | 'rejected';

function bucket(d: Driver): Filter {
  const status = d.docs?.review_status ?? 'pending';
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return d.docs?.complete ? 'review' : 'incomplete';
}

export function Applications() {
  const { drivers, loading } = useAdminData();
  const [filter, setFilter] = useState<Filter>('review');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { review: 0, incomplete: 0, approved: 0, rejected: 0 };
    for (const d of drivers) c[bucket(d)] += 1;
    return c;
  }, [drivers]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers
      .filter((d) => bucket(d) === filter)
      .filter(
        (d) =>
          !q ||
          [d.name, d.email, d.phone, d.vehicle_plate, d.vehicle_make, d.vehicle_model]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
      )
      .sort((a, b) => (b.docs?.updated_at ?? b.created_at).localeCompare(a.docs?.updated_at ?? a.created_at));
  }, [drivers, filter, query]);

  const selected = drivers.find((d) => d.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Conductores"
        title="Solicitudes de registro"
        subtitle="Revisa los documentos y aprueba a quienes pueden manejar con INRIDEE."
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Buscar nombre, placas…" />}
      />

      <div className="mb-6">
        <Segmented
          id="apps"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'review', label: 'Por revisar', count: counts.review },
            { value: 'incomplete', label: 'Incompletas', count: counts.incomplete },
            { value: 'approved', label: 'Aprobadas', count: counts.approved },
            { value: 'rejected', label: 'Rechazadas', count: counts.rejected },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      ) : list.length ? (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((d, i) => {
              const uploaded = DOC_KEYS.filter((k) => d.docs?.[k]).length;
              const status = d.docs?.review_status ?? 'pending';
              return (
                <motion.button
                  layout
                  key={d.id}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedId(d.id)}
                  className="group rounded-3xl bg-white p-5 text-left shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={d.name} src={d.avatar_url} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{d.name}</p>
                      <p className="truncate text-sm text-muted">{d.email}</p>
                    </div>
                    <Badge tone={filter === 'incomplete' ? 'slate' : REVIEW_STATUS[status].tone} dot>
                      {filter === 'incomplete' ? 'Incompleta' : REVIEW_STATUS[status].label}
                    </Badge>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {[d.vehicle_make, d.vehicle_model, d.vehicle_color].filter(Boolean).join(' · ') || 'Sin vehículo'}
                      </p>
                      <p className="text-xs text-muted">
                        {d.driver_tier ? `${TIER_LABEL[d.driver_tier] ?? d.driver_tier} · ` : ''}
                        {d.city || '—'}
                      </p>
                    </div>
                    <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-bold tracking-wider ring-1 ring-line">
                      {d.vehicle_plate || '—'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-muted">Documentos</span>
                      <span className="font-bold">{uploaded}/5</span>
                    </div>
                    <div className="flex gap-1.5">
                      {DOC_KEYS.map((k, idx) => (
                        <motion.span
                          key={k}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className={cx(
                            'h-1.5 flex-1 origin-left rounded-full',
                            d.docs?.[k] ? 'bg-teal-500' : 'bg-slate-200',
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>Actualizado {timeAgo(d.docs?.updated_at ?? d.created_at)}</span>
                    <span className="flex items-center gap-1 font-semibold text-teal-600 opacity-0 transition group-hover:opacity-100">
                      Revisar <ChevronRight size={14} />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="rounded-3xl bg-white shadow-soft ring-1 ring-line">
          <EmptyState
            icon={<FileCheck2 size={24} />}
            title={filter === 'review' ? 'No hay solicitudes por revisar' : 'Nada por aquí'}
            text={
              filter === 'review'
                ? 'Cuando un conductor termine de subir sus documentos aparecerá aquí al instante.'
                : undefined
            }
          />
        </div>
      )}

      <DriverDrawer driver={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
