import { mapRide, mapLocation } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { Profile, Ride, RideLocation, RideStatus, VehicleType } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CreateRideInput = {
  passenger: Profile;
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
  scheduledDate?: string;
  scheduledTime?: string;
};

export async function createRide(input: CreateRideInput): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .insert({
      passenger_id: input.passenger.id,
      status: 'searching',
      origin: input.origin,
      destination: input.destination,
      origin_lat: input.originLat,
      origin_lng: input.originLng,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      vehicle: input.vehicle,
      price: input.price,
      driver_net: input.driverNet,
      app_net: input.appNet,
      airport_toll: input.airportToll,
      distance_km: input.distanceKm,
      duration_label: input.durationLabel,
      passenger_name: input.passenger.name,
      passenger_rating: input.passenger.rating,
      scheduled_date: input.scheduledDate ?? null,
      scheduled_time: input.scheduledTime ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRide(data);
}

export async function fetchRide(id: string): Promise<Ride | null> {
  const { data, error } = await supabase.from('rides').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRide(data) : null;
}

export async function fetchOpenRides(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('status', 'searching')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRide);
}

export async function fetchMyRides(userId: string, as: 'passenger' | 'driver' | 'all'): Promise<Ride[]> {
  let query = supabase.from('rides').select('*').order('created_at', { ascending: false }).limit(50);
  if (as === 'passenger') query = query.eq('passenger_id', userId);
  if (as === 'driver') query = query.eq('driver_id', userId);
  if (as === 'all') {
    // admin: no filter
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRide);
}

export async function fetchActiveRideForUser(userId: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
    .in('status', [
      'searching',
      'offered',
      'accepted',
      'en_route_pickup',
      'arrived_pickup',
      'in_progress',
    ])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRide(data) : null;
}

export async function acceptRide(rideId: string, driver: Profile): Promise<Ride> {
  const car = [driver.vehicleMake, driver.vehicleModel, driver.vehicleColor]
    .filter(Boolean)
    .join(' ')
    .trim();

  const { data, error } = await supabase
    .from('rides')
    .update({
      status: 'accepted',
      driver_id: driver.id,
      driver_name: driver.name,
      driver_rating: driver.rating,
      driver_car: car || driver.bio || 'Vehículo inride',
      driver_plate: driver.vehiclePlate ?? null,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', rideId)
    .eq('status', 'searching')
    .select('*')
    .single();
  if (error) throw error;
  return mapRide(data);
}

export async function updateRideStatus(rideId: string, status: RideStatus): Promise<Ride> {
  const patch: Record<string, unknown> = { status };
  if (status === 'in_progress') patch.started_at = new Date().toISOString();
  if (status === 'completed') patch.completed_at = new Date().toISOString();

  const { data, error } = await supabase.from('rides').update(patch).eq('id', rideId).select('*').single();
  if (error) throw error;
  return mapRide(data);
}

export async function cancelRide(rideId: string): Promise<Ride> {
  return updateRideStatus(rideId, 'cancelled');
}

export async function upsertRideLocation(
  rideId: string,
  lat: number,
  lng: number,
  heading = 0,
): Promise<RideLocation> {
  const { data, error } = await supabase
    .from('ride_locations')
    .upsert(
      {
        ride_id: rideId,
        lat,
        lng,
        heading,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ride_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapLocation(data);
}

export async function fetchRideLocation(rideId: string): Promise<RideLocation | null> {
  const { data, error } = await supabase
    .from('ride_locations')
    .select('*')
    .eq('ride_id', rideId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLocation(data) : null;
}

export function subscribeRides(
  onChange: (payload: { eventType: string; new: Ride | null; old: Ride | null }) => void,
): RealtimeChannel {
  return supabase
    .channel('rides-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rides' },
      (payload) => {
        onChange({
          eventType: payload.eventType,
          new: payload.new && Object.keys(payload.new).length ? mapRide(payload.new as never) : null,
          old: payload.old && Object.keys(payload.old).length ? mapRide(payload.old as never) : null,
        });
      },
    )
    .subscribe();
}

export function subscribeRideById(
  rideId: string,
  onChange: (ride: Ride) => void,
): RealtimeChannel {
  return supabase
    .channel(`ride-${rideId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
      (payload) => {
        if (payload.new) onChange(mapRide(payload.new as never));
      },
    )
    .subscribe();
}

export function subscribeRideLocation(
  rideId: string,
  onChange: (loc: RideLocation) => void,
): RealtimeChannel {
  return supabase
    .channel(`ride-loc-${rideId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ride_locations', filter: `ride_id=eq.${rideId}` },
      (payload) => {
        if (payload.new) onChange(mapLocation(payload.new as never));
      },
    )
    .subscribe();
}
