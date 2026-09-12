import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { rideToTrip } from '@/lib/api/mappers';
import {
  acceptRide,
  cancelRide,
  createRide,
  fetchActiveRideForUser,
  fetchMyRides,
  fetchOpenRides,
  subscribeRideById,
  subscribeRides,
  updateRideStatus,
  upsertRideLocation,
} from '@/lib/api/rides';
import { useAuth } from '@/context/AuthContext';
import { useTariff } from '@/context/TariffContext';
import { estimateRouteKm, resolvePlace } from '@/lib/places';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Ride, RideStatus, Trip, VehicleType } from '@/types';

export type { Trip, VehicleType } from '@/types';

/** UI-facing active ride (maps DB Ride). */
export type ActiveRide = {
  id: string;
  status: RideStatus;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  vehicle: VehicleType;
  price: number;
  net: number;
  appNet: number;
  airportToll: number;
  duration: string;
  distanceKm: number;
  passengerName: string;
  passengerRating: number;
  driverName: string;
  driverRating: number;
  driverCar: string;
  driverPlate: string;
  date: string;
  time: string;
  passengerId: string;
  driverId: string | null;
};

type BookingState = {
  origin: string;
  destination: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  distanceKm: number;
};

type BookingContextValue = {
  booking: BookingState;
  trips: Trip[];
  allTrips: Trip[];
  openRides: Ride[];
  activeRide: ActiveRide | null;
  updateBooking: (values: Partial<BookingState>) => void;
  resetBooking: () => void;
  requestRide: () => Promise<ActiveRide>;
  acceptRideAsDriver: (rideId?: string) => Promise<void>;
  markEnRoutePickup: () => Promise<void>;
  markArrivedPickup: () => Promise<void>;
  startTrip: () => Promise<void>;
  completeRide: () => Promise<void>;
  clearActiveRide: () => Promise<void>;
  publishDriverLocation: (lat: number, lng: number, heading?: number) => Promise<void>;
  refreshTrips: () => Promise<void>;
};

const initialBooking: BookingState = {
  origin: 'Paseo Durango',
  destination: 'Parque Guadiana',
  date: 'Hoy',
  time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  vehicle: 'Comfort',
  distanceKm: 4.2,
};

const durations: Record<VehicleType, string> = {
  Económico: '15 min',
  Comfort: '12 min',
  Premium: '11 min',
  Van: '14 min',
};

const BookingContext = createContext<BookingContextValue | null>(null);

