import {
  ArrowUpRight,
  Banknote,
  Car,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InrideIcon } from '../components/Logo';
import { AnimatedNumber, Avatar, Badge, Card, CardHeader, cx, EmptyState, Skeleton } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useAdminData } from '../lib/data';
import { ACTIVE_STATUSES, formatMoney, RIDE_STATUS, timeAgo } from '../lib/format';
import type { Route } from '../lib/useHashRoute';

const DAY = 86_400_000;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function Overview({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { profile } = useAuth();
  const { rides, drivers, passengers, loading } = useAdminData();

  const stats = useMemo(() => {
    const completed = rides.filter((r) => r.status === 'completed');
    const revenue = completed.reduce((s, r) => s + r.price, 0);
    const app = completed.reduce((s, r) => s + r.app_net, 0);
    const payout = completed.reduce((s, r) => s + r.driver_net, 0);
    const km = completed.reduce((s, r) => s + r.distance_km, 0);
    const today = dayKey(new Date());
    const todayRides = rides.filter((r) => dayKey(new Date(r.created_at)) === today);
    const todayRevenue = todayRides
      .filter((r) => r.status === 'completed')
      .reduce((s, r) => s + r.price, 0);

    const series = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * DAY);
      return {
        key: dayKey(d),
        label: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        ingresos: 0,
        comision: 0,
        viajes: 0,
      };
    });
    const byKey = new Map(series.map((s) => [s.key, s]));
    for (const r of rides) {
      const s = byKey.get(dayKey(new Date(r.created_at)));
      if (!s) continue;
      s.viajes += 1;
      if (r.status === 'completed') {
        s.ingresos += r.price;
        s.comision += r.app_net;
      }
    }

    const hours = Array.from({ length: 24 }, (_, h) => ({ hora: `${h}h`, viajes: 0 }));
    for (const r of rides) hours[new Date(r.created_at).getHours()].viajes += 1;

    const cancelled = rides.filter((r) => r.status === 'cancelled').length;
    const active = rides.filter((r) => ACTIVE_STATUSES.includes(r.status));
    const statusPie = [
      { name: 'Completados', value: completed.length, color: '#17a9b1' },
      { name: 'Activos', value: active.length, color: '#0b2545' },
      { name: 'Cancelados', value: cancelled, color: '#f43f5e' },
    ].filter((s) => s.value > 0);

    const pending = drivers.filter((d) => d.docs?.complete && d.docs.review_status === 'pending');
    const approved = drivers.filter((d) => d.docs?.review_status === 'approved');
    const topDrivers = [...drivers].sort((a, b) => b.earnings - a.earnings).slice(0, 5);
    const rated = completed.filter((r) => typeof r.rating === 'number');
    const avgRating = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : 0;

    return {
      completed,
      revenue,
      app,
      payout,
      km,
      todayRides,
      todayRevenue,
      series,
      hours,
      statusPie,
      active,
      pending,
      approved,
      topDrivers,
      avgRating,
      completionRate: rides.length ? (completed.length / rides.length) * 100 : 0,
    };
  }, [drivers, rides]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid-glow relative overflow-hidden rounded-[2rem] p-8 text-white shadow-lift"
      >
        <div className="pointer-events-none absolute -top-6 right-6 opacity-[0.12]">
          <InrideIcon size={260} arcColor="#3fd0d6" pinColor="#ffffff" />
        </div>
        <p className="text-sm font-semibold text-teal-300">{greeting},</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {profile?.first_name || profile?.name || 'Administrador'} 👋
        </h1>
        <p className="mt-2 max-w-xl text-white/60">
          Esto es lo que está pasando hoy en INRIDEE.
        </p>
        <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Viajes hoy', value: stats.todayRides.length, fmt: undefined },
            { label: 'Ingresos hoy', value: stats.todayRevenue, fmt: formatMoney },
            { label: 'Viajes activos', value: stats.active.length, fmt: undefined },
            { label: 'Por aprobar', value: stats.pending.length, fmt: undefined },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 backdrop-blur"
            >
              <p className="text-xs font-medium text-white/50">{item.label}</p>
              <AnimatedNumber
                value={item.value}
                format={item.fmt}
                className="mt-1 block text-2xl font-extrabold"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          delay={0.05}
          icon={<Banknote size={20} />}
          label="Ingresos totales"
          value={stats.revenue}
          format={formatMoney}
          sub={`${formatMoney(stats.payout)} pagado a conductores`}
          spark={stats.series.map((s) => s.ingresos)}
        />
        <Kpi
          delay={0.1}
          icon={<TrendingUp size={20} />}
          label="Comisión INRIDEE"
          value={stats.app}
          format={formatMoney}
          sub="Ganancia neta de la app"
          spark={stats.series.map((s) => s.comision)}
          accent
        />
        <Kpi
          delay={0.15}
          icon={<CheckCircle2 size={20} />}
          label="Viajes completados"
          value={stats.completed.length}
          sub={`${stats.completionRate.toFixed(0)}% de finalización · ${stats.km.toFixed(0)} km`}
          spark={stats.series.map((s) => s.viajes)}
        />
        <Kpi
          delay={0.2}
          icon={<Car size={20} />}
          label="Conductores activos"
          value={stats.approved.length}
          sub={`${passengers.length} pasajeros registrados`}
          spark={stats.series.map((s) => s.viajes)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" delay={0.1}>
          <CardHeader title="Ingresos de los últimos 14 días" subtitle="Total cobrado vs. comisión de la app" />
          <div className="h-72 px-2 pt-4 pb-4">
            {loading ? (
              <Skeleton className="mx-4 h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.series} margin={{ left: 0, right: 16, top: 8 }}>
                  <defs>
                    <linearGradient id="gIngresos" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#17a9b1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#17a9b1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gComision" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0b2545" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0b2545" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e5ebf1" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6b7a8c', fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: '#6b7a8c', fontSize: 12 }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip content={<ChartTooltip money />} />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="Ingresos"
                    stroke="#17a9b1"
                    strokeWidth={2.5}
                    fill="url(#gIngresos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="comision"
                    name="Comisión"
                    stroke="#0b2545"
                    strokeWidth={2}
                    fill="url(#gComision)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card delay={0.15}>
          <CardHeader title="Estado de los viajes" subtitle={`${rides.length} viajes en total`} />
          <div className="relative h-56">
            {stats.statusPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {stats.statusPie.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<MapPin size={22} />} title="Sin viajes todavía" />
            )}
            {stats.statusPie.length ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold">{stats.completionRate.toFixed(0)}%</span>
                <span className="text-xs text-muted">completados</span>
              </div>
            ) : null}
          </div>
          <div className="space-y-2 px-6 pb-6">
            {stats.statusPie.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card delay={0.1}>
          <CardHeader
            title="Viajes en curso"
            subtitle="Se actualiza en tiempo real"
            action={
              <button onClick={() => onNavigate('trips')} className="text-sm font-semibold text-teal-600 hover:underline">
                Ver todos
              </button>
            }
          />
          <div className="space-y-2 p-4">
            {stats.active.slice(0, 6).map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-canvas"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.destination}</p>
                  <p className="truncate text-xs text-muted">
                    {r.passenger_name || 'Pasajero'} · {r.driver_name || 'Sin conductor'}
                  </p>
                </div>
                <Badge tone={RIDE_STATUS[r.status].tone}>{RIDE_STATUS[r.status].label}</Badge>
              </motion.div>
            ))}
            {!stats.active.length ? (
              <EmptyState icon={<Clock size={22} />} title="Nada en curso" text="Los viajes activos aparecerán aquí al instante." />
            ) : null}
          </div>
        </Card>

        <Card delay={0.15}>
          <CardHeader
            title="Conductores por aprobar"
            subtitle="Documentos completos esperando revisión"
            action={
              <button
                onClick={() => onNavigate('applications')}
                className="text-sm font-semibold text-teal-600 hover:underline"
              >
                Revisar
              </button>
            }
          />
          <div className="space-y-2 p-4">
            {stats.pending.slice(0, 5).map((d, i) => (
              <motion.button
                key={d.id}
                onClick={() => onNavigate('applications')}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-canvas"
              >
                <Avatar name={d.name} src={d.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || 'Vehículo'} · {d.vehicle_plate ?? '—'}
                  </p>
                </div>
                <span className="text-xs text-muted">{timeAgo(d.docs?.updated_at)}</span>
              </motion.button>
            ))}
            {!stats.pending.length ? (
              <EmptyState icon={<FileCheck2 size={22} />} title="Todo al día" text="No hay solicitudes pendientes." />
            ) : null}
          </div>
        </Card>

        <Card delay={0.2}>
          <CardHeader title="Top conductores" subtitle="Por ganancias acumuladas" />
          <div className="space-y-1 p-4">
            {stats.topDrivers.map((d, i) => {
              const max = stats.topDrivers[0]?.earnings || 1;
              return (
                <div key={d.id} className="rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-muted">{i + 1}</span>
                    <Avatar name={d.name} src={d.avatar_url} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-muted">{d.completedTrips} viajes</p>
                    </div>
                    <span className="text-sm font-bold">{formatMoney(d.earnings)}</span>
                  </div>
                  <div className="mt-2 ml-8 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.earnings / max) * 100}%` }}
                      transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              );
            })}
            {!stats.topDrivers.length ? (
              <EmptyState icon={<Car size={22} />} title="Sin conductores aún" />
            ) : null}
          </div>
        </Card>
      </div>

      <Card delay={0.1}>
        <CardHeader
          title="Horas con más demanda"
          subtitle={`Viajes solicitados por hora del día · calificación promedio ${stats.avgRating ? stats.avgRating.toFixed(1) : '—'} ★`}
        />
        <div className="h-60 px-2 pt-4 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.hours} margin={{ left: 0, right: 16 }}>
              <CartesianGrid vertical={false} stroke="#e5ebf1" />
              <XAxis dataKey="hora" tickLine={false} axisLine={false} tick={{ fill: '#6b7a8c', fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fill: '#6b7a8c', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(23,169,177,0.08)' }} content={<ChartTooltip />} />
              <Bar dataKey="viajes" name="Viajes" radius={[8, 8, 0, 0]} fill="#17a9b1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  format,
  sub,
  spark,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: (n: number) => string;
  sub: string;
  spark: number[];
  accent?: boolean;
  delay: number;
}) {
  const data = spark.map((v, i) => ({ i, v }));
  const gid = `spark-${label.replace(/\W+/g, '')}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cx(
        'group relative overflow-hidden rounded-3xl p-5 shadow-soft ring-1 transition-shadow hover:shadow-lift',
        accent ? 'bg-navy-900 text-white ring-navy-800' : 'bg-white ring-line',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cx(
            'flex h-10 w-10 items-center justify-center rounded-2xl',
            accent ? 'bg-teal-400/15 text-teal-300' : 'bg-teal-500/10 text-teal-600',
          )}
        >
          {icon}
        </span>
        <ArrowUpRight size={18} className={cx('opacity-0 transition group-hover:opacity-100', accent ? 'text-teal-300' : 'text-teal-600')} />
      </div>
      <p className={cx('mt-4 text-sm font-medium', accent ? 'text-white/60' : 'text-muted')}>{label}</p>
      <AnimatedNumber value={value} format={format} className="mt-1 block text-3xl font-extrabold tracking-tight" />
      <p className={cx('mt-1 text-xs', accent ? 'text-white/50' : 'text-muted')}>{sub}</p>
      <div className="pointer-events-none absolute right-0 bottom-0 h-16 w-32 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={accent ? '#3fd0d6' : '#17a9b1'} stopOpacity={0.4} />
                <stop offset="100%" stopColor={accent ? '#3fd0d6' : '#17a9b1'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={accent ? '#3fd0d6' : '#17a9b1'}
              strokeWidth={2}
              fill={`url(#${gid})`}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

type TooltipPayload = { name?: string; value?: number; color?: string; payload?: { label?: string } };

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-navy-900 px-4 py-3 text-xs text-white shadow-lift">
      {label !== undefined ? <p className="mb-1 font-semibold text-white/60">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 font-semibold">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? '#17a9b1' }} />
          {p.name}: {money ? formatMoney(Number(p.value)) : p.value}
        </p>
      ))}
    </div>
  );
}
