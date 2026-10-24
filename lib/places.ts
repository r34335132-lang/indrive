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

function isValidPoint(point?: LatLng | null): point is LatLng {
  return !!point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

/** Sin ubicación se asume La Laguna (zona principal de operación). */
export function isInLaguna(point?: LatLng | null) {
  if (!isValidPoint(point)) return true;
  return inLagunaRegion(point.latitude, point.longitude);
}

const OSM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'inride-app/1.0 (com.inride.app)',
};

type NominatimItem = {
  display_name?: string;
  name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

function cityFromAddress(address: Record<string, string> | undefined, display: string) {
  const a = address ?? {};
  const area = a.suburb || a.neighbourhood || a.quarter || '';
  const city = a.city || a.town || a.village || a.municipality || a.county || '';
  const label = [area, city].filter(Boolean).join(', ');
  return label || display.split(',').slice(1, 3).join(',').trim();
}

function dedupeByName(list: Place[]) {
  const out: Place[] = [];
  for (const place of list) {
    const key = place.name.toLowerCase();
    if (!out.some((p) => p.name.toLowerCase() === key)) out.push(place);
  }
  return out;
}

async function fetchJsonWithTimeout<T>(url: string, init?: RequestInit, ms = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeText(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();
}

function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function withDistance(place: Place, near: LatLng): Place {
  const km = haversineKm(near, place.coordinate);
  return { ...place, city: [place.city, formatKm(km)].filter(Boolean).join(' · ') };
}

/** Evita duplicados exactos pero conserva sucursales distintas con el mismo nombre. */
function dedupeByPlace(list: Place[]) {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const place of list) {
    const key = `${normalizeText(place.name)}|${place.coordinate.latitude.toFixed(3)}|${place.coordinate.longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

/** Palabras comunes → etiquetas de OpenStreetMap para buscar por tipo de lugar. */
const CATEGORY_TAGS: Array<{ words: string[]; filter: string }> = [
  {
    words: ['escuela', 'colegio', 'primaria', 'secundaria', 'kinder', 'jardin de ninos', 'preparatoria', 'prepa', 'bachillerato', 'cbtis', 'conalep'],
    filter: '[amenity~"^(school|kindergarten|college)$"]',
  },
  { words: ['universidad', 'facultad', 'tecnologico', 'instituto'], filter: '[amenity~"^(university|college)$"]' },
  { words: ['hospital', 'clinica', 'imss', 'issste', 'cruz roja', 'urgencias', 'consultorio', 'doctor', 'medico'], filter: '[amenity~"^(hospital|clinic|doctors)$"]' },
  { words: ['farmacia', 'botica'], filter: '[amenity=pharmacy]' },
  { words: ['banco', 'cajero'], filter: '[amenity~"^(bank|atm)$"]' },
  { words: ['gasolinera', 'gasolina', 'pemex'], filter: '[amenity=fuel]' },
  { words: ['supermercado', 'super', 'soriana', 'walmart', 'ley', 'chedraui', 'bodega'], filter: '[shop~"^(supermarket|department_store)$"]' },
  { words: ['oxxo', 'tienda', 'abarrotes', 'minisuper'], filter: '[shop~"^(convenience|general)$"]' },
  { words: ['plaza comercial', 'centro comercial', 'mall', 'plaza'], filter: '[shop=mall]' },
  { words: ['parque', 'jardin', 'alameda'], filter: '[leisure~"^(park|garden)$"]' },
  { words: ['restaurante', 'restaurant', 'comida', 'tacos', 'pizza', 'hamburguesa'], filter: '[amenity~"^(restaurant|fast_food)$"]' },
  { words: ['cafe', 'cafeteria'], filter: '[amenity=cafe]' },
  { words: ['bar', 'cantina'], filter: '[amenity~"^(bar|pub)$"]' },
  { words: ['iglesia', 'templo', 'parroquia', 'catedral'], filter: '[amenity=place_of_worship]' },
  { words: ['gimnasio', 'gym'], filter: '[leisure=fitness_centre]' },
  { words: ['hotel', 'motel'], filter: '[tourism~"^(hotel|motel)$"]' },
  { words: ['central de autobuses', 'camionera', 'autobuses', 'terminal'], filter: '[amenity=bus_station]' },
  { words: ['aeropuerto'], filter: '[aeroway=aerodrome]' },
  { words: ['cine', 'cinepolis', 'cinemex'], filter: '[amenity=cinema]' },
  { words: ['mercado'], filter: '[amenity=marketplace]' },
  { words: ['policia', 'ministerio publico', 'fiscalia'], filter: '[amenity=police]' },
  { words: ['estadio', 'unidad deportiva', 'deportiva'], filter: '[leisure~"^(stadium|sports_centre)$"]' },
  { words: ['museo'], filter: '[tourism=museum]' },
];

function categoryFilterFor(text: string): string | null {
  const q = normalizeText(text);
  const words = q.split(/\s+/).filter(Boolean);
  const variants = new Set<string>();
  for (const w of words) {
    variants.add(w);
    if (w.length > 3 && w.endsWith('s')) variants.add(w.slice(0, -1));
    if (w.length > 4 && w.endsWith('es')) variants.add(w.slice(0, -2));
  }
  const padded = ` ${q} `;
  for (const category of CATEGORY_TAGS) {
    for (const key of category.words) {
      if (key.includes(' ')) {
        if (padded.includes(` ${key}`)) return category.filter;
      } else if (variants.has(key)) {
        return category.filter;
      }
    }
  }
  // Escritura incompleta de una sola palabra ("escue", "farmac").
  if (words.length === 1 && words[0].length >= 4) {
    for (const category of CATEGORY_TAGS) {
      if (category.words.some((key) => !key.includes(' ') && key.startsWith(words[0]))) {
        return category.filter;
      }
    }
  }
  return null;
}

const categoryCache = new Map<string, Place[]>();

async function searchCategory(filter: string, near: LatLng): Promise<Place[]> {
  const key = `${filter}|${near.latitude.toFixed(2)},${near.longitude.toFixed(2)}`;
  const cached = categoryCache.get(key);
  if (cached) return cached;
  const around = `around:9000,${near.latitude},${near.longitude}`;
  const query = `[out:json][timeout:10];nwr(${around})${filter}[name];out center 80;`;
  const elements = await firstSuccessful(
    OVERPASS_MIRRORS.map((url) => async () => {
      const data = await fetchJsonWithTimeout<{ elements?: OverpassElement[] }>(
        url,
        {
          method: 'POST',
          headers: { ...OSM_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        },
        9000,
      );
      if (!data.elements) throw new Error('bad response');
      return data.elements;
    }),
  );
  const places = elements
    .map((el): Place | null => {
      const latitude = el.lat ?? el.center?.lat;
      const longitude = el.lon ?? el.center?.lon;
      const tags = el.tags ?? {};
      if (!tags.name || latitude == null || longitude == null) return null;
      const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
      return {
        name: tags.name,
        aliases: [],
        coordinate: { latitude, longitude },
        city: street || tags['addr:suburb'] || tags['addr:city'] || '',
      };
    })
    .filter((p): p is Place => p !== null);
  categoryCache.set(key, places);
  return places;
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
};

async function searchPhoton(text: string, near: LatLng): Promise<Place[]> {
  const url =
    `https://photon.komoot.io/api/?limit=15&lat=${near.latitude}&lon=${near.longitude}` +
    `&location_bias_scale=0.2&q=${encodeURIComponent(text)}`;
  const data = await fetchJsonWithTimeout<{ features?: PhotonFeature[] }>(url, { headers: OSM_HEADERS }, 8000);
  return (data.features ?? [])
    .map((f): Place | null => {
      const [longitude, latitude] = f.geometry?.coordinates ?? [];
      const p = f.properties ?? {};
      if (p.countrycode && p.countrycode.toUpperCase() !== 'MX') return null;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      const street = [p.street, p.housenumber].filter(Boolean).join(' ');
      const name = p.name || street || text;
      const area = [p.district || p.locality, p.city || p.county].filter(Boolean).join(', ');
      return {
        name,
        aliases: [[name, street, area, p.state].filter(Boolean).join(', ')],
        coordinate: { latitude, longitude },
        city: [p.name && street ? street : '', area].filter(Boolean).join(', '),
      };
    })
    .filter((p): p is Place => p !== null);
}

async function searchNominatim(text: string, near: LatLng): Promise<Place[]> {
  const d = 0.35;
  const viewbox = `${near.longitude - d},${near.latitude + d},${near.longitude + d},${near.latitude - d}`;
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=15` +
    `&countrycodes=mx&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(text)}`;
  const data = await fetchJsonWithTimeout<NominatimItem[]>(url, { headers: OSM_HEADERS }, 8000);
  return data
    .map((item): Place => {
      const display = item.display_name ?? '';
      return {
        name: item.name || display.split(',')[0] || text,
        aliases: [display],
        coordinate: { latitude: Number(item.lat), longitude: Number(item.lon) },
        city: cityFromAddress(item.address, display),
      };
    })
    .filter((p) => Number.isFinite(p.coordinate.latitude) && Number.isFinite(p.coordinate.longitude));
}

/**
 * Búsqueda libre alrededor del usuario: combina Photon (tolerante a errores),
 * Nominatim (direcciones) y Overpass por categoría ("escuelas", "farmacia"…).
 */
async function searchAround(text: string, near: LatLng, extra: Place[] = []): Promise<Place[]> {
  const filter = categoryFilterFor(text);
  const [category, photon, nominatim] = await Promise.all([
    filter ? searchCategory(filter, near).catch(() => [] as Place[]) : Promise.resolve([] as Place[]),
    searchPhoton(text, near).catch(() => [] as Place[]),
    searchNominatim(text, near).catch(() => [] as Place[]),
  ]);

  const MAX_KM = 60;
  const byDistance = (list: Place[]) =>
    list
      .filter((p) => haversineKm(near, p.coordinate) <= MAX_KM)
      .sort((a, b) => haversineKm(near, a.coordinate) - haversineKm(near, b.coordinate));

  const merged = dedupeByPlace([
    ...extra,
    ...byDistance(category).slice(0, 25),
    ...byDistance([...photon, ...nominatim]),
  ]);
  return merged.slice(0, 40).map((p) => withDistance(p, near));
}

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const POI_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  clinic: 'Clínica',
  university: 'Universidad',
  college: 'Escuela',
  bus_station: 'Central de autobuses',
  marketplace: 'Mercado',
  cinema: 'Cine',
  townhall: 'Presidencia',
  mall: 'Plaza comercial',
  supermarket: 'Supermercado',
  department_store: 'Tienda departamental',
  park: 'Parque',
  stadium: 'Estadio',
  museum: 'Museo',
  attraction: 'Atracción',
  aerodrome: 'Aeropuerto',
};

const nearbyCache = new Map<string, Place[]>();

async function fetchNearbyPois(near: LatLng): Promise<Place[]> {
  const key = `${near.latitude.toFixed(2)},${near.longitude.toFixed(2)}`;
  const cached = nearbyCache.get(key);
  if (cached) return cached;

  const around = `around:7000,${near.latitude},${near.longitude}`;
  const query =
    `[out:json][timeout:12];(` +
    `nwr(${around})[amenity~"^(hospital|university|college|bus_station|marketplace|cinema|townhall)$"][name];` +
    `nwr(${around})[shop~"^(mall|supermarket|department_store)$"][name];` +
    `nwr(${around})[leisure~"^(park|stadium)$"][name];` +
    `nwr(${around})[tourism~"^(museum|attraction)$"][name];` +
    `nwr(${around})[aeroway=aerodrome][name];` +
    `);out center 80;`;

  const elements = await firstSuccessful(
    OVERPASS_MIRRORS.map((url) => async () => {
      const data = await fetchJsonWithTimeout<{ elements?: OverpassElement[] }>(
        url,
        {
          method: 'POST',
          headers: { ...OSM_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        },
        9000,
      );
      if (!data.elements?.length) throw new Error('empty');
      return data.elements;
    }),
  ).catch(() => [] as OverpassElement[]);

  const places = elements
    .map((el): Place | null => {
      const latitude = el.lat ?? el.center?.lat;
      const longitude = el.lon ?? el.center?.lon;
      const tags = el.tags ?? {};
      if (!tags.name || latitude == null || longitude == null) return null;
      const kind =
        tags.amenity || tags.shop || tags.leisure || tags.tourism || tags.aeroway || '';
      const coordinate = { latitude, longitude };
      const km = haversineKm(near, coordinate);
      const label = POI_LABELS[kind] ?? 'Lugar';
      return {
        name: tags.name,
        aliases: [],
        coordinate,
        city: `${label} · ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}`,
      };
    })
    .filter((p): p is Place => p !== null)
    .sort((a, b) => haversineKm(near, a.coordinate) - haversineKm(near, b.coordinate));

  let result = dedupeByName(places);
  if (!result.length) result = await nearbyByKeywords(near);
  if (result.length) nearbyCache.set(key, result);
  return result;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/** Resuelve con la primera tarea que tenga éxito (en paralelo). */
function firstSuccessful<T>(tasks: Array<() => Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    let pending = tasks.length;
    if (!pending) reject(new Error('no tasks'));
    for (const task of tasks) {
      task().then(resolve, () => {
        pending -= 1;
        if (pending === 0) reject(new Error('all failed'));
      });
    }
  });
}

const NEARBY_KEYWORDS = ['hospital', 'plaza comercial', 'supermercado', 'parque', 'central de autobuses'];

/** Respaldo con Nominatim (secuencial para respetar su límite de 1 petición/seg). */
async function nearbyByKeywords(near: LatLng): Promise<Place[]> {
  const d = 0.08;
  const viewbox = `${near.longitude - d},${near.latitude + d},${near.longitude + d},${near.latitude - d}`;
  const found: Place[] = [];
  for (const keyword of NEARBY_KEYWORDS) {
    try {
      const data = await fetchJsonWithTimeout<NominatimItem[]>(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=4` +
          `&countrycodes=mx&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(keyword)}`,
        { headers: OSM_HEADERS },
        7000,
      );
      for (const item of data) {
        const coordinate = { latitude: Number(item.lat), longitude: Number(item.lon) };
        if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) continue;
        const display = item.display_name ?? '';
        const km = haversineKm(near, coordinate);
        found.push({
          name: item.name || display.split(',')[0] || keyword,
          aliases: [display],
          coordinate,
          city: `${cityFromAddress(item.address, display)} · ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}`,
        });
      }
    } catch {
      // sigue con la siguiente categoría
    }
    if (found.length >= 12) break;
  }
  return dedupeByName(found).sort(
    (a, b) => haversineKm(near, a.coordinate) - haversineKm(near, b.coordinate),
  );
}

