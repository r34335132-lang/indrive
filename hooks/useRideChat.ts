import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRideMessages,
  sendRideMessage,
  subscribeRideMessages,
  type RideMessage,
} from '@/lib/api/messages';

export function useRideChat(rideId: string | undefined, meId: string | undefined) {
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    fetchRideMessages(rideId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((error) => console.warn(error));

    const channel = subscribeRideMessages(rideId, (message) => {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message];
      });
      if (!openRef.current && message.senderId !== meId) {
        setUnread((count) => count + 1);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [meId, rideId]);

  const send = useCallback(
    async (body: string) => {
      if (!rideId || !meId || sending) return;
      setSending(true);
      try {
        await sendRideMessage(rideId, meId, body);
      } finally {
        setSending(false);
      }
    },
    [meId, rideId, sending],
  );

  return { messages, open, setOpen, unread, sending, send };
}
