export type UserRole = 'passenger' | 'driver' | 'admin';

export type RideStatus =
  | 'searching'
  | 'offered'
  | 'accepted'
  | 'en_route_pickup'
  | 'arrived_pickup'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TripStatus = 'Confirmado' | 'En camino' | 'Completado';

export type VehicleType = 'Económico' | 'Comfort' | 'Premium' | 'Van';

export type DriverDocumentKey =
  | 'ineFront'
  | 'ineBack'
  | 'license'
  | 'circulation'
  | 'insurance';

export type Profile = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  phone: string;
  city: string;
  initials: string;
  rating: number;
  totalTrips: number;
  memberSince: string;
  bio?: string;
  roles: UserRole[];
  activeRole: UserRole;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePlate?: string;
};

export type DriverDocs = Record<DriverDocumentKey, boolean> & { complete?: boolean };

export type Ride = {
  id: string;
  passengerId: string;
  driverId: string | null;
  status: RideStatus;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  vehicle: VehicleType;
  price: number;
  driverNet: number;
  appNet: number;
  airportToll: number;
  distanceKm: number;
  durationLabel: string;
  passengerName: string;
  passengerRating: number;
  driverName: string | null;
  driverRating: number | null;
  driverCar: string | null;
  driverPlate: string | null;
  rating: number | null;
  comment: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RideLocation = {
  rideId: string;
  lat: number;
  lng: number;
  heading: number;
  updatedAt: string;
};

export type Trip = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  price: number;
  driverNet: number;
  appNet: number;
  airportToll?: number;
  duration: string;
  status: TripStatus;
  rating?: number;
  comment?: string;
  counterparty: string;
  distanceKm: number;
  role: 'passenger' | 'driver';
  passengerName: string;
  driverName: string;
};

export type TariffRow = {
  id: string;
  perKmTotal: number;
  perKmDriver: number;
  perKmApp: number;
  perMinute: number;
  appFlatFee: number;
  waitPerMinute: number;
  systemBlockFee: number;
  minDistanceKm: number;
  minFare: number;
  airportTollTotal: number;
  airportTollDriver: number;
  airportTollApp: number;
  bonusGo: number;
  bonusPlus: number;
  bonusMaster: number;
  highDemandActive: boolean;
  surgeMultiplier: number;
};
