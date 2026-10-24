import {
  Car,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Route as RouteIcon,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { useAdminData } from '../lib/data';
import type { Route } from '../lib/useHashRoute';
import { InrideMark } from './Logo';
import { Avatar, cx } from './ui';

const NAV: { id: Route; label: string; icon: typeof Car }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'applications', label: 'Solicitudes', icon: FileCheck2 },
  { id: 'drivers', label: 'Conductores', icon: Car },
  { id: 'trips', label: 'Viajes', icon: RouteIcon },
  { id: 'deposits', label: 'Depósitos', icon: Wallet },
  { id: 'passengers', label: 'Pasajeros', icon: Users },
  { id: 'tariffs', label: 'Tarifas', icon: SlidersHorizontal },
];

function SidebarContent({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  const { profile, signOut } = useAuth();
  const { drivers, rides } = useAdminData();
  const pending = drivers.filter((d) => d.docs?.complete && d.docs.review_status === 'pending').length;
  const active = rides.filter((r) =>
    ['accepted', 'en_route_pickup', 'arrived_pickup', 'in_progress'].includes(r.status),
  ).length;
  const badges: Partial<Record<Route, number>> = { applications: pending, trips: active };

  return (
    <div className="grid-glow relative flex h-full flex-col overflow-hidden text-white">
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        <InrideMark size={44} tone="light" />
        <div>
          <p className="text-lg leading-none font-extrabold tracking-wide">INRIDEE</p>
          <p className="mt-1 text-xs font-medium text-teal-300/80">Panel de control</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const on = route === item.id;
          const Icon = item.icon;
          const badge = badges[item.id];
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cx(
                'group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                on ? 'text-navy-900' : 'text-white/70 hover:text-white',
              )}
            >
              {on ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-white shadow-lg shadow-teal-500/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.55 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-2xl bg-white/0 transition group-hover:bg-white/5" />
              )}
              <Icon size={18} className={cx('relative', on ? 'text-teal-600' : '')} />
              <span className="relative flex-1 text-left">{item.label}</span>
              {badge ? (
                <span
                  className={cx(
                    'relative min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold',
                    on ? 'bg-teal-500 text-white' : 'bg-teal-400/20 text-teal-300',
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Avatar name={profile?.name ?? 'Admin'} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{profile?.name ?? 'Administrador'}</p>
            <p className="truncate text-xs text-white/50">{profile?.email}</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Shell({
  route,
  onNavigate,
  children,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
  children: ReactNode;
}) {
  const { live, lastUpdated, refresh } = useAdminData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const doRefresh = async () => {
    setSpinning(true);
    await refresh();
    window.setTimeout(() => setSpinning(false), 400);
  };

  return (
    <div className="flex h-full">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-72">
          <SidebarContent route={route} onNavigate={onNavigate} />
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-navy-950/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-72"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <SidebarContent
                route={route}
                onNavigate={(r) => {
                  onNavigate(r);
                  setMobileOpen(false);
                }}
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-6 right-4 rounded-xl p-2 text-white/70 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line/70 bg-canvas/80 px-4 backdrop-blur-xl sm:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-ink hover:bg-white lg:hidden"
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-soft ring-1 ring-line">
            <span className="relative flex h-2.5 w-2.5">
              {live ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              ) : null}
              <span
                className={cx(
                  'relative inline-flex h-2.5 w-2.5 rounded-full',
                  live ? 'bg-emerald-500' : 'bg-slate-300',
                )}
              />
            </span>
            {live ? 'En vivo' : 'Sin tiempo real'}
          </div>
          <p className="hidden text-xs text-muted sm:block">
            {lastUpdated
              ? `Actualizado ${lastUpdated.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}`
              : 'Cargando…'}
          </p>
          <div className="flex-1" />
          <p className="hidden text-sm font-medium text-muted md:block">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => void doRefresh()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-ink shadow-soft ring-1 ring-line transition hover:text-teal-600"
            title="Actualizar"
          >
            <motion.span animate={{ rotate: spinning ? 360 : 0 }} transition={{ duration: 0.6 }}>
              <RefreshCw size={17} />
            </motion.span>
          </motion.button>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
