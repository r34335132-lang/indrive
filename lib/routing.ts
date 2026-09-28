import type { OsrmRoute, OsrmStep } from '@/types';

export type LatLng = { latitude: number; longitude: number };

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const ROUTE_TIMEOUT_MS = 8000;
const MAX_OUTLINE_POINTS = 120;
const MAX_ANIM_POINTS = 220;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function distanceMeters(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isValidLatLng(point: LatLng | null | undefined): point is LatLng {
  if (!point) return false;
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

/** Reduce puntos para no tumbar MapView / WebView al dibujar la polilínea. */
export function downsampleRoute(route: LatLng[], maxPoints = MAX_OUTLINE_POINTS): LatLng[] {
  const clean = route.filter(isValidLatLng);
  if (clean.length <= maxPoints) return clean;
  const step = Math.ceil(clean.length / maxPoints);
  const out: LatLng[] = [];
  for (let i = 0; i < clean.length; i += step) out.push(clean[i]);
  const last = clean[clean.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Suaviza la polilínea para animación del auto. */
export function densifyRoute(route: LatLng[], metersPerPoint = 12): LatLng[] {
  const clean = route.filter(isValidLatLng);
  if (clean.length < 2) return clean;
  const points: LatLng[] = [clean[0]];
  for (let i = 0; i < clean.length - 1; i += 1) {
    const from = clean[i];
    const to = clean[i + 1];
    const meters = distanceMeters(from, to);
    if (!Number.isFinite(meters) || meters <= 0) {
      points.push(to);
      continue;
    }
    const steps = Math.max(1, Math.min(24, Math.round(meters / metersPerPoint)));
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      points.push({
        latitude: lerp(from.latitude, to.latitude, t),
        longitude: lerp(from.longitude, to.longitude, t),
      });
      if (points.length >= MAX_ANIM_POINTS) return points;
    }
  }
  return points;
}

export function bearingBetween(from: LatLng, to: LatLng) {
  if (!isValidLatLng(from) || !isValidLatLng(to)) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function remainingDistanceKm(path: LatLng[], fromIndex: number) {
  let meters = 0;
  for (let i = Math.max(0, fromIndex); i < path.length - 1; i += 1) {
    if (!isValidLatLng(path[i]) || !isValidLatLng(path[i + 1])) continue;
    meters += distanceMeters(path[i], path[i + 1]);
  }
  return Math.max(0.05, meters / 1000);
}

export function distanceKmBetween(a: LatLng, b: LatLng) {
  if (!isValidLatLng(a) || !isValidLatLng(b)) return Number.POSITIVE_INFINITY;
  return distanceMeters(a, b) / 1000;
}

export const PICKUP_POINT: LatLng = { latitude: 25.5428, longitude: -103.4068 };
export const DESTINATION_POINT: LatLng = { latitude: 25.5685, longitude: -103.4328 };
export const DRIVER_NEARBY: LatLng = { latitude: 25.5512, longitude: -103.4065 };

function straightFallback(from: LatLng, to: LatLng): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    points.push({
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    });
  }
  return points;
}

type OsrmStepRaw = {
  name?: string;
  distance?: number;
  duration?: number;
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
    bearing_after?: number;
    bearing_before?: number;
  };
};

type OsrmResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: number[][] };
    legs?: Array<{ steps?: OsrmStepRaw[] }>;
  }>;
};

const MODIFIER_ES: Record<string, string> = {
  left: 'izquierda',
  right: 'derecha',
  'sharp left': 'izquierda cerrada',
  'sharp right': 'derecha cerrada',
  'slight left': 'ligeramente a la izquierda',
  'slight right': 'ligeramente a la derecha',
  straight: 'recto',
  uturn: 'retorno',
};

export function buildStepInstruction(
  type: string,
  modifier: string,
  streetName: string,
): { instruction: string; shortInstruction: string } {
  const t = (type || '').toLowerCase();
  const m = (modifier || '').toLowerCase();
  const street = streetName?.trim();
  const modEs = MODIFIER_ES[m] ?? '';

  if (t === 'depart') {
    return {
      shortInstruction: 'Sal',
      instruction: street ? `Sal por ${street}` : 'Inicia la ruta',
    };
  }
  if (t === 'arrive') {
    return {
      shortInstruction: 'Llegada',
      instruction: street ? `Llegaste a ${street}` : 'Has llegado',
    };
  }
  if (t === 'roundabout' || t === 'rotary') {
    return {
      shortInstruction: 'Rotonda',
      instruction: street ? `Entra a la rotonda hacia ${street}` : 'Entra a la rotonda',
    };
  }
  if (m.includes('uturn')) {
    return { shortInstruction: 'Retorno', instruction: 'Da la vuelta' };
  }
  if (m.includes('left')) {
    return {
      shortInstruction: 'Izquierda',
      instruction: street
        ? `Gira a la ${modEs || 'izquierda'} en ${street}`
        : `Gira a la ${modEs || 'izquierda'}`,
    };
  }
  if (m.includes('right')) {
    return {
      shortInstruction: 'Derecha',
      instruction: street
        ? `Gira a la ${modEs || 'derecha'} en ${street}`
        : `Gira a la ${modEs || 'derecha'}`,
    };
  }
  if (m.includes('straight') || t === 'new name' || t === 'continue' || t === 'merge') {
    return {
      shortInstruction: 'Sigue',
      instruction: street ? `Continúa por ${street}` : 'Continúa recto',
    };
  }
  return {
    shortInstruction: 'Sigue',
    instruction: street ? `Continúa hacia ${street}` : 'Sigue la ruta',
  };
}

