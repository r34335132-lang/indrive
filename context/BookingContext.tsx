import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { rideToTrip } from '@/lib/api/mappers';
import {
  acceptRide,
  cancelRide,
  createRide,
  fetchActiveRideForUser,
  fetchMyRides,
  fetchOpenRides,
  fetchRide,
  rateRide as rateRideApi,
  closeRealtimeChannel,
  subscribeRideById,
  subscribeRides,
  updateRideFare,
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
  driverPhotoUrl: string | null;
  date: string;
  time: string;
  passengerId: string;
  driverId: string | null;
  paymentMethod: import('@/types').PaymentMethod;
  paymentStatus: import('@/types').PaymentStatus;
  rating: number | null;
};

/** Un "searching" más viejo que esto se considera abandonado. */
const STALE_SEARCH_MS = 30 * 60 * 1000;
/** Un viaje en curso sin ningún cambio en este tiempo quedó colgado (no se cerró bien). */
const STALE_ACTIVE_MS = 4 * 60 * 60 * 1000;

type BookingState = {
  origin: string;
  destination: string;
  stop: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  distanceKm: number;
  paymentMethod: import('@/types').PaymentMethod;
};

export type MapRideRequest = {
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm?: number;
  durationMinutes?: number;
  vehicle?: VehicleType;
  paymentMethod?: import('@/types').PaymentMethod;
};

type BookingContextValue = {
  booking: BookingState;
  trips: Trip[];
  allTrips: Trip[];
  openRides: Ride[];
  activeRide: ActiveRide | null;
  /** Último viaje que terminó estando abierto en la app (para el resumen / calificación). */
  completedRide: ActiveRide | null;
  dismissCompletedRide: () => void;
  rateRide: (rideId: string, stars: number, comment?: string) => Promise<void>;
  updateBooking: (values: Partial<BookingState>) => void;
  resetBooking: () => void;
  requestRide: (input?: MapRideRequest) => Promise<ActiveRide>;
  acceptRideAsDriver: (rideId?: string) => Promise<void>;
  markEnRoutePickup: () => Promise<void>;
  markArrivedPickup: () => Promise<void>;
  startTrip: () => Promise<void>;
  completeRide: () => Promise<void>;
  clearActiveRide: () => Promise<void>;
  cancelActiveRide: () => Promise<void>;
  applyWaitFare: (waitMinutes: number) => Promise<void>;
  publishDriverLocation: (lat: number, lng: number, heading?: number) => Promise<void>;
  refreshTrips: () => Promise<void>;
};

const initialBooking: BookingState = {
  origin: '',
  destination: '',
  stop: '',
  date: 'Hoy',
  time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  vehicle: 'Sedan',
  distanceKm: 4.2,
  paymentMethod: 'cash',
};

const durations: Record<VehicleType, string> = {
  Sedan: '12 min',
  SUV: '14 min',
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
    driverPhotoUrl: ride.driverPhotoUrl ?? null,
    date: ride.scheduledDate ?? 'Hoy',
    time: ride.scheduledTime ?? '',
    passengerId: ride.passengerId,
    driverId: ride.driverId,
    paymentMethod: ride.paymentMethod ?? 'cash',
    paymentStatus: ride.paymentStatus ?? 'none',
    rating: ride.rating ?? null,
  };
}

