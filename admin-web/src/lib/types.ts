export type RideStatus =
  | 'searching'
  | 'offered'
  | 'accepted'
  | 'en_route_pickup'
  | 'arrived_pickup'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  email: string;
  name: string;
  first_name: string;
  phone: string;
  city: string;
  initials: string;
  rating: number;
  total_trips: number;
  roles: string[];
  active_role: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  driver_tier?: string | null;
  block_fee_satisfied?: boolean;
  block_fee_satisfied_at?: string | null;
  avatar_url?: string | null;
  birthdate?: string | null;
  created_at: string;
};

export type DriverDocsRow = {
  user_id: string;
  ine_front: boolean;
  ine_back: boolean;
  license: boolean;
  circulation: boolean;
  insurance: boolean;
  complete: boolean;
  review_status: ReviewStatus;
  review_note: string | null;
  ine_front_path?: string | null;
  ine_back_path?: string | null;
  license_path?: string | null;
  circulation_path?: string | null;
  insurance_path?: string | null;
  updated_at: string;
};

export type Ride = {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  status: RideStatus;
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
  driver_name: string | null;
  driver_car: string | null;
  driver_plate: string | null;
  driver_photo_url?: string | null;
  rating: number | null;
  comment: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type Tariff = {
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
  updated_at?: string;
};

export type DocKey = 'ine_front' | 'ine_back' | 'license' | 'circulation' | 'insurance';

export const DOC_LABELS: Record<DocKey, string> = {
  ine_front: 'INE · Frente',
  ine_back: 'INE · Reverso',
  license: 'Licencia de conducir',
  circulation: 'Tarjeta de circulación',
  insurance: 'Póliza de seguro',
};

export const DOC_KEYS = Object.keys(DOC_LABELS) as DocKey[];

export type Driver = Profile & {
  docs: DriverDocsRow | null;
  completedTrips: number;
  earnings: number;
  lastTripAt: string | null;
};

export type Passenger = Profile & {
  trips: number;
  spent: number;
};
