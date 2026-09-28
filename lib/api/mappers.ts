import type { Profile, DriverDocs, Ride, RideLocation, TariffRow, Trip, UserRole, VehicleType } from '@/types';

/** Legacy DB enums map to Sedan; only Sedan/SUV are offered in-app. */
export function normalizeVehicle(value: string | null | undefined): VehicleType {
  if (value === 'SUV') return 'SUV';
  return 'Sedan';
}

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  first_name: string;
  phone: string;
  city: string;
  initials: string;
  rating: number;
  total_trips: number;
  member_since: string;
  bio: string | null;
  roles: UserRole[];
  active_role: UserRole;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  block_fee_satisfied?: boolean | null;
};

type RideRow = {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  status: Ride['status'];
  origin: string;
  destination: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  vehicle: string;
  price: number;
  driver_net: number;
  app_net: number;
  airport_toll: number;
  distance_km: number;
  duration_label: string;
  passenger_name: string;
  passenger_rating: number;
  driver_name: string | null;
  driver_rating: number | null;
  driver_car: string | null;
  driver_plate: string | null;
  rating: number | null;
  comment: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  mp_preference_id?: string | null;
  mp_payment_id?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
};

type TariffDb = {
  id: string;
  per_km_total: number;
  per_km_driver: number;
  per_km_app: number;
  per_minute?: number | null;
  base_fare?: number | null;
  app_flat_fee?: number | null;
  wait_per_minute?: number | null;
  system_block_fee?: number | null;
  min_distance_km: number;
  min_fare: number;
  airport_toll_total: number;
  airport_toll_driver: number;
  airport_toll_app: number;
  bonus_go?: number | null;
  bonus_plus?: number | null;
  bonus_master?: number | null;
  high_demand_active: boolean;
  surge_multiplier: number;
};

type DocsRow = {
  user_id: string;
  ine_front: boolean;
  ine_back: boolean;
  license: boolean;
  circulation: boolean;
  insurance: boolean;
  complete: boolean;
  review_status?: string | null;
  review_note?: string | null;
};

type LocRow = {
  ride_id: string;
  lat: number;
  lng: number;
  heading: number;
  updated_at: string;
};

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    firstName: row.first_name,
    phone: row.phone,
    city: row.city,
    initials: row.initials,
    rating: Number(row.rating),
    totalTrips: row.total_trips,
    memberSince: row.member_since,
    bio: row.bio ?? undefined,
    roles: row.roles as UserRole[],
    activeRole: row.active_role as UserRole,
    vehicleMake: row.vehicle_make ?? undefined,
    vehicleModel: row.vehicle_model ?? undefined,
    vehicleColor: row.vehicle_color ?? undefined,
    vehiclePlate: row.vehicle_plate ?? undefined,
    blockFeeSatisfied: Boolean(row.block_fee_satisfied),
  };
}

export function mapDocs(row: DocsRow | null): DriverDocs {
  if (!row) {
    return {
      ineFront: false,
      ineBack: false,
      license: false,
      circulation: false,
      insurance: false,
      complete: false,
      reviewStatus: 'pending',
      reviewNote: null,
    };
  }
  return {
    ineFront: row.ine_front,
    ineBack: row.ine_back,
    license: row.license,
    circulation: row.circulation,
    insurance: row.insurance,
    complete: row.complete,
    reviewStatus: (row.review_status as DriverDocs['reviewStatus']) || 'pending',
    reviewNote: row.review_note ?? null,
  };
}

export function mapRide(row: RideRow): Ride {
  return {
    id: row.id,
    passengerId: row.passenger_id,
    driverId: row.driver_id,
    status: row.status,
    origin: row.origin,
    destination: row.destination,
    originLat: Number(row.origin_lat),
    originLng: Number(row.origin_lng),
    destinationLat: Number(row.destination_lat),
    destinationLng: Number(row.destination_lng),
    vehicle: normalizeVehicle(row.vehicle),
    price: Number(row.price) || 0,
    driverNet: Number(row.driver_net) || 0,
    appNet: Number(row.app_net) || 0,
    airportToll: Number(row.airport_toll) || 0,
    distanceKm: Number(row.distance_km) || 0,
    durationLabel: row.duration_label,
    passengerName: row.passenger_name,
    passengerRating: Number(row.passenger_rating) || 5,
    driverName: row.driver_name,
    driverRating: row.driver_rating != null ? Number(row.driver_rating) : null,
    driverCar: row.driver_car,
    driverPlate: row.driver_plate,
    rating: row.rating,
    comment: row.comment,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    paymentMethod: (row.payment_method as Ride['paymentMethod']) || 'cash',
    paymentStatus: (row.payment_status as Ride['paymentStatus']) || 'none',
    mpPreferenceId: row.mp_preference_id ?? null,
    mpPaymentId: row.mp_payment_id ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTariff(row: TariffDb): TariffRow {
  return {
    id: row.id,
    perKmTotal: Number(row.per_km_total),
    perKmDriver: Number(row.per_km_driver),
    perKmApp: Number(row.per_km_app),
    perMinute: Number(row.per_minute ?? 3),
    baseFare: Number(row.base_fare ?? 30),
    appFlatFee: Number(row.app_flat_fee ?? 13.2),
    waitPerMinute: Number(row.wait_per_minute ?? 1),
    systemBlockFee: Number(row.system_block_fee ?? 300),
    minDistanceKm: Number(row.min_distance_km),
    minFare: Number(row.min_fare ?? 30),
    airportTollTotal: Number(row.airport_toll_total),
    airportTollDriver: Number(row.airport_toll_driver),
    airportTollApp: Number(row.airport_toll_app),
    bonusGo: Number(row.bonus_go ?? 1000),
    bonusPlus: Number(row.bonus_plus ?? 2000),
    bonusMaster: Number(row.bonus_master ?? 3000),
    highDemandActive: row.high_demand_active,
    surgeMultiplier: Number(row.surge_multiplier),
  };
}

export function mapLocation(row: LocRow): RideLocation {
  return {
    rideId: row.ride_id,
    lat: row.lat,
    lng: row.lng,
    heading: row.heading,
    updatedAt: row.updated_at,
  };
}

export function rideStatusToTripStatus(status: Ride['status']): Trip['status'] {
  if (status === 'completed') return 'Completado';
  if (
    status === 'en_route_pickup' ||
    status === 'arrived_pickup' ||
    status === 'in_progress' ||
    status === 'accepted'
  ) {
    return 'En camino';
  }
  return 'Confirmado';
}

export function rideToTrip(ride: Ride, viewer: 'passenger' | 'driver'): Trip {
  const date =
    ride.scheduledDate ??
    new Date(ride.createdAt).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const time =
    ride.scheduledTime ??
    new Date(ride.createdAt).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return {
    id: ride.id,
    origin: ride.origin,
    destination: ride.destination,
    date,
    time,
    createdAt: ride.createdAt,
    vehicle: ride.vehicle,
    price: ride.price,
    driverNet: ride.driverNet,
    appNet: ride.appNet,
    airportToll: ride.airportToll || undefined,
    duration: ride.durationLabel,
    status: rideStatusToTripStatus(ride.status),
    rating: ride.rating ?? undefined,
    comment: ride.comment ?? undefined,
    counterparty: viewer === 'driver' ? ride.passengerName : ride.driverName ?? 'Buscando...',
    distanceKm: ride.distanceKm,
    role: viewer,
    passengerName: ride.passengerName,
    driverName: ride.driverName ?? '—',
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus,
  };
}
