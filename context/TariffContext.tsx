import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  calculateFare,
  DEFAULT_TARIFF,
  type FareBreakdown,
  type FareOptions,
  type TariffConfig,
} from '@/constants/pricing';
import { fetchActiveTariff, resetActiveTariff, updateActiveTariff } from '@/lib/api/tariffs';
import { isSupabaseConfigured } from '@/lib/supabase';

type TariffContextValue = {
  tariff: TariffConfig;
  updateTariff: (values: Partial<TariffConfig>) => Promise<void>;
  resetTariff: () => Promise<void>;
  getFare: (
    distanceKm: number,
    origin: string,
    destination: string,
    options?: FareOptions,
  ) => FareBreakdown;
  refreshTariff: () => Promise<void>;
};

const TariffContext = createContext<TariffContextValue | null>(null);

export function TariffProvider({ children }: { children: React.ReactNode }) {
  const [tariff, setTariff] = useState<TariffConfig>(DEFAULT_TARIFF);

  const refreshTariff = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const next = await fetchActiveTariff();
      setTariff(next);
    } catch {
      setTariff(DEFAULT_TARIFF);
    }
  }, []);

  useEffect(() => {
    refreshTariff();
  }, [refreshTariff]);

  const updateTariff = useCallback(async (values: Partial<TariffConfig>) => {
    if (!isSupabaseConfigured) {
      setTariff((current) => ({ ...current, ...values }));
      return;
    }
    const next = await updateActiveTariff(values);
    setTariff(next);
  }, []);

  const resetTariff = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setTariff(DEFAULT_TARIFF);
      return;
    }
    const next = await resetActiveTariff();
    setTariff(next);
  }, []);

  const getFare = useCallback(
    (distanceKm: number, origin: string, destination: string, options?: FareOptions) =>
      calculateFare(distanceKm, origin, destination, tariff, options),
    [tariff],
  );

  const value = useMemo(
    () => ({ tariff, updateTariff, resetTariff, getFare, refreshTariff }),
    [tariff, updateTariff, resetTariff, getFare, refreshTariff],
  );

  return <TariffContext.Provider value={value}>{children}</TariffContext.Provider>;
}

export function useTariff() {
  const context = useContext(TariffContext);
  if (!context) throw new Error('useTariff must be used inside TariffProvider');
  return context;
}
