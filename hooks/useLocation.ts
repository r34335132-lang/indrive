import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { MapCoordinate } from '@/types';

export type LocationPermissionStatus = 'loading' | 'granted' | 'denied';

export function useLocation() {
  const [coords, setCoords] = useState<MapCoordinate | null>(null);
  const [status, setStatus] = useState<LocationPermissionStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setStatus('denied');
      setError('Activa la ubicación para ver tu posición y calcular la ruta.');
      return null;
    }

    setStatus('granted');
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next: MapCoordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setCoords(next);
    return next;
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setStatus('denied');
      setError('No se pudo obtener tu ubicación.');
    });
  }, [refresh]);

  return { coords, status, error, refresh };
}
