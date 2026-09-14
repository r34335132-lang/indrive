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

export const DEFAULT_TARIFF: TariffConfig = {
  perKmTotal: 10,
  perKmDriver: 7,
  perKmApp: 3,
  perMinute: 3,
  baseFare: 30,
  appFlatFee: 13.2,
  waitPerMinute: 1,
  systemBlockFee: 300,
  minDistanceKm: 2,
  minFare: 30,
  airportTollTotal: 30,
  airportTollDriver: 22,
  airportTollApp: 8,
  bonusGo: 1000,
  bonusPlus: 2000,
  bonusMaster: 3000,
  highDemandActive: true,
  surgeMultiplier: 1.4,
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
};

export function isAirportTrip(origin: string, destination: string) {
  const text = `${origin} ${destination}`.toLowerCase();
  return text.includes('aeropuerto') || text.includes('airport');
}

/** Estima minutos de viaje a partir de km (~24 km/h urbano). */
export function estimateDurationMinutes(distanceKm: number) {
  return Math.max(5, Math.round(distanceKm * 2.5));
}

export function getDriverTierBonus(tier: DriverTier, tariff: TariffConfig = DEFAULT_TARIFF) {
  if (tier === 'master') return tariff.bonusMaster;
  if (tier === 'plus') return tariff.bonusPlus;
  return tariff.bonusGo;
}

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
  const startingPrice = Math.max(30, tariff.baseFare);
  const lowestFare = Math.max(30, tariff.minFare);

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

  let subtotal = baseFare + distanceFare + timeFare + waitFare + appFlatFee + airportToll;
  if (subtotal < lowestFare) {
    subtotal = lowestFare;
  }

  const baseTotal = preSurgeCore + waitFare + appFlatFee + airportToll;

  let driverNet = billableKm * tariff.perKmDriver * surge + timeFare + waitFare + baseFare;
  let appNet = billableKm * tariff.perKmApp * surge + appFlatFee;

  if (airport) {
    driverNet += tariff.airportTollDriver;
    appNet += tariff.airportTollApp;
  }

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
    distanceFare,
    timeFare,
    waitFare,
    baseFare,
    appFlatFee,
    systemBlockFee,
    airportToll,
    total: Math.round(subtotal * 100) / 100,
    driverNet: Math.round(driverNet * 100) / 100,
    appNet: Math.round(appNet * 100) / 100,
    isAirport: airport,
    isHighDemand: surge > 1,
    surgeMultiplier: surge,
    baseTotal: Math.round(baseTotal * 100) / 100,
  };
}

export function formatMoney(amount?: number | null) {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `$${value.toFixed(2)}`;
}

const ROUTE_DISTANCES: Array<{ match: RegExp; km: number }> = [
  { match: /aeropuerto/i, km: 18.4 },
  { match: /hospital/i, km: 6.8 },
  { match: /centro comercial/i, km: 5.1 },
  { match: /parque guadiana/i, km: 4.2 },
  { match: /jardines/i, km: 3.9 },
  { match: /tec nm/i, km: 7.2 },
  { match: /gobernador/i, km: 4.8 },
];

export function estimateDistanceKm(origin: string, destination: string) {
  const text = `${origin} ${destination}`;
  for (const route of ROUTE_DISTANCES) {
    if (route.match.test(text)) return route.km;
  }
  return 4.2;
}
