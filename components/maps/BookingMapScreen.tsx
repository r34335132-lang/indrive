import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap } from '@/components/maps/AppMap';
import { MapControlButton } from '@/components/MapControlButton';
import { RouteInfoCard } from '@/components/RouteInfoCard';
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useLocation } from '@/hooks/useLocation';
import { reverseGeocode } from '@/lib/places';
import { getOsrmRoute, straightLineRoute } from '@/lib/routing';
import type { MapCoordinate, OsrmRoute } from '@/types';

const DURANGO: MapCoordinate = { latitude: 25.5428, longitude: -103.4068 };

export default function BookingMapScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requestRide } = useBooking();
  const { getFare } = useTariff();
  const { coords, refresh } = useLocation();
  const [destination, setDestination] = useState<MapCoordinate | null>(null);
  const [route, setRoute] = useState<OsrmRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [originLabel, setOriginLabel] = useState('Mi ubicación');
  const [destinationLabel, setDestinationLabel] = useState('Destino');

  useEffect(() => {
    if (!coords || !destination) return;
    let cancelled = false;
    Promise.all([
      reverseGeocode(coords.latitude, coords.longitude),
      reverseGeocode(destination.latitude, destination.longitude),
    ]).then(([origin, dest]) => {
      if (cancelled) return;
      if (origin) setOriginLabel(origin);
      if (dest) setDestinationLabel(dest);
    });
    return () => {
      cancelled = true;
    };
  }, [coords, destination]);

  useEffect(() => {
    if (!coords || !destination) return;
    let cancelled = false;
    setRouting(true);
    setRouteError(null);
    getOsrmRoute(coords, destination)
      .then((next) => {
        if (cancelled) return;
        setRoute(next);
        if (next.source === 'fallback') {
          setRouteError('Ruta estimada (OSRM no respondió).');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setRoute(straightLineRoute(coords, destination));
        setRouteError(error instanceof Error ? error.message : 'Ruta estimada.');
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, destination]);

  const fare = useMemo(() => {
    if (!coords || !destination || !route) return null;
    return getFare(route.distanceMeters / 1000, originLabel, destinationLabel, {
      durationMinutes: route.durationSeconds / 60,
    });
  }, [coords, destination, destinationLabel, getFare, originLabel, route]);

  const requestFromMap = useCallback(async () => {
    if (!coords || !destination || !route || requesting) return;
    if (!user) {
      router.push('/');
      return;
    }
    setRequesting(true);
    setRouteError(null);
    try {
      await requestRide({
        origin: originLabel || 'Mi ubicación',
        destination: destinationLabel || 'Destino seleccionado',
        originLat: coords.latitude,
        originLng: coords.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
        durationMinutes: route.durationSeconds / 60,
      });
      router.push('/waiting' as Href);
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : 'No se pudo pedir el viaje.');
    } finally {
      setRequesting(false);
    }
  }, [coords, destination, destinationLabel, originLabel, requesting, requestRide, route, router, user]);

  return (
    <View style={styles.screen}>
      <AppMap
        style={styles.map}
        center={coords ?? DURANGO}
        zoom={14}
        userLocation={coords}
        destination={destination}
        route={route?.coordinates ?? []}
        followUser={!destination}
        onPressMap={(point) => setDestination(point)}
      />

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color="#16362f" />
        </Pressable>
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Toca el mapa para elegir destino</Text>
          <Text style={styles.hintCopy}>Sale desde tu ubicación actual</Text>
        </View>
      </SafeAreaView>

      <View style={styles.controls} pointerEvents="box-none">
        <MapControlButton
          icon="crosshair"
          accessibilityLabel="Volver a mi ubicación"
          onPress={() => void refresh()}
        />
        {destination ? (
          <MapControlButton
            icon="x"
            accessibilityLabel="Limpiar destino"
            onPress={() => {
              setDestination(null);
              setRoute(null);
              setRouteError(null);
            }}
          />
        ) : null}
      </View>

      <SafeAreaView style={styles.bottom} edges={['bottom']} pointerEvents="box-none">
        {routing ? <ActivityIndicator color="#138a68" /> : null}
        {routeError ? <Text style={styles.error}>{routeError}</Text> : null}
        {fare && route ? (
          <RouteInfoCard
            distanceMeters={route.distanceMeters}
            durationSeconds={route.durationSeconds}
            priceLabel={formatMoney(fare.total)}
            loading={routing}
            requesting={requesting}
            onClear={() => {
              setDestination(null);
              setRoute(null);
              setRouteError(null);
            }}
            onRequest={() => void requestFromMap()}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  back: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  hint: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintTitle: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 13 },
  hintCopy: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  controls: { gap: 10, position: 'absolute', right: 14, top: 110 },
  bottom: { bottom: 0, left: 0, padding: 14, position: 'absolute', right: 0 },
  error: { color: '#c2410c', fontFamily: 'Inter_600SemiBold', marginBottom: 8, textAlign: 'center' },
});
