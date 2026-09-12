export type LatLng = { latitude: number; longitude: number };

const FALLBACK_TRIP: LatLng[] = [
  { latitude: 24.0412, longitude: -104.6405 },
  { latitude: 24.0409, longitude: -104.6401 },
  { latitude: 24.0395, longitude: -104.6394 },
  { latitude: 24.0381, longitude: -104.6370 },
  { latitude: 24.0366, longitude: -104.6355 },
  { latitude: 24.0353, longitude: -104.6367 },
  { latitude: 24.0332, longitude: -104.6391 },
  { latitude: 24.0310, longitude: -104.6415 },
  { latitude: 24.0283, longitude: -104.6447 },
  { latitude: 24.0267, longitude: -104.6495 },
  { latitude: 24.0261, longitude: -104.6545 },
  { latitude: 24.0249, longitude: -104.6610 },
  { latitude: 24.0235, longitude: -104.6684 },
  { latitude: 24.0224, longitude: -104.6753 },
  { latitude: 24.0205, longitude: -104.6793 },
  { latitude: 24.0175, longitude: -104.6811 },
  { latitude: 24.0168, longitude: -104.6825 },
];

const FALLBACK_PICKUP: LatLng[] = [
  { latitude: 24.0455, longitude: -104.6355 },
  { latitude: 24.0442, longitude: -104.6370 },
  { latitude: 24.0430, longitude: -104.6385 },
  { latitude: 24.0420, longitude: -104.6395 },
  { latitude: 24.0412, longitude: -104.6405 },
];

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

/** Suaviza la polilínea para animación (más puntos entre vértices de calle) */
export function densifyRoute(route: LatLng[], metersPerPoint = 12): LatLng[] {
  if (route.length < 2) return route;
  const points: LatLng[] = [route[0]];
  for (let i = 0; i < route.length - 1; i += 1) {
    const from = route[i];
    const to = route[i + 1];
    const meters = distanceMeters(from, to);
    const steps = Math.max(1, Math.round(meters / metersPerPoint));
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      points.push({
        latitude: lerp(from.latitude, to.latitude, t),
        longitude: lerp(from.longitude, to.longitude, t),
      });
    }
  }
  return points;
}

export function bearingBetween(from: LatLng, to: LatLng) {
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
  for (let i = fromIndex; i < path.length - 1; i += 1) {
    meters += distanceMeters(path[i], path[i + 1]);
  }
  return Math.max(0.05, meters / 1000);
}

async function fetchOsrmRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: number[][] } }>;
    };
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
      return null;
    }
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch {
    return null;
  }
}

export const PICKUP_POINT: LatLng = { latitude: 24.0412, longitude: -104.6405 };
export const DESTINATION_POINT: LatLng = { latitude: 24.0168, longitude: -104.6825 };
export const DRIVER_NEARBY: LatLng = { latitude: 24.0455, longitude: -104.6355 };

function straightFallback(from: LatLng, to: LatLng): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    points.push({
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    });
  }
  return points;
}

export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const route = await fetchOsrmRoute(from, to);
  return route ?? straightFallback(from, to);
}

export async function loadStreetRoutes(
  driverStart: LatLng = DRIVER_NEARBY,
  pickup: LatLng = PICKUP_POINT,
  destination: LatLng = DESTINATION_POINT,
) {
  const [pickupRouteRaw, tripRouteRaw] = await Promise.all([
    fetchDrivingRoute(driverStart, pickup),
    fetchDrivingRoute(pickup, destination),
  ]);

  const pickupOutline =
    pickupRouteRaw.length >= 2 ? pickupRouteRaw : FALLBACK_PICKUP;
  const tripOutline = tripRouteRaw.length >= 2 ? tripRouteRaw : FALLBACK_TRIP;

  return {
    pickupRoute: densifyRoute(pickupOutline, 14),
    tripRoute: densifyRoute(tripOutline, 12),
    pickupOutline,
    tripOutline,
  };
}
