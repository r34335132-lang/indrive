import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type VehicleType = 'Económico' | 'Comfort' | 'Premium' | 'Van';

export type Trip = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  vehicle: VehicleType;
  price: number;
  duration: string;
  status: 'Confirmado' | 'En camino' | 'Completado';
};

type BookingState = {
  origin: string;
  destination: string;
  date: string;
  time: string;
  vehicle: VehicleType;
};

type BookingContextValue = {
  booking: BookingState;
  trips: Trip[];
  updateBooking: (values: Partial<BookingState>) => void;
  addTrip: () => Trip;
  resetBooking: () => void;
};

const initialBooking: BookingState = {
  origin: 'Colonia Roma Norte',
  destination: 'Aeropuerto CDMX',
  date: 'Hoy, 07 ago',
  time: '18:30',
  vehicle: 'Comfort',
};

const initialTrips: Trip[] = [
  {
    id: 'inraid-1',
    origin: 'Polanco',
    destination: 'Condesa',
    date: '04 ago 2026',
    time: '09:15',
    vehicle: 'Económico',
    price: 148,
    duration: '24 min',
    status: 'Completado',
  },
  {
    id: 'inraid-2',
    origin: 'Santa Fe',
    destination: 'Aeropuerto CDMX',
    date: '28 jul 2026',
    time: '06:40',
    vehicle: 'Premium',
    price: 390,
    duration: '42 min',
    status: 'Completado',
  },
];

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [booking, setBooking] = useState<BookingState>(initialBooking);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);

  useEffect(() => {
    AsyncStorage.getItem('inraid-trips').then((stored) => {
      if (stored) {
        try {
          setTrips(JSON.parse(stored) as Trip[]);
        } catch {
          setTrips(initialTrips);
        }
      }
    });
  }, []);

  const updateBooking = (values: Partial<BookingState>) => {
    setBooking((current) => ({ ...current, ...values }));
  };

  const resetBooking = () => setBooking(initialBooking);

  const addTrip = () => {
    const prices: Record<VehicleType, number> = {
      Económico: 122,
      Comfort: 178,
      Premium: 286,
      Van: 348,
    };
    const durations: Record<VehicleType, string> = {
      Económico: '31 min',
      Comfort: '27 min',
      Premium: '25 min',
      Van: '29 min',
    };
    const trip: Trip = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...booking,
      price: prices[booking.vehicle],
      duration: durations[booking.vehicle],
      status: 'Confirmado',
    };
    setTrips((current) => {
      const next = [trip, ...current];
      AsyncStorage.setItem('inraid-trips', JSON.stringify(next));
      return next;
    });
    return trip;
  };

  const value = useMemo(
    () => ({ booking, trips, updateBooking, addTrip, resetBooking }),
    [booking, trips],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used inside BookingProvider');
  return context;
}