import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RideMessage = {
  id: string;
  rideId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type MessageRow = {
  id: string;
  ride_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function mapMessage(row: MessageRow): RideMessage {
  return {
    id: row.id,
    rideId: row.ride_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function fetchRideMessages(rideId: string): Promise<RideMessage[]> {
  const { data, error } = await supabase
    .from('ride_messages')
    .select('*')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapMessage(row as MessageRow));
}

export async function sendRideMessage(rideId: string, senderId: string, body: string) {
  const text = body.trim().slice(0, 400);
  if (!text) return;
  const { error } = await supabase.from('ride_messages').insert({
    ride_id: rideId,
    sender_id: senderId,
    body: text,
  });
  if (error) throw error;
}

export function subscribeRideMessages(
  rideId: string,
  onInsert: (message: RideMessage) => void,
): RealtimeChannel {
  return supabase
    .channel(`ride-messages-${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_messages',
        filter: `ride_id=eq.${rideId}`,
      },
      (payload) => {
        if (!payload.new) return;
        onInsert(mapMessage(payload.new as MessageRow));
      },
    )
    .subscribe();
}