/**
 * Lugares cercanos a donde está el usuario. En La Laguna usa el catálogo local;
 * en cualquier otra ciudad consulta OpenStreetMap alrededor de su ubicación.
 */
export async function nearbyPlaces(near: LatLng | null | undefined, limit = 12): Promise<Place[]> {
  if (!isValidPoint(near)) return featuredPlaces(limit);
  if (isInLaguna(near)) return placesNear(near, limit);
  try {
    return (await fetchNearbyPois(near)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchPlaces(
  query: string,
  near?: LatLng | null,
): Promise<Place[]> {
  const text = query.trim();

  if (isValidPoint(near) && (!isInLaguna(near) || text.length >= 2)) {
    if (text.length < 2) return nearbyPlaces(near, 18);
    const q = normalizeText(text);
    const localMatches = isInLaguna(near)
      ? LAGUNA_PLACES.filter((place) =>
          normalizeText(`${place.name} ${place.aliases.join(' ')}`).includes(q),
        )
          .sort((a, b) => haversineKm(near, a.coordinate) - haversineKm(near, b.coordinate))
          .slice(0, 5)
      : [];
    try {
      return await searchAround(text, near, localMatches);
    } catch {
      return localMatches;
    }
  }

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
        const res = await fetch(url, { headers: OSM_HEADERS });
        if (!res.ok) return;
        const data = (await res.json()) as NominatimItem[];
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
    const street = address.road
      ? [address.road, address.house_number].filter(Boolean).join(' ')
      : undefined;
    const parts = [
      street,
      address.suburb || address.neighbourhood || address.quarter,
      address.city || address.town || address.village || address.municipality || address.county,
    ].filter(Boolean);
    return parts.join(', ') || data.name || data.display_name || '';
  } catch {
    return '';
  }
}
