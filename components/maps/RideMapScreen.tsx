import { Feather } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import type { Feature, LineString } from 'geojson';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideChatButton } from '@/components/RideChatSheet';
import { RideNotice } from '@/components/RideNotice';
import { fetchRideLocation, subscribeRideLocation } from '@/lib/api/rides';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';
import { OSM_STYLE } from '@/lib/osmStyle';
import {
  bearingBetween,
  DRIVER_NEARBY,
  loadStreetRoutes,
  remainingDistanceKm,
  type LatLng,
} from '@/lib/routing';

type Phase =
  | 'loading'
  | 'to_pickup'
  | 'arrived_pickup'
  | 'to_destination'
  | 'done';

const STEP_MS = 280;
const FOLLOW_ZOOM = 15;

function toLngLat(point: LatLng): [number, number] {
  return [point.longitude, point.latitude];
}

function boundsOf(points: LatLng[]): [number, number, number, number] | null {
  if (!points.length) return null;
  let west = points[0].longitude;
  let east = west;
  let south = points[0].latitude;
  let north = south;
  for (const point of points) {
    west = Math.min(west, point.longitude);
    east = Math.max(east, point.longitude);
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
  }
  return [west, south, east, north];
}

function lineFeature(points: LatLng[]): Feature<LineString> | null {
  if (points.length < 2) return null;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
  };
}

