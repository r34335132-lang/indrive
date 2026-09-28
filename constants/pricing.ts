export type DriverTier = 'go' | 'plus' | 'master';

export type TariffConfig = {
  perKmTotal: number;
  perKmDriver: number;
  perKmApp: number;
  /** Precio por minuto de viaje. */
  perMinute: number;
  /** Precio inicial que cobra el pasajero. El dueño lo define. */
  baseFare: number;
  /** Cuota fija de la aplicación por viaje. */
  appFlatFee: number;
  /** Cobro por minuto de espera. */
  waitPerMinute: number;
  /** Bloque de sistema a cargo del conductor. No se suma al pasajero. */
  systemBlockFee: number;
  minDistanceKm: number;
  minFare: number;
  airportTollTotal: number;
  airportTollDriver: number;
  airportTollApp: number;
  /** Bonos por tipo de conductor (listos para aplicar a futuro). */
  bonusGo: number;
  bonusPlus: number;
  bonusMaster: number;
  /** When true, surgeMultiplier applies and passengers see a high-fare notice. */
  highDemandActive: boolean;
  /** Multiplier on distance+time fare during high demand (1 = normal). */
  surgeMultiplier: number;
};

/** Tarifas accesibles para La Laguna (Torreón / Gómez / Lerdo). */
export const DEFAULT_TARIFF: TariffConfig = {
  perKmTotal: 5.5,
  perKmDriver: 4,
  perKmApp: 1.5,
  perMinute: 1.2,
  baseFare: 25,
  appFlatFee: 5,
  waitPerMinute: 1,
  systemBlockFee: 300,
  minDistanceKm: 1.5,
  minFare: 35,
  airportTollTotal: 20,
  airportTollDriver: 15,
  airportTollApp: 5,
  bonusGo: 500,
  bonusPlus: 1000,
  bonusMaster: 1500,
  highDemandActive: false,
  surgeMultiplier: 1.2,
};

export const DRIVER_TIER_LABELS: Record<DriverTier, string> = {
  go: 'Go',
  plus: 'Plus',
  master: 'Master',
};

export type FareOptions = {
  /** Minutos estimados o reales del trayecto. */
  durationMinutes?: number;
  /** Minutos de espera del conductor. */
  waitMinutes?: number;
  /** Sedan = tarifa base; SUV = +20%. */
  vehicle?: 'Sedan' | 'SUV';
};

export type FareBreakdown = {
  distanceKm: number;
  billableKm: number;
  durationMinutes: number;
  waitMinutes: number;
  distanceFare: number;
  timeFare: number;
  waitFare: number;
  baseFare: number;
  appFlatFee: number;
  /** A cargo del conductor. No forma parte del total del pasajero. */
  systemBlockFee: number;
  airportToll: number;
  total: number;
  driverNet: number;
  appNet: number;
  isAirport: boolean;
  isHighDemand: boolean;
  surgeMultiplier: number;
  baseTotal: number;
  vehicle: 'Sedan' | 'SUV';
};

export function isAirportTrip(origin: string, destination: string) {
  const text = `${origin} ${destination}`.toLowerCase();
  return text.includes('aeropuerto') || text.includes('airport') || text.includes('sarabia');
}

/** Estima minutos de viaje a partir de km (~28 km/h urbano Laguna). */
export function estimateDurationMinutes(distanceKm: number) {
  return Math.max(5, Math.round(distanceKm * 2.1));
}

export function getDriverTierBonus(tier: DriverTier, tariff: TariffConfig = DEFAULT_TARIFF) {
  if (tier === 'master') return tariff.bonusMaster;
  if (tier === 'plus') return tariff.bonusPlus;
  return tariff.bonusGo;
}

/** Multiplicador sobre la tarifa según tipo de vehículo (precios base Laguna). */
export const VEHICLE_MULTIPLIER: Record<'Sedan' | 'SUV', number> = {
  Sedan: 1,
  SUV: 1.2,
};