function isEnded(status: RideStatus) {
  return status === 'completed' || status === 'cancelled';
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();
  const { getFare } = useTariff();
  const [booking, setBooking] = useState<BookingState>(initialBooking);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [openRides, setOpenRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [completedRide, setCompletedRide] = useState<ActiveRide | null>(null);
  /** Viajes que ya terminaron en esta sesión: ninguna respuesta tardía los puede revivir. */
  const endedIds = useRef(new Set<string>());

  /** Saca el viaje de "activo"; si se completó, lo deja para el resumen y la calificación. */
  const endRide = useCallback((ride: Ride) => {
    endedIds.current.add(ride.id);
    if (ride.status === 'completed') setCompletedRide(toActiveRide(ride));
    setActiveRide((current) => (current && current.id !== ride.id ? current : null));
  }, []);

  /** Pone un viaje como activo solo si sigue vivo. */
  const showLive = useCallback((ride: Ride) => {
    if (isEnded(ride.status) || endedIds.current.has(ride.id)) {
      setActiveRide((current) => (current?.id === ride.id ? null : current));
      return;
    }
    setActiveRide(toActiveRide(ride));
  }, []);

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
      if (!ride) {
        setActiveRide(null);
        return;
      }
      const searching = ride.status === 'searching' || ride.status === 'offered';
      if (searching && Date.now() - new Date(ride.createdAt).getTime() > STALE_SEARCH_MS) {
        if (ride.passengerId === profile.id) void cancelRide(ride.id).catch(() => {});
        setActiveRide(null);
        return;
      }
      if (
        !searching &&
        Date.now() - new Date(ride.updatedAt || ride.createdAt).getTime() > STALE_ACTIVE_MS
      ) {
        endedIds.current.add(ride.id);
        setActiveRide(null);
        return;
      }
      showLive(ride);
    } catch {
      // conservar el estado actual si falla la red
    }
  }, [profile, showLive]);

  useEffect(() => {
    refreshTrips();
    refreshActive();
  }, [refreshActive, refreshTrips]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void refreshActive();
      void refreshTrips();
    });
    return () => sub.remove();
  }, [refreshActive, refreshTrips]);

  // Respaldo del tiempo real: si se pierde el evento, el viaje igual se cierra.
  useEffect(() => {
    if (!activeRide?.id || !isSupabaseConfigured) return;
    const id = activeRide.id;
    const timer = setInterval(() => {
      fetchRide(id)
        .then((ride) => {
          if (!ride) return;
          if (isEnded(ride.status)) {
            endRide(ride);
            void refreshTrips();
            return;
          }
          if (endedIds.current.has(ride.id)) return;
          setActiveRide((current) =>
            current &&
            current.id === ride.id &&
            (current.status !== ride.status ||
              current.price !== ride.price ||
              current.driverId !== ride.driverId)
              ? toActiveRide(ride)
              : current,
          );
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [activeRide?.id, endRide, refreshTrips]);

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
      if (activeRide && next.id === activeRide.id) {
        if (isEnded(next.status)) endRide(next);
        else showLive(next);
      } else if (
        !isEnded(next.status) &&
        next.status !== 'searching' &&
        (next.passengerId === profile.id || next.driverId === profile.id)
      ) {
        showLive(next);
      }
      refreshTrips();
    });

    return () => {
      closeRealtimeChannel(channel);
    };
  }, [activeRide, endRide, profile, refreshTrips, role, showLive]);

  useEffect(() => {
    if (!activeRide?.id || !isSupabaseConfigured) return;
    const channel = subscribeRideById(activeRide.id, (ride) => {
      if (isEnded(ride.status)) {
        endRide(ride);
        refreshTrips();
        return;
      }
      showLive(ride);
    });
    return () => {
      closeRealtimeChannel(channel);
    };
  }, [activeRide?.id, endRide, refreshTrips, showLive]);

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

  const requestRide = useCallback(async (input?: MapRideRequest) => {
    if (!profile) throw new Error('Inicia sesión para pedir un viaje');
    const origin = input?.origin ?? booking.origin;
    const rawDestination = input?.destination ?? booking.destination;
    const stopLabel = booking.stop.trim();
    const destination =
      input?.destination ??
      (stopLabel ? `${rawDestination} (vía ${stopLabel})` : rawDestination);
    const originPlace = input
      ? { coordinate: { latitude: input.originLat, longitude: input.originLng } }
      : resolvePlace(booking.origin);
    const destPlace = input
      ? { coordinate: { latitude: input.destinationLat, longitude: input.destinationLng } }
      : resolvePlace(booking.destination);
    const distanceKm = input?.distanceKm || booking.distanceKm || estimateRouteKm(origin, rawDestination);
    const durationMinutes = input?.durationMinutes;
    const vehicle = input?.vehicle ?? booking.vehicle;
    const fare = getFare(distanceKm, origin, destination, { durationMinutes, vehicle });
    const durationLabel = durationMinutes
      ? `${Math.max(1, Math.round(durationMinutes))} min`
      : durations[vehicle];

    const ride = await createRide({
      passenger: profile,
      origin,
      destination,
      originLat: originPlace.coordinate.latitude,
      originLng: originPlace.coordinate.longitude,
      destinationLat: destPlace.coordinate.latitude,
      destinationLng: destPlace.coordinate.longitude,
      vehicle,
      price: fare.total,
      driverNet: fare.driverNet,
      appNet: fare.appNet,
      airportToll: fare.airportToll,
      distanceKm,
      durationLabel,
      scheduledDate: booking.date,
      scheduledTime: booking.time,
      paymentMethod: input?.paymentMethod ?? booking.paymentMethod ?? 'cash',
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
    let ride: Ride | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3 && !ride; attempt += 1) {
      try {
        ride = await updateRideStatus(activeRide.id, 'completed');
      } catch (error) {
        lastError = error;
        const current = await fetchRide(activeRide.id).catch(() => null);
        if (current?.status === 'completed') ride = current;
        else if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
    if (!ride) {
      throw lastError instanceof Error ? lastError : new Error('No se pudo finalizar el viaje');
    }
    endRide(ride);
    await refreshTrips();
  }, [activeRide, endRide, refreshTrips]);

  const dismissCompletedRide = useCallback(() => setCompletedRide(null), []);

  const rateRide = useCallback(
    async (rideId: string, stars: number, comment?: string) => {
      await rateRideApi(rideId, stars, comment);
      setCompletedRide((current) =>
        current && current.id === rideId ? { ...current, rating: stars } : current,
      );
      await refreshTrips();
    },
    [refreshTrips],
  );

  const clearActiveRide = useCallback(async () => {
    if (activeRide && (activeRide.status === 'searching' || activeRide.status === 'offered')) {
      await cancelRide(activeRide.id);
    }
    setActiveRide(null);
    await refreshTrips();
  }, [activeRide, refreshTrips]);

  /** Cancela el viaje en cualquier fase previa a completarlo. */
  const cancelActiveRide = useCallback(async () => {
    if (!activeRide) return;
    if (activeRide.status !== 'completed' && activeRide.status !== 'cancelled') {
      await cancelRide(activeRide.id);
    }
    setActiveRide(null);
    await refreshTrips();
  }, [activeRide, refreshTrips]);

  /** Suma espera ($1/min) al precio del viaje activo. */
  const applyWaitFare = useCallback(
    async (waitMinutes: number) => {
      if (!activeRide || waitMinutes <= 0) return;
      const minutes = Math.max(0, Math.ceil(waitMinutes));
      const waitExtra = minutes * 1; // $1 MXN por minuto de espera
      const price = Number(activeRide.price) + waitExtra;
      const driverNet = Number(activeRide.net) + waitExtra;
      const ride = await updateRideFare(activeRide.id, {
        price,
        driverNet,
        appNet: Number(activeRide.appNet),
      });
      setActiveRide(toActiveRide(ride));
    },
    [activeRide],
  );

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
      completedRide,
      dismissCompletedRide,
      rateRide,
      updateBooking,
      resetBooking,
      requestRide,
      acceptRideAsDriver,
      markEnRoutePickup,
      markArrivedPickup,
      startTrip,
      completeRide,
      clearActiveRide,
      cancelActiveRide,
      applyWaitFare,
      publishDriverLocation,
      refreshTrips,
    }),
    [
      booking,
      trips,
      allTrips,
      openRides,
      activeRide,
      completedRide,
      dismissCompletedRide,
      rateRide,
      requestRide,
      acceptRideAsDriver,
      markEnRoutePickup,
      markArrivedPickup,
      startTrip,
      completeRide,
      clearActiveRide,
      cancelActiveRide,
      applyWaitFare,
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