function toActiveRide(ride: Ride): ActiveRide {
  return {
    id: ride.id,
    status: ride.status,
    origin: ride.origin,
    destination: ride.destination,
    originLat: ride.originLat,
    originLng: ride.originLng,
    destinationLat: ride.destinationLat,
    destinationLng: ride.destinationLng,
    vehicle: ride.vehicle,
    price: ride.price,
    net: ride.driverNet,
    appNet: ride.appNet,
    airportToll: ride.airportToll,
    duration: ride.durationLabel,
    distanceKm: ride.distanceKm,
    passengerName: ride.passengerName,
    passengerRating: ride.passengerRating,
    driverName: ride.driverName ?? '—',
    driverRating: ride.driverRating ?? 5,
    driverCar: ride.driverCar ?? 'Vehículo inride',
    driverPlate: ride.driverPlate ?? '—',
    date: ride.scheduledDate ?? 'Hoy',
    time: ride.scheduledTime ?? '',
    passengerId: ride.passengerId,
    driverId: ride.driverId,
  };
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();
  const { getFare } = useTariff();
  const [booking, setBooking] = useState<BookingState>(initialBooking);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [openRides, setOpenRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);

  const refreshTrips = useCallback(async () => {
    if (!profile || !isSupabaseConfigured) return;
    try {
      if (role === 'admin') {
        const rides = await fetchMyRides(profile.id, 'all');
        setAllTrips(rides.map((r) => rideToTrip(r, 'passenger')));
        setTrips([]);
      } else if (role === 'driver') {
        const [mine, open] = await Promise.all([
          fetchMyRides(profile.id, 'driver'),
          fetchOpenRides(),
        ]);
        setTrips(mine.map((r) => rideToTrip(r, 'driver')));
        setOpenRides(open);
        setAllTrips(mine.map((r) => rideToTrip(r, 'driver')));
      } else {
        const mine = await fetchMyRides(profile.id, 'passenger');
        setTrips(mine.map((r) => rideToTrip(r, 'passenger')));
        setAllTrips(mine.map((r) => rideToTrip(r, 'passenger')));
      }
    } catch {
      // keep previous
    }
  }, [profile, role]);

  const refreshActive = useCallback(async () => {
    if (!profile || !isSupabaseConfigured) {
      setActiveRide(null);
      return;
    }
    try {
      const ride = await fetchActiveRideForUser(profile.id);
      setActiveRide(ride ? toActiveRide(ride) : null);
    } catch {
      setActiveRide(null);
    }
  }, [profile]);

  useEffect(() => {
    refreshTrips();
    refreshActive();
  }, [refreshActive, refreshTrips]);

  // Realtime: open searching rides for drivers + active ride updates
  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;

    const channel = subscribeRides(({ new: next }) => {
      if (!next) return;
      if (next.status === 'searching' && role === 'driver') {
        setOpenRides((current) => {
          const without = current.filter((r) => r.id !== next.id);
          return [next, ...without];
        });
      }
      if (next.status !== 'searching') {
        setOpenRides((current) => current.filter((r) => r.id !== next.id));
      }
      if (
        next.passengerId === profile.id ||
        next.driverId === profile.id ||
        (activeRide && next.id === activeRide.id)
      ) {
        const live =
          next.status === 'completed' || next.status === 'cancelled' ? null : toActiveRide(next);
        setActiveRide(live);
      }
      refreshTrips();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [activeRide, profile, refreshTrips, role]);

  useEffect(() => {
    if (!activeRide?.id || !isSupabaseConfigured) return;
    const channel = subscribeRideById(activeRide.id, (ride) => {
      if (ride.status === 'completed' || ride.status === 'cancelled') {
        setActiveRide(null);
        refreshTrips();
        return;
      }
      setActiveRide(toActiveRide(ride));
    });
    return () => {
      channel.unsubscribe();
    };
  }, [activeRide?.id, refreshTrips]);

  const updateBooking = (values: Partial<BookingState>) => {
    setBooking((current) => {
      const next = { ...current, ...values };
      if (values.origin !== undefined || values.destination !== undefined) {
        next.distanceKm = estimateRouteKm(next.origin, next.destination);
      }
      return next;
    });
  };

  const resetBooking = () => setBooking(initialBooking);

  const requestRide = useCallback(async () => {
    if (!profile) throw new Error('Inicia sesión para pedir un viaje');
    const originPlace = resolvePlace(booking.origin);
    const destPlace = resolvePlace(booking.destination);
    const distanceKm = booking.distanceKm || estimateRouteKm(booking.origin, booking.destination);
    const fare = getFare(distanceKm, booking.origin, booking.destination);

    const ride = await createRide({
      passenger: profile,
      origin: booking.origin,
      destination: booking.destination,
      originLat: originPlace.coordinate.latitude,
      originLng: originPlace.coordinate.longitude,
      destinationLat: destPlace.coordinate.latitude,
      destinationLng: destPlace.coordinate.longitude,
      vehicle: booking.vehicle,
      price: fare.total,
      driverNet: fare.driverNet,
      appNet: fare.appNet,
      airportToll: fare.airportToll,
      distanceKm,
      durationLabel: durations[booking.vehicle],
      scheduledDate: booking.date,
      scheduledTime: booking.time,
    });

    const active = toActiveRide(ride);
    setActiveRide(active);
    await refreshTrips();
    return active;
  }, [booking, getFare, profile, refreshTrips]);

  const acceptRideAsDriver = useCallback(
    async (rideId?: string) => {
      if (!profile) throw new Error('Sin perfil de conductor');
      const id = rideId ?? openRides[0]?.id ?? activeRide?.id;
      if (!id) throw new Error('No hay viaje para aceptar');
      const ride = await acceptRide(id, profile);
      const next = toActiveRide(ride);
      setActiveRide(next);
      setOpenRides((current) => current.filter((r) => r.id !== id));
      // Move to en_route immediately so passenger sees progress
      const enRoute = await updateRideStatus(id, 'en_route_pickup');
      setActiveRide(toActiveRide(enRoute));
      await refreshTrips();
    },
    [activeRide?.id, openRides, profile, refreshTrips],
  );

  const markEnRoutePickup = useCallback(async () => {
    if (!activeRide) return;
    const ride = await updateRideStatus(activeRide.id, 'en_route_pickup');
    setActiveRide(toActiveRide(ride));
  }, [activeRide]);

  const markArrivedPickup = useCallback(async () => {
    if (!activeRide) return;
    const ride = await updateRideStatus(activeRide.id, 'arrived_pickup');
    setActiveRide(toActiveRide(ride));
  }, [activeRide]);

  const startTrip = useCallback(async () => {
    if (!activeRide) return;
    const ride = await updateRideStatus(activeRide.id, 'in_progress');
    setActiveRide(toActiveRide(ride));
  }, [activeRide]);

  const completeRide = useCallback(async () => {
    if (!activeRide) return;
    await updateRideStatus(activeRide.id, 'completed');
    setActiveRide(null);
    await refreshTrips();
  }, [activeRide, refreshTrips]);

  const clearActiveRide = useCallback(async () => {
    if (activeRide && (activeRide.status === 'searching' || activeRide.status === 'offered')) {
      await cancelRide(activeRide.id);
    }
    setActiveRide(null);
    await refreshTrips();
  }, [activeRide, refreshTrips]);

  const publishDriverLocation = useCallback(
    async (lat: number, lng: number, heading = 0) => {
      if (!activeRide) return;
      await upsertRideLocation(activeRide.id, lat, lng, heading);
    },
    [activeRide],
  );

  const value = useMemo(
    () => ({
      booking,
      trips,
      allTrips,
      openRides,
      activeRide,
      updateBooking,
      resetBooking,
      requestRide,
      acceptRideAsDriver,
      markEnRoutePickup,
      markArrivedPickup,
      startTrip,
      completeRide,
      clearActiveRide,
      publishDriverLocation,
      refreshTrips,
    }),
    [
      booking,
      trips,
      allTrips,
      openRides,
      activeRide,
      requestRide,
      acceptRideAsDriver,
      markEnRoutePickup,
      markArrivedPickup,
      startTrip,
      completeRide,
      clearActiveRide,
      publishDriverLocation,
      refreshTrips,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used inside BookingProvider');
  return context;
}