export function calculateFare(
  distanceKm: number,
  origin: string,
  destination: string,
  tariff: TariffConfig = DEFAULT_TARIFF,
  options: FareOptions = {},
): FareBreakdown {
  const billableKm = Math.max(distanceKm, tariff.minDistanceKm);
  const durationMinutes = options.durationMinutes ?? estimateDurationMinutes(billableKm);
  const waitMinutes = Math.max(0, options.waitMinutes ?? 0);
  const startingPrice = Math.max(0, tariff.baseFare);
  const lowestFare = Math.max(startingPrice, tariff.minFare);

  const surge =
    tariff.highDemandActive && tariff.surgeMultiplier > 1 ? tariff.surgeMultiplier : 1;

  const rawDistanceFare = Math.max(billableKm * tariff.perKmTotal, 0);
  const rawTimeFare = durationMinutes * tariff.perMinute;
  const waitFare = waitMinutes * tariff.waitPerMinute;
  const baseFare = startingPrice;
  const appFlatFee = tariff.appFlatFee;
  const systemBlockFee = tariff.systemBlockFee;

  const preSurgeCore = baseFare + rawDistanceFare + rawTimeFare;
  const distanceFare = Math.round(rawDistanceFare * surge * 100) / 100;
  const timeFare = Math.round(rawTimeFare * surge * 100) / 100;

  const airport = isAirportTrip(origin, destination);
  const airportToll = airport ? tariff.airportTollTotal : 0;
  const vehicle = options.vehicle === 'SUV' ? 'SUV' : 'Sedan';
  const vehicleMult = VEHICLE_MULTIPLIER[vehicle];

  let subtotal = baseFare + distanceFare + timeFare + waitFare + appFlatFee + airportToll;
  if (subtotal < lowestFare) {
    subtotal = lowestFare;
  }
  subtotal = Math.round(subtotal * vehicleMult * 100) / 100;

  const baseTotal = Math.round((preSurgeCore + waitFare + appFlatFee + airportToll) * vehicleMult * 100) / 100;

  let driverNet = billableKm * tariff.perKmDriver * surge + timeFare + waitFare + baseFare;
  let appNet = billableKm * tariff.perKmApp * surge + appFlatFee;

  if (airport) {
    driverNet += tariff.airportTollDriver;
    appNet += tariff.airportTollApp;
  }

  driverNet *= vehicleMult;
  appNet *= vehicleMult;

  const splitSum = driverNet + appNet;
  if (splitSum > 0 && Math.abs(splitSum - subtotal) > 0.05) {
    const ratio = subtotal / splitSum;
    driverNet *= ratio;
    appNet *= ratio;
  }

  return {
    distanceKm,
    billableKm,
    durationMinutes,
    waitMinutes,
    distanceFare: Math.round(distanceFare * vehicleMult * 100) / 100,
    timeFare: Math.round(timeFare * vehicleMult * 100) / 100,
    waitFare: Math.round(waitFare * vehicleMult * 100) / 100,
    baseFare: Math.round(baseFare * vehicleMult * 100) / 100,
    appFlatFee: Math.round(appFlatFee * vehicleMult * 100) / 100,
    systemBlockFee,
    airportToll: Math.round(airportToll * vehicleMult * 100) / 100,
    total: subtotal,
    driverNet: Math.round(driverNet * 100) / 100,
    appNet: Math.round(appNet * 100) / 100,
    isAirport: airport,
    isHighDemand: surge > 1,
    surgeMultiplier: surge,
    baseTotal,
    vehicle,
  };
}

export function formatMoney(amount?: number | null) {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `$${value.toFixed(2)}`;
}

const ROUTE_DISTANCES: Array<{ match: RegExp; km: number }> = [
  { match: /aeropuerto|sarabia/i, km: 8.5 },
  { match: /galer[ií]as/i, km: 6.2 },
  { match: /g[oó]mez/i, km: 7.8 },
  { match: /lerdo/i, km: 9.5 },
  { match: /cuatro caminos/i, km: 4.5 },
  { match: /hospital/i, km: 5.2 },
];

export function estimateDistanceKm(origin: string, destination: string) {
  const text = `${origin} ${destination}`;
  for (const route of ROUTE_DISTANCES) {
    if (route.match.test(text)) return route.km;
  }
  return 5.5;
}