function parseOsrmSteps(route: NonNullable<OsrmResponse['routes']>[number]): OsrmStep[] {
  const raw = route.legs?.flatMap((leg) => leg.steps ?? []) ?? [];
  const steps: OsrmStep[] = [];
  for (const item of raw) {
    const loc = item.maneuver?.location;
    if (!loc || loc.length < 2) continue;
    const type = item.maneuver?.type ?? 'continue';
    const modifier = item.maneuver?.modifier ?? '';
    const streetName = (item.name ?? '').trim();
    const { instruction, shortInstruction } = buildStepInstruction(type, modifier, streetName);
    steps.push({
      instruction,
      shortInstruction,
      streetName,
      distanceMeters: item.distance ?? 0,
      durationSeconds: item.duration ?? 0,
      type,
      modifier,
      location: { latitude: loc[1], longitude: loc[0] },
      bearingAfter: item.maneuver?.bearing_after ?? 0,
    });
  }
  return steps;
}

async function fetchWithTimeout(url: string, ms = ROUTE_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'inride-app/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Fallback si OSRM no responde: línea recta estimada. */
export function straightLineRoute(from: LatLng, to: LatLng, via: LatLng[] = []): OsrmRoute {
  const points = [from, ...via.filter(isValidLatLng), to].filter(isValidLatLng);
  let meters = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    meters += distanceMeters(points[i], points[i + 1]);
  }
  const roadMeters = meters * 1.35;
  return {
    coordinates: densifyRoute(points, 40),
    distanceMeters: roadMeters,
    durationSeconds: Math.max(180, (roadMeters / 1000) * 150),
  };
}

/**
 * Ruta con paradas. Nunca deja la UI sin camino: si OSRM falla, usa línea estimada.
 * Devuelve también `source` para depurar en iOS/Android.
 */
export async function getOsrmRouteVia(
  points: LatLng[],
): Promise<OsrmRoute & { source: 'osrm' | 'fallback' }> {
  const clean = points.filter(isValidLatLng);
  if (clean.length < 2) {
    const fallback = straightLineRoute(DRIVER_NEARBY, PICKUP_POINT);
    return { ...fallback, source: 'fallback' };
  }

  const path = clean.map((p) => `${p.longitude},${p.latitude}`).join(';');
  // steps=true → instrucciones turn-by-turn; overview=full para seguir mejor el camino
  const url = `${OSRM_BASE}/${path}?overview=full&geometries=geojson&steps=true&annotations=false`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.warn('[routing] OSRM HTTP', response.status);
      return { ...straightLineRoute(clean[0], clean[clean.length - 1], clean.slice(1, -1)), source: 'fallback' };
    }
    const data = (await response.json()) as OsrmResponse;
    const route = data.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (data.code !== 'Ok' || !route || !coordinates?.length) {
      console.warn('[routing] OSRM code', data.code, data.message);
      return { ...straightLineRoute(clean[0], clean[clean.length - 1], clean.slice(1, -1)), source: 'fallback' };
    }

    const coords = downsampleRoute(
      coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      MAX_OUTLINE_POINTS,
    );
    const steps = parseOsrmSteps(route);

    return {
      coordinates: coords,
      distanceMeters: route.distance ?? 0,
      durationSeconds: route.duration ?? 0,
      steps,
      source: 'osrm',
    };
  } catch (error) {
    console.warn('[routing] OSRM error', error);
    return { ...straightLineRoute(clean[0], clean[clean.length - 1], clean.slice(1, -1)), source: 'fallback' };
  }
}

export async function getOsrmRoute(
  from: LatLng,
  to: LatLng,
): Promise<OsrmRoute & { source: 'osrm' | 'fallback' }> {
  return getOsrmRouteVia([from, to]);
}

export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const route = await getOsrmRoute(from, to);
  return route.coordinates.length >= 2 ? route.coordinates : straightFallback(from, to);
}

export async function loadStreetRoutes(
  driverStart: LatLng = DRIVER_NEARBY,
  pickup: LatLng = PICKUP_POINT,
  destination: LatLng = DESTINATION_POINT,
) {
  const start = isValidLatLng(driverStart) ? driverStart : DRIVER_NEARBY;
  const pick = isValidLatLng(pickup) ? pickup : PICKUP_POINT;
  const dest = isValidLatLng(destination) ? destination : DESTINATION_POINT;

  const [toPickup, trip] = await Promise.all([getOsrmRoute(start, pick), getOsrmRoute(pick, dest)]);

  const pickupOutline = downsampleRoute(
    toPickup.coordinates.length >= 2 ? toPickup.coordinates : straightFallback(start, pick),
  );
  const tripOutline = downsampleRoute(
    trip.coordinates.length >= 2 ? trip.coordinates : straightFallback(pick, dest),
  );

  return {
    pickupRoute: densifyRoute(pickupOutline, 16),
    tripRoute: densifyRoute(tripOutline, 14),
    pickupOutline,
    tripOutline,
    source: toPickup.source === 'osrm' && trip.source === 'osrm' ? 'osrm' : 'fallback',
  } as const;
}
