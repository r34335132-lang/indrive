import { Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Avatar, EmptyState, PageHeader, SearchInput, Skeleton } from '../components/ui';
import { useAdminData } from '../lib/data';
import { ageFrom, formatDate, formatMoney } from '../lib/format';

export function Passengers() {
  const { passengers, loading } = useAdminData();
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return passengers.filter(
      (p) => !q || [p.name, p.email, p.phone, p.city].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [passengers, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Usuarios"
        title="Pasajeros"
        subtitle={`${passengers.length} pasajeros registrados`}
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Buscar pasajero…" />}
      />
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-line">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : list.length ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th className="px-6 py-4">Pasajero</th>
                  <th className="px-4 py-4">Teléfono</th>
                  <th className="px-4 py-4">Ciudad</th>
                  <th className="px-4 py-4 text-right">Edad</th>
                  <th className="px-4 py-4 text-right">Viajes</th>
                  <th className="px-4 py-4 text-right">Gastado</th>
                  <th className="px-6 py-4 text-right">Registro</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => {
                  const age = ageFrom(p.birthdate);
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 15) * 0.025 }}
                      className="border-b border-line/70 transition-colors last:border-0 hover:bg-canvas"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} src={p.avatar_url} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{p.name}</p>
                            <p className="truncate text-xs text-muted">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted">{p.phone || '—'}</td>
                      <td className="px-4 py-3.5 text-muted">{p.city || '—'}</td>
                      <td className="px-4 py-3.5 text-right text-muted">{age !== null ? age : '—'}</td>
                      <td className="px-4 py-3.5 text-right font-semibold">{p.trips}</td>
                      <td className="px-4 py-3.5 text-right font-bold">{formatMoney(p.spent)}</td>
                      <td className="px-6 py-3.5 text-right text-muted">{formatDate(p.created_at)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Users size={24} />} title="Sin pasajeros" />
        )}
      </div>
    </div>
  );
}
