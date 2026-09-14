import { lazy } from 'react';
import { LazyMapScreen } from '@/components/maps/LazyMapScreen';

const Screen = lazy(() => import('@/components/maps/RideMapScreen'));

export default function RideMapRoute() {
  return <LazyMapScreen Screen={Screen} />;
}
