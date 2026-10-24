import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { MapCoordinate } from '@/types';

export type LocationPermissionStatus = 'loading' | 'granted' | 'denied';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function metersBetween(a: MapCoordinate, b: MapCoordinate) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

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

    // 1) Instantáneo: última posición conocida del sistema.
    const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
    if (lastKnown) {
      setCoords((prev) =>
        prev ?? {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        },
      );
    }

    // 2) Rápido: posición por red/wifi (1-2 s normalmente).
    const quick = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      6000,
    ).catch(() => null);
    let best: MapCoordinate | null = quick
      ? { latitude: quick.coords.latitude, longitude: quick.coords.longitude }
      : null;
    if (best) setCoords(best);

    // 3) Preciso: GPS en segundo plano; solo actualiza si se movió de forma relevante.
    withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      20000,
    )
      .then((precise) => {
        const next = { latitude: precise.coords.latitude, longitude: precise.coords.longitude };
        if (!best || metersBetween(best, next) > 25) {
          best = next;
          setCoords(next);
        }
      })
      .catch(() => {
        if (!best && !lastKnown) setError('No se pudo obtener tu ubicación.');
      });

    return best ?? (lastKnown
      ? { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude }
      : null);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setStatus('denied');
      setError('No se pudo obtener tu ubicación.');
    });
  }, [refresh]);

  return { coords, status, error, refresh };
}