export default function MapScreen() {
  const colors = useColors();
  const router = useRouter();
  const { role, user } = useAuth();
  const {
    activeRide,
    markArrivedPickup,
    startTrip,
    completeRide,
    clearActiveRide,
    publishDriverLocation,
  } = useBooking();

  const isDriver = role === 'driver';
  const isPassenger = role === 'passenger';

  const cameraRef = useRef<CameraRef>(null);
  const stepRef = useRef(0);
  const pathRef = useRef<LatLng[]>([]);
  const tripStartRef = useRef<Date | null>(null);

  const pickupPoint: LatLng = useMemo(
    () =>
      activeRide
        ? { latitude: activeRide.originLat, longitude: activeRide.originLng }
        : DRIVER_NEARBY,
    [activeRide],
  );
  const destinationPoint: LatLng = useMemo(
    () =>
      activeRide
        ? { latitude: activeRide.destinationLat, longitude: activeRide.destinationLng }
        : DRIVER_NEARBY,
    [activeRide],
  );

  const [phase, setPhase] = useState<Phase>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [followCamera, setFollowCamera] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [tripDurationSec, setTripDurationSec] = useState(0);
  const [pickupPath, setPickupPath] = useState<LatLng[]>([]);
  const [tripPath, setTripPath] = useState<LatLng[]>([]);
  const [pickupOutline, setPickupOutline] = useState<LatLng[]>([]);
  const [tripOutline, setTripOutline] = useState<LatLng[]>([]);
  const [driverLive, setDriverLive] = useState<LatLng | null>(null);
  const [driverStart, setDriverStart] = useState<LatLng>(DRIVER_NEARBY);

  const originLabel = activeRide?.origin ?? 'Origen';
  const destLabel = activeRide?.destination ?? 'Destino';
  const fare = activeRide?.price ?? 0;
  const earnings = activeRide?.net ?? 0;

  const path = pathRef.current;
  const totalSteps = Math.max(1, path.length - 1);
  const carPosition = path[Math.min(stepIndex, Math.max(0, path.length - 1))] ?? pickupPoint;
  const nextPos = path[Math.min(stepIndex + 1, Math.max(0, path.length - 1))] ?? carPosition;
  const carHeading = bearingBetween(carPosition, nextPos);
  const traveled = path.slice(0, Math.max(2, stepIndex + 1));
  const progress = totalSteps ? stepIndex / totalSteps : 0;
  const isMoving = phase === 'to_pickup' || phase === 'to_destination';
  const remainingKm = path.length ? remainingDistanceKm(path, stepIndex).toFixed(2) : '—';
  const activeOutline = phase === 'to_destination' || phase === 'done' ? tripOutline : pickupOutline;

  const followCar = useCallback((center: LatLng, duration = STEP_MS) => {
    cameraRef.current?.easeTo({
      center: toLngLat(center),
      zoom: FOLLOW_ZOOM,
      duration,
      easing: 'ease',
    });
  }, []);

  const fitRoute = useCallback((points: LatLng[]) => {
    const bounds = boundsOf(points);
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 110, right: 40, bottom: 240, left: 40 },
      duration: 600,
      easing: 'ease',
    });
  }, []);

  // Resolve driver GPS start (fallback nearby)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            setDriverStart({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch {
        // keep default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load OSRM routes for this ride
  useEffect(() => {
    if (!activeRide) return;
    let cancelled = false;
    setPhase('loading');
    loadStreetRoutes(driverStart, pickupPoint, destinationPoint).then((routes) => {
      if (cancelled) return;
      setPickupPath(routes.pickupRoute);
      setTripPath(routes.tripRoute);
      setPickupOutline(routes.pickupOutline);
      setTripOutline(routes.tripOutline);

      const status = activeRide.status;
      if (status === 'in_progress') {
        pathRef.current = routes.tripRoute;
        stepRef.current = 0;
        setStepIndex(0);
        setPhase('to_destination');
        tripStartRef.current = new Date();
      } else if (status === 'arrived_pickup') {
        pathRef.current = routes.pickupRoute;
        stepRef.current = Math.max(0, routes.pickupRoute.length - 1);
        setStepIndex(Math.max(0, routes.pickupRoute.length - 1));
        setPhase('arrived_pickup');
      } else {
        pathRef.current = routes.pickupRoute;
        stepRef.current = 0;
        setStepIndex(0);
        setPhase('to_pickup');
      }

      fitRoute(routes.pickupOutline.length > 1 ? routes.pickupOutline : routes.tripOutline);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRide?.id, destinationPoint, driverStart, fitRoute, pickupPoint]);

  // Passenger listens to driver GPS
  useEffect(() => {
    if (!isPassenger || !activeRide?.id) return;
    fetchRideLocation(activeRide.id).then((loc) => {
      if (loc) setDriverLive({ latitude: loc.lat, longitude: loc.lng });
    });
    const channel = subscribeRideLocation(activeRide.id, (loc) => {
      setDriverLive({ latitude: loc.lat, longitude: loc.lng });
    });
    return () => {
      channel.unsubscribe();
    };
  }, [activeRide?.id, isPassenger]);

  // Sync passenger UI when ride status changes remotely
  useEffect(() => {
    if (!isPassenger || !activeRide) return;
    if (activeRide.status === 'arrived_pickup') setPhase('arrived_pickup');
    if (activeRide.status === 'in_progress' && tripPath.length) {
      pathRef.current = tripPath;
      stepRef.current = 0;
      setStepIndex(0);
      setPhase('to_destination');
      tripStartRef.current = tripStartRef.current ?? new Date();
    }
    if (activeRide.status === 'completed') {
      setPhase('done');
      setShowSummary(true);
    }
  }, [activeRide, isPassenger, tripPath]);

  // Animate along route + publish driver location
  useEffect(() => {
    if (!isMoving) return;

    const timer = setInterval(() => {
      const currentPath = pathRef.current;
      if (currentPath.length < 2) return;
      const max = currentPath.length - 1;
      const next = stepRef.current + 1;

      if (next >= max) {
        clearInterval(timer);
        stepRef.current = max;
        setStepIndex(max);
        if (followCamera) followCar(currentPath[max], 400);

        if (phase === 'to_pickup') {
          setPhase('arrived_pickup');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (isDriver) void markArrivedPickup();
          return;
        }

        if (phase === 'to_destination') {
          const end = new Date();
          const start = tripStartRef.current ?? end;
          setTripDurationSec(Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000)));
          setPhase('done');
          setShowSummary(true);
          void completeRide();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return;
      }

      stepRef.current = next;
      setStepIndex(next);
      const pos = currentPath[next];
      if (followCamera) followCar(pos, STEP_MS);
      if (isDriver) {
        void publishDriverLocation(pos.latitude, pos.longitude, bearingBetween(pos, currentPath[Math.min(next + 1, max)]));
      }
    }, STEP_MS);

    return () => clearInterval(timer);
  }, [
    completeRide,
    followCamera,
    followCar,
    isDriver,
    isMoving,
    markArrivedPickup,
    phase,
    publishDriverLocation,
  ]);

  const onArrivedConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markArrivedPickup();
    setPhase('arrived_pickup');
  };

  const onStartTrip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startTrip();
    pathRef.current = tripPath;
    stepRef.current = 0;
    setStepIndex(0);
    setFollowCamera(true);
    setPhase('to_destination');
    tripStartRef.current = new Date();
    followCar(pickupPoint, 700);
  };

  const finish = async () => {
    await clearActiveRide();
    router.replace(isPassenger ? '/(tabs)' : '/driver');
  };

  const statusTitle =
    phase === 'loading'
      ? 'Cargando ruta...'
      : phase === 'to_pickup'
        ? isDriver
          ? 'Navegando al punto de recogida'
          : 'Conductor en camino'
        : phase === 'arrived_pickup'
          ? isDriver
            ? 'Llegaste al pickup'
            : 'Conductor en tu ubicación'
          : phase === 'to_destination'
            ? `En viaje · ${destLabel}`
            : `${originLabel} → ${destLabel}`;

  if (!activeRide) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.foreground }]}>Sin viaje activo</Text>
        <Pressable onPress={() => router.replace(isDriver ? '/driver' : '/(tabs)')} style={styles.backLink}>
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'loading') {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.foreground }]}>
          Trazando ruta por las calles...
        </Text>
      </View>
    );
  }

  const markerCar = isPassenger && driverLive ? driverLive : carPosition;
  const outlineShape = useMemo(() => lineFeature(activeOutline), [activeOutline]);
  const traveledShape = useMemo(() => lineFeature(traveled), [traveled]);

  return (
    <View style={styles.screen}>
      <Map
        style={styles.map}
        mapStyle={OSM_STYLE}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, left: 8 }}
        compass={false}
        onRegionIsChanging={(event) => {
          if (event.nativeEvent.userInteraction && isMoving) setFollowCamera(false);
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: toLngLat(pickupPoint),
            zoom: 13,
          }}
        />

        <Marker id="pickup" lngLat={toLngLat(pickupPoint)} anchor="bottom">
          <View style={styles.pinGreen}>
            <Feather name="circle" size={12} color="#ffffff" />
          </View>
        </Marker>
        <Marker id="destination" lngLat={toLngLat(destinationPoint)} anchor="bottom">
          <View style={styles.pinRed}>
            <Feather name="map-pin" size={18} color="#ffffff" />
          </View>
        </Marker>

        {outlineShape ? (
          <GeoJSONSource id="outline" data={outlineShape}>
            <Layer
              id="outline-line"
              type="line"
              source="outline"
              paint={{ 'line-color': 'rgba(19,138,104,0.35)', 'line-width': 8 }}
            />
          </GeoJSONSource>
        ) : null}
        {traveledShape ? (
          <GeoJSONSource id="traveled" data={traveledShape}>
            <Layer
              id="traveled-line"
              type="line"
              source="traveled"
              paint={{ 'line-color': colors.primary, 'line-width': 5 }}
            />
          </GeoJSONSource>
        ) : null}

        <Marker id="car" lngLat={toLngLat(markerCar)} anchor="center">
          <View style={[styles.carOuter, { transform: [{ rotate: `${carHeading}deg` }] }]}>
            <View style={[styles.carInner, { backgroundColor: '#111b17' }]}>
              <Feather name="navigation" size={18} color="#ffffff" />
            </View>
          </View>
        </Marker>
      </Map>

      <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.roundBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[styles.statusChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.foreground }]} numberOfLines={2}>
            {statusTitle}
          </Text>
        </View>
        {!followCamera && isMoving ? (
          <Pressable
            onPress={() => {
              setFollowCamera(true);
              followCar(carPosition, 500);
            }}
            style={styles.roundBtn}
          >
            <Feather name="crosshair" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
        {user ? (
          <RideChatButton
            rideId={activeRide.id}
            meId={user.id}
            peerName={
              isPassenger
                ? activeRide.driverName || 'Conductor'
                : activeRide.passengerName || 'Pasajero'
            }
          />
        ) : null}
      </SafeAreaView>

      {!showSummary && (
        <View style={styles.bottomPanel}>
          {isMoving ? (
            <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.navTop}>
                <View style={[styles.etaBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.etaValue, { color: colors.primary }]}>
                    {Math.max(1, Math.ceil((1 - progress) * (phase === 'to_pickup' ? 5 : 12)))}
                  </Text>
                  <Text style={[styles.etaUnit, { color: colors.primary }]}>min</Text>
                </View>
                <View style={styles.navCopy}>
                  <Text style={[styles.navTitle, { color: colors.foreground }]}>
                    {phase === 'to_pickup' ? 'Ruta al pickup' : 'Ruta al destino'}
                  </Text>
                  <Text style={[styles.navSubtitle, { color: colors.mutedForeground }]}>
                    {remainingKm} km · calles reales
                  </Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {isDriver && phase === 'to_pickup' ? (
            <Pressable
              onPress={onArrivedConfirm}
              style={[styles.cta, { backgroundColor: '#d88d2e' }]}
            >
              <Text style={styles.ctaTitle}>Llegué al punto</Text>
            </Pressable>
          ) : null}

          {isDriver && phase === 'arrived_pickup' ? (
            <Pressable onPress={onStartTrip} style={[styles.cta, { backgroundColor: colors.primary }]}>
              <Text style={styles.ctaTitle}>Iniciar viaje</Text>
            </Pressable>
          ) : null}

          {isPassenger && phase === 'arrived_pickup' ? (
            <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.navTitle, { color: colors.foreground }]}>
                El conductor llegó. Esperando inicio del viaje…
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <RideNotice
        visible={showSummary}
        tone="success"
        icon="check-circle"
        eyebrow="VIAJE COMPLETADO"
        title={isDriver ? 'Ganancia registrada' : 'Llegaste a tu destino'}
        message={`${originLabel} → ${destLabel}`}
        details={[
          { label: isDriver ? 'Ganaste' : 'Pagaste', value: `$${(isDriver ? earnings : fare).toFixed(2)}` },
          { label: 'Duración', value: `${tripDurationSec}s (demo)` },
        ]}
        primaryLabel="Listo"
        onPrimary={finish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  pinGreen: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  pinRed: {
    alignItems: 'center',
    backgroundColor: '#c2410c',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  loadingScreen: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  loadingText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  backLink: { marginTop: 8, padding: 12 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  roundBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statusChip: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  statusText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bottomPanel: { bottom: 28, gap: 10, left: 16, position: 'absolute', right: 16 },
  navCard: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 14 },
  navTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  etaBadge: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  etaValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  etaUnit: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  navCopy: { flex: 1, gap: 2 },
  navTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  navSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  progressTrack: { borderRadius: 4, height: 5, overflow: 'hidden' },
  progressFill: { height: 5 },
  cta: {
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
  },
  ctaTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  carOuter: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  carInner: {
    alignItems: 'center',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
