import { mapTariff } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { TariffRow } from '@/types';
import type { TariffConfig } from '@/constants/pricing';
import { DEFAULT_TARIFF } from '@/constants/pricing';

export function tariffRowToConfig(row: TariffRow): TariffConfig {
  return {
    perKmTotal: row.perKmTotal,
    perKmDriver: row.perKmDriver,
    perKmApp: row.perKmApp,
    perMinute: row.perMinute,
    baseFare: row.baseFare,
    appFlatFee: row.appFlatFee,
    waitPerMinute: row.waitPerMinute,
    systemBlockFee: row.systemBlockFee,
    minDistanceKm: row.minDistanceKm,
    minFare: row.minFare,
    airportTollTotal: row.airportTollTotal,
    airportTollDriver: row.airportTollDriver,
    airportTollApp: row.airportTollApp,
    bonusGo: row.bonusGo,
    bonusPlus: row.bonusPlus,
    bonusMaster: row.bonusMaster,
    highDemandActive: row.highDemandActive,
    surgeMultiplier: row.surgeMultiplier,
  };
}

export async function fetchActiveTariff(): Promise<TariffConfig> {
  const { data, error } = await supabase.from('tariffs').select('*').eq('active', true).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_TARIFF;
  return tariffRowToConfig(mapTariff(data));
}

const PATCH_MAP: Record<keyof TariffConfig, string> = {
  perKmTotal: 'per_km_total',
  perKmDriver: 'per_km_driver',
  perKmApp: 'per_km_app',
  perMinute: 'per_minute',
  baseFare: 'base_fare',
  appFlatFee: 'app_flat_fee',
  waitPerMinute: 'wait_per_minute',
  systemBlockFee: 'system_block_fee',
  minDistanceKm: 'min_distance_km',
  minFare: 'min_fare',
  airportTollTotal: 'airport_toll_total',
  airportTollDriver: 'airport_toll_driver',
  airportTollApp: 'airport_toll_app',
  bonusGo: 'bonus_go',
  bonusPlus: 'bonus_plus',
  bonusMaster: 'bonus_master',
  highDemandActive: 'high_demand_active',
  surgeMultiplier: 'surge_multiplier',
};

export async function updateActiveTariff(values: Partial<TariffConfig>): Promise<TariffConfig> {
  const { data: current, error: findError } = await supabase
    .from('tariffs')
    .select('id')
    .eq('active', true)
    .maybeSingle();
  if (findError) throw findError;
  if (!current) throw new Error('No active tariff');

  const patch: Record<string, unknown> = {};
  (Object.keys(values) as Array<keyof TariffConfig>).forEach((key) => {
    const value = values[key];
    if (value !== undefined) patch[PATCH_MAP[key]] = value;
  });

  const { data, error } = await supabase
    .from('tariffs')
    .update(patch)
    .eq('id', current.id)
    .select('*')
    .single();
  if (error) throw error;
  return tariffRowToConfig(mapTariff(data));
}

export async function resetActiveTariff(): Promise<TariffConfig> {
  return updateActiveTariff(DEFAULT_TARIFF);
}
