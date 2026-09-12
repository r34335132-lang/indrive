import { calculateFare, estimateDistanceKm } from '@/constants/pricing';
import type { DriverDocumentKey, Trip, TripStatus } from '@/types';

export type { UserRole, TripStatus, VehicleType, Trip, DriverDocumentKey } from '@/types';

export function normalizeTrip(raw: Partial<Trip> & Pick<Trip, 'id' | 'origin' | 'destination'>): Trip {
  const distanceKm = raw.distanceKm ?? estimateDistanceKm(raw.origin, raw.destination);
  const fare = calculateFare(distanceKm, raw.origin, raw.destination);
  const price = typeof raw.price === 'number' ? raw.price : fare.total;
  const driverNet = typeof raw.driverNet === 'number' ? raw.driverNet : fare.driverNet;
  const appNet = typeof raw.appNet === 'number' ? raw.appNet : fare.appNet;

  return {
    id: raw.id,
    origin: raw.origin,
    destination: raw.destination,
    date: raw.date ?? '—',
    time: raw.time ?? '—',
    vehicle: raw.vehicle ?? 'Comfort',
    price,
    driverNet,
    appNet,
    airportToll: raw.airportToll ?? (fare.airportToll || undefined),
    duration: raw.duration ?? '12 min',
    status: raw.status ?? 'Completado',
    rating: raw.rating,
    comment: raw.comment ?? defaultComment(raw.rating, raw.status),
    counterparty: raw.counterparty ?? '—',
    distanceKm,
    role: raw.role ?? 'passenger',
    passengerName: raw.passengerName ?? raw.counterparty ?? '—',
    driverName: raw.driverName ?? '—',
  };
}

export function normalizeTrips(trips: Array<Partial<Trip> & Pick<Trip, 'id' | 'origin' | 'destination'>>) {
  return trips.map(normalizeTrip);
}

export function uniqueTripsById(trips: Trip[]) {
  const map = new Map<string, Trip>();
  for (const trip of trips.map(normalizeTrip)) {
    const existing = map.get(trip.id);
    if (!existing || trip.role === 'passenger') map.set(trip.id, trip);
  }
  return Array.from(map.values());
}

function defaultComment(rating?: number, status?: TripStatus) {
  if (status !== 'Completado') return undefined;
  if (rating === 5) return 'Excelente servicio, muy puntual y amable.';
  if (rating === 4) return 'Buen viaje, llegamos sin problemas.';
  if (rating === 3) return 'Viaje correcto, hay áreas de mejora.';
  return 'Sin comentario registrado.';
}

export const DRIVER_DOCUMENTS: Array<{
  key: DriverDocumentKey;
  title: string;
  subtitle: string;
  icon: 'credit-card' | 'file-text' | 'truck' | 'shield';
}> = [
  {
    key: 'ineFront',
    title: 'INE · Frente',
    subtitle: 'Foto clara del frente de tu credencial',
    icon: 'credit-card',
  },
  {
    key: 'ineBack',
    title: 'INE · Reverso',
    subtitle: 'Foto del reverso de tu credencial',
    icon: 'credit-card',
  },
  {
    key: 'license',
    title: 'Licencia de conducir',
    subtitle: 'Vigente y legible',
    icon: 'file-text',
  },
  {
    key: 'circulation',
    title: 'Tarjeta de circulación',
    subtitle: 'Documento del vehículo a tu nombre',
    icon: 'truck',
  },
  {
    key: 'insurance',
    title: 'Póliza de seguro vigente',
    subtitle: 'Seguro vehicular al corriente',
    icon: 'shield',
  },
];
