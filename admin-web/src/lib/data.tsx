import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchDailyBlocks, fetchDeposits, fetchDriverDocs, fetchProfiles, fetchRides } from './api';
import { todayMx } from './format';
import { supabase } from './supabase';
import type { DailyBlock, Driver, DriverDeposit, DriverDocsRow, Passenger, Profile, Ride } from './types';

type AdminData = {
  profiles: Profile[];
  docs: DriverDocsRow[];
  rides: Ride[];
  deposits: DriverDeposit[];
  dailyBlocks: DailyBlock[];
  drivers: Driver[];
  passengers: Passenger[];
  loading: boolean;
  error: string | null;
  live: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [docs, setDocs] = useState<DriverDocsRow[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [deposits, setDeposits] = useState<DriverDeposit[]>([]);
  const [dailyBlocks, setDailyBlocks] = useState<DailyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, d, r, dep, blocks] = await Promise.all([
        fetchProfiles(),
        fetchDriverDocs(),
        fetchRides(),
        fetchDeposits(),
        fetchDailyBlocks(),
      ]);
      setProfiles(p);
      setDocs(d);
      setRides(r);
      setDeposits(dep);
      setDailyBlocks(blocks);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), 60_000);

    const scheduleRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refresh(), 800);
    };

    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_deposits' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_daily_blocks' }, scheduleRefresh)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));

    return () => {
      window.clearInterval(poll);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const drivers = useMemo<Driver[]>(() => {
    const docsById = new Map(docs.map((d) => [d.user_id, d]));
    const stats = new Map<string, { trips: number; earnings: number; last: string | null }>();
    for (const r of rides) {
      if (!r.driver_id || r.status !== 'completed') continue;
      const s = stats.get(r.driver_id) ?? { trips: 0, earnings: 0, last: null };
      s.trips += 1;
      s.earnings += r.driver_net;
      const at = r.completed_at ?? r.created_at;
      if (!s.last || at > s.last) s.last = at;
      stats.set(r.driver_id, s);
    }
    const today = todayMx();
    const blocksByDriver = new Map<string, { today: DailyBlock | null; overdue: DailyBlock[] }>();
    for (const b of dailyBlocks) {
      const entry = blocksByDriver.get(b.driver_id) ?? { today: null, overdue: [] };
      if (b.day === today) entry.today = b;
      else if (b.status === 'pending' && b.day < today) entry.overdue.push(b);
      blocksByDriver.set(b.driver_id, entry);
    }
    return profiles
      .filter((p) => p.roles?.includes('driver') || docsById.has(p.id))
      .map((p) => {
        const s = stats.get(p.id);
        const blocks = blocksByDriver.get(p.id);
        return {
          ...p,
          docs: docsById.get(p.id) ?? null,
          completedTrips: s?.trips ?? 0,
          earnings: s?.earnings ?? 0,
          lastTripAt: s?.last ?? null,
          blockToday: blocks?.today ?? null,
          blocksOverdue: (blocks?.overdue ?? []).sort((a, b) => a.day.localeCompare(b.day)),
        };
      });
  }, [dailyBlocks, docs, profiles, rides]);

  const passengers = useMemo<Passenger[]>(() => {
    const stats = new Map<string, { trips: number; spent: number }>();
    for (const r of rides) {
      if (r.status !== 'completed') continue;
      const s = stats.get(r.passenger_id) ?? { trips: 0, spent: 0 };
      s.trips += 1;
      s.spent += r.price;
      stats.set(r.passenger_id, s);
    }
    return profiles
      .filter((p) => p.roles?.includes('passenger'))
      .map((p) => ({ ...p, trips: stats.get(p.id)?.trips ?? 0, spent: stats.get(p.id)?.spent ?? 0 }));
  }, [profiles, rides]);

  const value = useMemo(
    () => ({
      profiles,
      docs,
      rides,
      deposits,
      dailyBlocks,
      drivers,
      passengers,
      loading,
      error,
      live,
      lastUpdated,
      refresh,
    }),
    [dailyBlocks, deposits, docs, drivers, error, lastUpdated, live, loading, passengers, profiles, refresh, rides],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminData debe usarse dentro de AdminDataProvider');
  return ctx;
}
