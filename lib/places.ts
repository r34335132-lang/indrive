import type { LatLng } from '@/lib/routing';

export type Place = {
  name: string;
  aliases: string[];
  coordinate: LatLng;
};

/** Known Durango landmarks for booking without Google Geocoding. */
export const DURANGO_PLACES: Place[] = [
  {
    name: 'Paseo Durango',
    aliases: ['paseo durango', 'paseo'],
    coordinate: { latitude: 24.0412, longitude: -104.6405 },
  },
  {
    name: 'Parque Guadiana',
    aliases: ['parque guadiana', 'guadiana'],
    coordinate: { latitude: 24.0168, longitude: -104.6825 },
  },
  {
    name: 'Aeropuerto Durango',
    aliases: ['aeropuerto', 'airport'],
    coordinate: { latitude: 24.1256, longitude: -104.5278 },
  },
  {
    name: 'Plaza de Armas',
    aliases: ['plaza de armas', 'centro'],
    coordinate: { latitude: 24.0246, longitude: -104.6698 },
  },
  {
    name: 'Centro Comercial Durango',
    aliases: ['centro comercial', 'mall'],
    coordinate: { latitude: 24.035, longitude: -104.655 },
  },
  {
    name: 'Hospital General',
    aliases: ['hospital'],
    coordinate: { latitude: 24.0385, longitude: -104.658 },
  },
  {
    name: 'Universidad Juárez',
    aliases: ['universidad', 'ujed'],
    coordinate: { latitude: 24.012, longitude: -104.655 },
  },
  {
    name: 'Tec NM Durango',
    aliases: ['tec nm', 'tecnologico'],
    coordinate: { latitude: 24.048, longitude: -104.628 },
  },
  {
    name: 'Hotel Gobernador',
    aliases: ['gobernador', 'hotel'],
    coordinate: { latitude: 24.0275, longitude: -104.668 },
  },
  {
    name: 'Fracc. Jardines',
    aliases: ['jardines'],
    coordinate: { latitude: 24.03, longitude: -104.67 },
  },
  {
    name: 'Central de Autobuses',
    aliases: ['central', 'autobuses'],
    coordinate: { latitude: 24.033, longitude: -104.645 },
  },
  {
    name: 'Colinas del Padre',
    aliases: ['colinas'],
    coordinate: { latitude: 24.05, longitude: -104.62 },
  },
];

const DEFAULT_POINT: LatLng = { latitude: 24.027, longitude: -104.655 };

export function resolvePlace(query: string): Place {
  const text = query.trim().toLowerCase();
  if (!text) {
    return { name: query || 'Durango', aliases: [], coordinate: DEFAULT_POINT };
  }
  for (const place of DURANGO_PLACES) {
    if (place.name.toLowerCase() === text) return place;
    if (place.aliases.some((alias) => text.includes(alias) || alias.includes(text))) {
      return place;
    }
  }
  return { name: query, aliases: [], coordinate: DEFAULT_POINT };
}

export function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimateRouteKm(origin: string, destination: string) {
  const from = resolvePlace(origin).coordinate;
  const to = resolvePlace(destination).coordinate;
  const straight = haversineKm(from, to);
  return Math.max(2, Math.round(straight * 1.35 * 10) / 10);
}
