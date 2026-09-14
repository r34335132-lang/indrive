import { Feather } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import type { Feature, LineString } from 'geojson';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapControlButton } from '@/components/MapControlButton';
import { RouteInfoCard } from '@/components/RouteInfoCard';
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useLocation } from '@/hooks/useLocation';
import { reverseGeocode } from '@/lib/places';
import { OSM_STYLE } from '@/lib/osmStyle';
import { getOsrmRoute } from '@/lib/routing';
import type { MapCoordinate, OsrmRoute } from '@/types';

const DURANGO: [number, number] = [-104.655, 24.027];

function toLngLat(point: MapCoordinate): [number, number] {
  return [point.longitude, point.latitude];
}

export default function MapScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const { user } = useAuth();
  const { requestRide } = useBooking();
  const { getFare } = useTariff();
  const { coords, status, error, refresh } = useLocation();
  const [destination, setDestination] = useState<MapCoordinate | null>(null);
  const [route, setRoute] = useState<OsrmRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [originLabel, setOriginLabel] = useState('Mi ubicación');
  const [destinationLabel, setDestinationLabel] = useState('Destino');

  const centerOn = useCallback((point: MapCoordinate) => {
    cameraRef.current?.easeTo({
      center: toLngLat(point),
      zoom: 15,
      duration: 700,
      easing: 'ease',
    });
  }, []);

  useEffect(() => {
    if (coords) centerOn(coords);
  }, [centerOn, coords]);

  const clearRoute = () => {
    setDestination(null);
    setRoute(null);
    setRouteError(null);
    setDestinationLabel('Destino');
  };

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
        if (!next) {
          setRoute(null);
          setRouteError('No se pudo calcular la ruta.');
          return;
        }
        setRoute(next);
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, destination]);

  const routeShape = useMemo<Feature<LineString> | null>(() => {
    if (!route?.coordinates.length) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.coordinates.map((point) => [point.longitude, point.latitude]),
      },
    };
  }, [route]);

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
      <Map
        style={styles.map}
        mapStyle={OSM_STYLE}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, left: 8 }}
        compass={false}
        onPress={(event) => {
          const [longitude, latitude] = event.nativeEvent.lngLat;
          setDestination({ latitude, longitude });
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: coords ? toLngLat(coords) : DURANGO,
            zoom: 14,
          }}
        />

        {coords ? (
          <Marker id="user" lngLat={toLngLat(coords)} anchor="center">
            <View style={styles.userDot} />
          </Marker>
        ) : null}

        {destination ? (
          <Marker id="destination" lngLat={toLngLat(destination)} anchor="bottom">
            <View style={styles.destPin}>
              <Feather name="map-pin" size={28} color="#c2410c" />
            </View>
          </Marker>
        ) : null}

        {routeShape ? (
          <GeoJSONSource id="route" data={routeShape}>
            <Layer
              id="route-line"
              type="line"
              source="route"
              paint={{
                'line-color': '#138a68',
                'line-width': 5,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={20} color="#16362f" />
        </Pressable>
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Toca el mapa para elegir destino</Text>
          <Text style={styles.hintCopy}>Elige destino y pide el viaje</Text>
        </View>
      </SafeAreaView>

      <View style={styles.controls} pointerEvents="box-none">
        <MapControlButton
          icon="crosshair"
          accessibilityLabel="Volver a mi ubicación"
          onPress={() => {
            if (coords) centerOn(coords);
            else void refresh();
          }}
        />
        {destination ? (
          <MapControlButton
            icon="x"
            accessibilityLabel="Limpiar destino y ruta"
            onPress={clearRoute}
          />
        ) : null}
      </View>

      <SafeAreaView style={styles.bottom} edges={['bottom']} pointerEvents="box-none">
        {status === 'loading' ? (
          <View style={styles.banner}>
            <ActivityIndicator color="#138a68" />
            <Text style={styles.bannerText}>Buscando tu ubicación…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {routeError ? <Text style={styles.error}>{routeError}</Text> : null}
        {fare?.isHighDemand ? (
          <Text style={styles.error}>Tarifa alta x{fare.surgeMultiplier.toFixed(1)}</Text>
        ) : null}
        {destination ? (
          <RouteInfoCard
            distanceMeters={route?.distanceMeters ?? 0}
            durationSeconds={route?.durationSeconds ?? 0}
            priceLabel={fare ? formatMoney(fare.total) : undefined}
            loading={routing || !route}
            requesting={requesting}
            onClear={clearRoute}
            onRequest={requestFromMap}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e7efe9' },
  map: { flex: 1 },
  top: {
    left: 16,
    position: 'absolute',
    right: 16,
    top: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  back: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  hint: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hintTitle: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 13 },
  hintCopy: { color: '#6b7c74', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  controls: { bottom: 280, gap: 10, position: 'absolute', right: 16 },
  bottom: { bottom: 12, left: 16, position: 'absolute', right: 16, gap: 8 },
  banner: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  bannerText: { color: '#16362f', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  error: {
    backgroundColor: '#fff4e8',
    borderRadius: 14,
    color: '#b06d12',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    padding: 12,
  },
  userDot: {
    backgroundColor: '#138a68',
    borderColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 3,
    height: 22,
    width: 22,
  },
  destPin: { alignItems: 'center', justifyContent: 'center' },
});
