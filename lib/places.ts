import type { LatLng } from '@/lib/routing';

export type Place = {
  name: string;
  aliases: string[];
  coordinate: LatLng;
  city?: string;
};

/** Centro de La Laguna (entre Torreón y Gómez). */
export const LAGUNA_CENTER: LatLng = { latitude: 25.555, longitude: -103.45 };

/** Viewbox amplio: Torreón + Gómez Palacio + Lerdo + orillas. */
const LAGUNA_VIEWBOX = '-103.78,25.75,-103.18,25.35';

export const LAGUNA_PLACES: Place[] = [
  // —— Gómez Palacio ——
  {
    name: 'Centro Gómez Palacio',
    aliases: ['gomez', 'gómez', 'gomez palacio', 'gómez palacio', 'centro gomez'],
    coordinate: { latitude: 25.5699, longitude: -103.4958 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Plaza Independencia Gómez',
    aliases: ['plaza independencia', 'plaza gomez', 'jardin gomez'],
    coordinate: { latitude: 25.5715, longitude: -103.4968 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Central Camionera Gómez Palacio',
    aliases: ['central gomez', 'camionera gomez', 'autobuses gomez'],
    coordinate: { latitude: 25.5792, longitude: -103.5065 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Parque Relámpago',
    aliases: ['relampago', 'relámpago'],
    coordinate: { latitude: 25.5635, longitude: -103.4892 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'UTD Gómez Palacio',
    aliases: ['utd', 'universidad tecnologica gomez'],
    coordinate: { latitude: 25.6025, longitude: -103.5142 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Mercado Gómez Palacio',
    aliases: ['mercado gomez', 'mercado juarez gomez'],
    coordinate: { latitude: 25.5682, longitude: -103.4995 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Hospital General Gómez',
    aliases: ['hospital gomez', 'issste gomez'],
    coordinate: { latitude: 25.5758, longitude: -103.4885 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Plaza Comercial Las Fuentes',
    aliases: ['las fuentes', 'fuentes gomez'],
    coordinate: { latitude: 25.5845, longitude: -103.4785 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Fracc. Campestre Gómez',
    aliases: ['campestre gomez'],
    coordinate: { latitude: 25.5925, longitude: -103.4685 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Villa Florida',
    aliases: ['villa florida'],
    coordinate: { latitude: 25.5585, longitude: -103.5125 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Zona Industrial Gómez',
    aliases: ['industrial gomez'],
    coordinate: { latitude: 25.6155, longitude: -103.5258 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'IMSS Clínica 16 Gómez',
    aliases: ['imss gomez', 'clinica 16'],
    coordinate: { latitude: 25.5668, longitude: -103.4825 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Boulevard Miguel Alemán',
    aliases: ['miguel aleman', 'blvd aleman gomez'],
    coordinate: { latitude: 25.5775, longitude: -103.4912 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Plaza Cuatro Caminos Gómez',
    aliases: ['cuatro caminos gomez'],
    coordinate: { latitude: 25.5612, longitude: -103.4725 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Parque Victoria Gómez',
    aliases: ['parque victoria'],
    coordinate: { latitude: 25.5812, longitude: -103.5012 },
    city: 'Gómez Palacio, Dgo.',
  },
  {
    name: 'Walmart Gómez Palacio',
    aliases: ['walmart gomez'],
    coordinate: { latitude: 25.5865, longitude: -103.4758 },
    city: 'Gómez Palacio, Dgo.',
  },

  // —— Torreón ——
  {
    name: 'Centro Torreón',
    aliases: ['centro torreon', 'torreon', 'torreón'],
    coordinate: { latitude: 25.5397, longitude: -103.4489 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Plaza Cuatro Caminos',
    aliases: ['cuatro caminos', '4 caminos'],
    coordinate: { latitude: 25.5512, longitude: -103.4065 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Galerías Laguna',
    aliases: ['galerias', 'galerías laguna'],
    coordinate: { latitude: 25.5685, longitude: -103.4328 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Aeropuerto Torreón Francisco Sarabia',
    aliases: ['aeropuerto', 'airport', 'trc', 'sarabia'],
    coordinate: { latitude: 25.5683, longitude: -103.4107 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Central de Autobuses Torreón',
    aliases: ['central torreon', 'camionera torreon'],
    coordinate: { latitude: 25.5478, longitude: -103.4255 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Cristo de las Noas',
    aliases: ['cristo', 'las noas', 'galeras'],
    coordinate: { latitude: 25.5035, longitude: -103.4058 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Alameda Zaragoza',
    aliases: ['alameda', 'zaragoza'],
    coordinate: { latitude: 25.5425, longitude: -103.4388 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Hospital Ángeles Torreón',
    aliases: ['angeles', 'hospital angeles'],
    coordinate: { latitude: 25.5618, longitude: -103.4212 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Tec de Monterrey Campus Laguna',
    aliases: ['tec', 'itesm'],
    coordinate: { latitude: 25.6125, longitude: -103.4028 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Senderos',
    aliases: ['senderos torreon'],
    coordinate: { latitude: 25.5825, longitude: -103.3985 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Las Trojes',
    aliases: ['trojes'],
    coordinate: { latitude: 25.5758, longitude: -103.3752 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'San Isidro Torreón',
    aliases: ['san isidro'],
    coordinate: { latitude: 25.5285, longitude: -103.3925 },
    city: 'Torreón, Coah.',
  },
  {
    name: 'Walmart Torreón Oriente',
    aliases: ['walmart torreon'],
    coordinate: { latitude: 25.5585, longitude: -103.3925 },
    city: 'Torreón, Coah.',
  },

  // —— Lerdo ——
  {
    name: 'Centro Lerdo',
    aliases: ['lerdo', 'centro lerdo', 'villa lerdo'],
    coordinate: { latitude: 25.5362, longitude: -103.5245 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Plaza de Armas Lerdo',
    aliases: ['plaza lerdo'],
    coordinate: { latitude: 25.5375, longitude: -103.5258 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Parque Linear Lerdo',
    aliases: ['parque linear', 'linear lerdo'],
    coordinate: { latitude: 25.5428, longitude: -103.5185 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Nazareno Lerdo',
    aliases: ['nazareno'],
    coordinate: { latitude: 25.5285, longitude: -103.5485 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Central Lerdo',
    aliases: ['central lerdo', 'camionera lerdo'],
    coordinate: { latitude: 25.5412, longitude: -103.5312 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Hospital Lerdo',
    aliases: ['hospital lerdo'],
    coordinate: { latitude: 25.5335, longitude: -103.5288 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Fracc. Las Quintas Lerdo',
    aliases: ['quintas lerdo', 'las quintas'],
    coordinate: { latitude: 25.5485, longitude: -103.5125 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Mercado Lerdo',
    aliases: ['mercado lerdo'],
    coordinate: { latitude: 25.5355, longitude: -103.5228 },
    city: 'Lerdo, Dgo.',
  },
  {
    name: 'Ciudad Industrial Torreón',
    aliases: ['ciudad industrial'],
    coordinate: { latitude: 25.5185, longitude: -103.4685 },
    city: 'Torreón, Coah.',
  },
];

export const DURANGO_PLACES = LAGUNA_PLACES;

const DEFAULT_POINT = LAGUNA_CENTER;

function cityKey(city?: string) {
  const c = (city ?? '').toLowerCase();
  if (c.includes('gómez') || c.includes('gomez')) return 'gomez';
  if (c.includes('lerdo')) return 'lerdo';
  if (c.includes('torreón') || c.includes('torreon')) return 'torreon';
  return 'otro';
}

export function placesByCity(city: 'gomez' | 'torreon' | 'lerdo' | 'all'): Place[] {
  if (city === 'all') return [...LAGUNA_PLACES];
  return LAGUNA_PLACES.filter((p) => cityKey(p.city) === city);
}

/** Lugares más cercanos a la ubicación del usuario. */
export function placesNear(near: LatLng | null | undefined, limit = 16): Place[] {
  if (!near || !Number.isFinite(near.latitude) || !Number.isFinite(near.longitude)) {
    return featuredPlaces(limit);
  }
  return [...LAGUNA_PLACES]
    .map((place) => ({ place, km: haversineKm(near, place.coordinate) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((row) => row.place);
}

/** Accesos rápidos equilibrados: Gómez + Torreón + Lerdo. */
export function featuredPlaces(limit = 12): Place[] {
  const gomez = placesByCity('gomez');
  const torreon = placesByCity('torreon');
  const lerdo = placesByCity('lerdo');
  const mixed: Place[] = [];
  const max = Math.max(gomez.length, torreon.length, lerdo.length);
  for (let i = 0; i < max && mixed.length < limit; i += 1) {
    if (gomez[i]) mixed.push(gomez[i]);
    if (mixed.length >= limit) break;
    if (torreon[i]) mixed.push(torreon[i]);
    if (mixed.length >= limit) break;
    if (lerdo[i]) mixed.push(lerdo[i]);
  }
  return mixed;
}

export function resolvePlace(query: string): Place {
  const text = query.trim().toLowerCase();
  if (!text) {
    return {
      name: query || 'La Laguna',
      aliases: [],
      coordinate: DEFAULT_POINT,
      city: 'Torreón, Coah.',
    };
  }
  for (const place of LAGUNA_PLACES) {
    if (place.name.toLowerCase() === text) return place;
    if (place.aliases.some((alias) => text.includes(alias) || alias.includes(text))) {
      return place;
    }
  }
  return { name: query, aliases: [], coordinate: DEFAULT_POINT, city: 'La Laguna' };
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

function inLagunaRegion(lat: number, lng: number) {
  return lat >= 25.32 && lat <= 25.78 && lng >= -103.82 && lng <= -103.12;
}

export async function searchPlaces(
  query: string,
  near?: LatLng | null,
): Promise<Place[]> {
  const text = query.trim();
  if (text.length < 2) {
    // Vacío: cerca de ti + mezcla de las 3 ciudades
    const nearby = placesNear(near, 8);
    const featured = featuredPlaces(12);
    const merged: Place[] = [];
    for (const place of [...nearby, ...featured]) {
      if (!merged.some((p) => p.name === place.name && p.city === place.city)) {
        merged.push(place);
      }
    }
    return merged.slice(0, 18);
  }

  const q = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const local = LAGUNA_PLACES.filter((place) => {
    const hay = `${place.name} ${place.aliases.join(' ')} ${place.city ?? ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    return hay.includes(q);
  });

  const cityHits =
    q.includes('gomez')
      ? placesByCity('gomez')
      : q.includes('lerdo')
        ? placesByCity('lerdo')
        : q.includes('torreon')
          ? placesByCity('torreon')
          : [];

  try {
    const bias = near
      ? `&lat=${near.latitude}&lon=${near.longitude}`
      : '';
    const searches = [
      `${text}, Gómez Palacio, Durango, Mexico`,
      `${text}, Torreón, Coahuila, Mexico`,
      `${text}, Lerdo, Durango, Mexico`,
    ];
    const remote: Place[] = [];
    await Promise.all(
      searches.map(async (term) => {
        const url =
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=mx` +
          `&viewbox=${LAGUNA_VIEWBOX}&bounded=1${bias}&q=` +
          encodeURIComponent(term);
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'inride-app/1.0 (com.inride.app)',
          },
        });
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          display_name?: string;
          name?: string;
          lat: string;
          lon: string;
        }>;
        for (const item of data) {
          const latitude = Number(item.lat);
          const longitude = Number(item.lon);
          if (!inLagunaRegion(latitude, longitude)) continue;
          const display = item.display_name ?? '';
          remote.push({
            name: item.name || display.split(',')[0] || text,
            aliases: [display],
            coordinate: { latitude, longitude },
            city: /g[oó]mez/i.test(display)
              ? 'Gómez Palacio, Dgo.'
              : /lerdo/i.test(display)
                ? 'Lerdo, Dgo.'
                : /torre[oó]n/i.test(display)
                  ? 'Torreón, Coah.'
                  : 'La Laguna',
          });
        }
      }),
    );

    const sortedLocal = near
      ? [...local].sort(
          (a, b) => haversineKm(near, a.coordinate) - haversineKm(near, b.coordinate),
        )
      : local;

    const merged: Place[] = [];
    for (const place of [...cityHits, ...sortedLocal, ...remote]) {
      if (!merged.some((p) => p.name === place.name && p.city === place.city)) {
        merged.push(place);
      }
    }
    return merged.slice(0, 20);
  } catch {
    const fallback = cityHits.length ? cityHits : local;
    if (fallback.length) {
      return near
        ? [...fallback]
            .sort((a, b) => haversineKm(near, a.coordinate) - haversineKm(near, b.coordinate))
            .slice(0, 16)
        : fallback.slice(0, 16);
    }
    return placesNear(near, 16);
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'inride-app/1.0 (com.inride.app)',
      },
    });
    if (!res.ok) return '';
    const data = (await res.json()) as {
      name?: string;
      display_name?: string;
      address?: Record<string, string>;
    };
    const address = data.address ?? {};
    const parts = [
      address.road,
      address.suburb || address.neighbourhood,
      address.city || address.town || address.village || address.county,
    ].filter(Boolean);
    return parts.slice(0, 2).join(', ') || data.name || data.display_name || '';
  } catch {
    return '';
  }
}
