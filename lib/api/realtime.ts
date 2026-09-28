import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channelSeq = 0;

/**
 * Crea un canal fresco. Si ya existe uno con el mismo nombre (Strict Mode /
 * remount), lo elimina antes de volver a registrar callbacks.
 */
export function openRealtimeChannel(baseName: string): RealtimeChannel {
  const prefix = `realtime:${baseName}`;
  for (const ch of supabase.getChannels()) {
    const topic = ch.topic ?? '';
    if (topic === baseName || topic === prefix || topic.startsWith(`${prefix}-`)) {
      void supabase.removeChannel(ch);
    }
  }
  channelSeq += 1;
  return supabase.channel(`${baseName}-${channelSeq}`);
}

export function closeRealtimeChannel(channel: RealtimeChannel | null | undefined) {
  if (!channel) return;
  void supabase.removeChannel(channel);
}
