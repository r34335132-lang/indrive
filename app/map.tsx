import { lazy } from 'react';
import { LazyMapScreen } from '@/components/maps/LazyMapScreen';

/** Kept for deep links; passenger home now embeds the map. */
const Screen = lazy(() => import('@/components/maps/BookingMapScreen'));

export default function MapRoute() {
  return <LazyMapScreen Screen={Screen} />;
}
