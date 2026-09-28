import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationBanner } from '@/components/NavigationBanner';
import { RideChatButton } from '@/components/RideChatSheet';
import { RideNotice } from '@/components/RideNotice';
import { AppMap } from '@/components/maps/AppMap';
import { closeRealtimeChannel, fetchRideLocation, subscribeRideLocation } from '@/lib/api/rides';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';
import { formatDistanceM, formatEtaMinutes, resolveGuidance } from '@/lib/navigation';
import {
  bearingBetween,
  distanceKmBetween,
  DRIVER_NEARBY,
  getOsrmRoute,
  type LatLng,
} from '@/lib/routing';
import type { OsrmStep } from '@/types';

type Phase = 'to_pickup' | 'arrived_pickup' | 'to_destination' | 'done';

const MAX_WAIT_SEC = 5 * 60;
const WAIT_PESOS_PER_MIN = 1;

function asLatLng(lat: unknown, lng: unknown, fallback: LatLng = DRIVER_NEARBY): LatLng {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return fallback;
  }
  return { latitude, longitude };
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(0) : '0';
}

function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function phaseFromStatus(status: string | undefined): Phase {
  if (status === 'in_progress') return 'to_destination';
  if (status === 'arrived_pickup') return 'arrived_pickup';
  if (status === 'completed') return 'done';
  return 'to_pickup';
}

export default function RideMapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, user } = useAuth();
  const {
    activeRide,
    markArrivedPickup,
    startTrip,
    completeRide,
    clearActiveRide,
    cancelActiveRide,
    applyWaitFare,
    publishDriverLocation,
  } = useBooking();

  const isDriver = role === 'driver';
  const isPassenger = role === 'passenger';
  const tripStartRef = useRef<Date | null>(null);
  const waitStartedAt = useRef<number | null>(null);
  const lastPublishAt = useRef(0);
  const lastHeading = useRef(0);
  const lastRouteFrom = useRef<LatLng | null>(null);

  const pickupPoint = useMemo(
    () =>
      activeRide
        ? asLatLng(activeRide.originLat, activeRide.originLng, DRIVER_NEARBY)
        : DRIVER_NEARBY,
    [activeRide?.originLat, activeRide?.originLng],
  );
  const destinationPoint = useMemo(
    () =>
      activeRide
        ? asLatLng(activeRide.destinationLat, activeRide.destinationLng, DRIVER_NEARBY)
        : DRIVER_NEARBY,
    [activeRide?.destinationLat, activeRide?.destinationLng],
  );

  const [phase, setPhase] = useState<Phase>(() => phaseFromStatus(activeRide?.status));
  const [showSummary, setShowSummary] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [tripDurationSec, setTripDurationSec] = useState(0);
  const [waitSec, setWaitSec] = useState(0);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [driverLive, setDriverLive] = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeSteps, setRouteSteps] = useState<OsrmStep[]>([]);
  const [routeMeta, setRouteMeta] = useState({ meters: 0, seconds: 0 });
  const [routing, setRouting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [navLocked, setNavLocked] = useState(true);
  const [liveHeading, setLiveHeading] = useState(0);

  const originLabel = activeRide?.origin ?? 'Origen';
  const destLabel = activeRide?.destination ?? 'Destino';
  const fare = Number(activeRide?.price ?? 0) || 0;
  const earnings = Number(activeRide?.net ?? 0) || 0;

  const navigating = isDriver && (phase === 'to_pickup' || phase === 'to_destination');
  const targetPoint = phase === 'to_destination' || phase === 'done' ? destinationPoint : pickupPoint;
  const targetLabel = phase === 'to_destination' || phase === 'done' ? destLabel : originLabel;
  const carOnMap = isDriver ? myLocation : driverLive;
  const mapCenter = carOnMap ?? (isPassenger ? pickupPoint : myLocation) ?? pickupPoint;

  const heading = useMemo(() => {
    if (Number.isFinite(liveHeading) && liveHeading >= 0) return liveHeading;
    if (myLocation) return bearingBetween(myLocation, targetPoint);
    return 0;
  }, [liveHeading, myLocation?.latitude, myLocation?.longitude, targetPoint.latitude, targetPoint.longitude]);

  const guidance = useMemo(
    () =>
      resolveGuidance(
        routeSteps,
        isDriver ? myLocation : driverLive,
        routeMeta.meters,
        routeMeta.seconds,
      ),
    [routeSteps, myLocation, driverLive, isDriver, routeMeta.meters, routeMeta.seconds],
  );

  const waitMinutesBillable = Math.ceil(waitSec / 60);
  const waitCost = waitMinutesBillable * WAIT_PESOS_PER_MIN;
  const waitExpired = phase === 'arrived_pickup' && waitSec >= MAX_WAIT_SEC;
  /** Conductor: cancelar solo tras 5 min de espera. Pasajero: mientras no haya iniciado el viaje. */
  const canCancel =
    isPassenger
      ? phase === 'to_pickup' || phase === 'arrived_pickup'
      : waitExpired;

  const phaseLabel =
    phase === 'to_pickup'
      ? isDriver
        ? 'Hacia el pasajero'
        : 'Conductor en camino'
      : phase === 'arrived_pickup'
        ? waitExpired
          ? 'Espera agotada'
          : 'En el pickup'
        : phase === 'to_destination'
          ? 'En viaje'
          : 'Finalizado';

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        let status = current.status;
        if (status !== 'granted') {
          const asked = await Location.requestForegroundPermissionsAsync();
          status = asked.status;
        }
        if (cancelled) return;
        if (status !== 'granted') {
          setPermissionDenied(true);
          setLocationError('Necesitamos tu ubicación para mostrar el mapa del viaje.');
          return;
        }
        setPermissionDenied(false);
        setLocationError(null);

        const first = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (cancelled) return;
        const next = {
          latitude: first.coords.latitude,
          longitude: first.coords.longitude,
        };
        setMyLocation(next);
        if (first.coords.heading != null && first.coords.heading >= 0) {
          lastHeading.current = first.coords.heading;
          setLiveHeading(first.coords.heading);
        }
        if (isDriver && activeRide?.id) {
          void publishDriverLocation(next.latitude, next.longitude, lastHeading.current);
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1500,
            distanceInterval: 5,
          },
          (pos) => {
            const point = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setMyLocation(point);
            const nextHeading =
              pos.coords.heading != null && pos.coords.heading >= 0
                ? pos.coords.heading
                : lastHeading.current;
            lastHeading.current = nextHeading;
            setLiveHeading(nextHeading);

            if (!isDriver || !activeRide?.id) return;
            const now = Date.now();
            if (now - lastPublishAt.current < 2000) return;
            lastPublishAt.current = now;
            void publishDriverLocation(point.latitude, point.longitude, nextHeading).catch(() => {});
          },
        );
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error ? error.message : 'No se pudo obtener la ubicación.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [activeRide?.id, isDriver, publishDriverLocation]);

  useEffect(() => {
    if (!activeRide) return;
    const next = phaseFromStatus(activeRide.status);
    setPhase(next);
    lastRouteFrom.current = null;
    if (next === 'arrived_pickup') {
      if (!waitStartedAt.current) waitStartedAt.current = Date.now();
    } else {
      waitStartedAt.current = null;
      setWaitSec(0);
    }
    if (next === 'to_destination' && !tripStartRef.current) {
      tripStartRef.current = new Date();
    }
    if (next === 'done') setShowSummary(true);
  }, [activeRide?.status, activeRide?.id]);

  useEffect(() => {
    if (phase !== 'arrived_pickup') return;
    if (!waitStartedAt.current) waitStartedAt.current = Date.now();
    const tick = setInterval(() => {
      const started = waitStartedAt.current ?? Date.now();
      setWaitSec(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (!activeRide) return;
    const from =
      isDriver && myLocation
        ? myLocation
        : isPassenger && driverLive
          ? driverLive
          : myLocation ?? pickupPoint;
    const to = targetPoint;
    const prev = lastRouteFrom.current;
    if (prev && distanceKmBetween(prev, from) < 0.12 && routeCoords.length > 1) {
      return;
    }
    let cancelled = false;
    setRouting(true);
    getOsrmRoute(from, to)
      .then((route) => {
        if (cancelled) return;
        lastRouteFrom.current = from;
        setRouteCoords(route.coordinates);
        setRouteSteps(route.steps ?? []);
        setRouteMeta({
          meters: route.distanceMeters,
          seconds: route.durationSeconds,
        });
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeRide?.id,
    phase,
    isDriver,
    isPassenger,
    myLocation?.latitude,
    myLocation?.longitude,
    driverLive?.latitude,
    driverLive?.longitude,
    targetPoint.latitude,
    targetPoint.longitude,
  ]);

  useEffect(() => {
    if (!isPassenger || !activeRide?.id) return;
    fetchRideLocation(activeRide.id)
      .then((loc) => {
        if (loc) setDriverLive({ latitude: loc.lat, longitude: loc.lng });
      })
      .catch(() => {});
    let channel: ReturnType<typeof subscribeRideLocation> | null = null;
    try {
      channel = subscribeRideLocation(activeRide.id, (loc) => {
        setDriverLive({ latitude: loc.lat, longitude: loc.lng });
      });
    } catch (error) {
      console.warn(error);
    }
    return () => closeRealtimeChannel(channel);
  }, [activeRide?.id, isPassenger]);

  const askLocationAgain = async () => {
    setLocationError(null);
    const asked = await Location.requestForegroundPermissionsAsync();
    if (asked.status !== 'granted') {
      setPermissionDenied(true);
      setLocationError('Activa la ubicación en Ajustes del teléfono para inride.');
      return;
    }
    setPermissionDenied(false);
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    setMyLocation({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
  };

  const onArrivedPickup = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await markArrivedPickup();
      waitStartedAt.current = Date.now();
      setWaitSec(0);
      setPhase('arrived_pickup');
    } catch (error) {
      console.warn(error);
    }
  };

  const onStartTrip = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (waitMinutesBillable > 0) {
        await applyWaitFare(waitMinutesBillable);
      }
      await startTrip();
      tripStartRef.current = new Date();
      waitStartedAt.current = null;
      setWaitSec(0);
      setPhase('to_destination');
      setNavLocked(true);
    } catch (error) {
      console.warn(error);
    }
  };

  const onCompleteTrip = async () => {
    const end = new Date();
    const start = tripStartRef.current ?? end;
    setTripDurationSec(Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000)));
    try {
      await completeRide();
    } catch (error) {
      console.warn(error);
    }
    setPhase('done');
    setShowSummary(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onConfirmCancel = async () => {
    setShowCancel(false);
    try {
      if (phase === 'arrived_pickup' && waitMinutesBillable > 0) {
        await applyWaitFare(waitMinutesBillable);
      }
      await cancelActiveRide();
    } catch {
      await clearActiveRide();
    }
    router.replace(isPassenger ? '/(tabs)' : '/driver');
  };

  const finish = async () => {
    try {
      await clearActiveRide();
    } catch {
      // ignore
    }
    router.replace(isPassenger ? '/(tabs)' : '/driver');
  };

  if (!activeRide) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.foreground }]}>Sin viaje activo</Text>
        <Pressable
          onPress={() => router.replace(isDriver ? '/driver' : '/(tabs)')}
          style={styles.backLink}
        >
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppMap
        style={styles.map}
        center={mapCenter}
        zoom={navigating && navLocked ? 17 : 15}
        userLocation={isDriver ? myLocation : isPassenger ? pickupPoint : myLocation}
        destination={targetPoint}
        route={routeCoords}
        followUser={navigating && navLocked}
        navigationMode={navigating && navLocked}
        heading={heading}
        markers={[
          { id: 'pickup', coordinate: pickupPoint, color: '#138a68' },
          { id: 'dest', coordinate: destinationPoint, color: '#c2410c' },
          ...(carOnMap ? [{ id: 'car', coordinate: carOnMap, color: '#111b17' }] : []),
        ]}
      />

      {navigating || isPassenger ? (
        <NavigationBanner
          guidance={guidance}
          phaseLabel={phaseLabel}
          destinationLabel={targetLabel}
          topInset={insets.top}
          navLocked={navLocked}
          onRecenter={navigating ? () => setNavLocked((v) => !v) : undefined}
          leftAction={
            <Pressable onPress={() => router.back()} style={styles.toolBtn}>
              <Feather name="arrow-left" size={18} color="#16362f" />
            </Pressable>
          }
          rightAction={
            user ? (
              <RideChatButton
                rideId={activeRide.id}
                meId={user.id}
                peerName={
                  isPassenger
                    ? activeRide.driverName || 'Conductor'
                    : activeRide.passengerName || 'Pasajero'
                }
              />
            ) : null
          }
        />
      ) : (
        <SafeAreaView style={styles.header} edges={['top']} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} style={styles.roundBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={[styles.statusChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: waitExpired ? '#d88d2e' : colors.primary },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.foreground }]} numberOfLines={2}>
              {phaseLabel}
            </Text>
          </View>
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
      )}

      {!showSummary ? (
        <SafeAreaView
          style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 12) }]}
          edges={['bottom']}
          pointerEvents="box-none"
        >
          {permissionDenied || locationError ? (
            <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
                {locationError ?? 'Activa la ubicación'}
              </Text>
              <Pressable
                onPress={() => void askLocationAgain()}
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
              >
                <Text style={styles.primaryText}>Permitir ubicación</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === 'arrived_pickup' ? (
            <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.navTitle, { color: colors.foreground }]}>
                {formatClock(Math.min(waitSec, MAX_WAIT_SEC))} / 5:00
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                Espera · ${WAIT_PESOS_PER_MIN}/min · cargo actual ${waitCost}
              </Text>
              {waitExpired ? (
                <Text style={{ color: '#d88d2e', fontFamily: 'Inter_600SemiBold', marginTop: 4 }}>
                  Máximo cumplido. Puedes cancelar el viaje.
                </Text>
              ) : null}
            </View>
          ) : navigating ? (
            <View style={styles.driverSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetStats}>
                <View>
                  <Text style={styles.sheetLabel}>Pasajero</Text>
                  <Text style={styles.sheetValue} numberOfLines={1}>
                    {activeRide.passengerName || 'Pasajero'}
                  </Text>
                </View>
                <View style={styles.sheetDivider} />
                <View>
                  <Text style={styles.sheetLabel}>Ganas</Text>
                  <Text style={styles.sheetValue}>${money(earnings)}</Text>
                </View>
                <View style={styles.sheetDivider} />
                <View>
                  <Text style={styles.sheetLabel}>ETA</Text>
                  <Text style={styles.sheetValue}>
                    {guidance ? formatEtaMinutes(guidance.remainingSeconds) : routing ? '…' : '—'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sheetRoute} numberOfLines={1}>
                {phase === 'to_pickup' ? `Recoger en ${originLabel}` : `Llevar a ${destLabel}`}
                {guidance ? ` · ${formatDistanceM(guidance.remainingMeters)}` : ''}
              </Text>
            </View>
          ) : !permissionDenied && myLocation ? (
            <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.navTitle, { color: colors.foreground }]}>
                {guidance
                  ? `${formatDistanceM(guidance.remainingMeters)} · ${formatEtaMinutes(guidance.remainingSeconds)}`
                  : `${distanceKmBetween(myLocation, targetPoint).toFixed(1)} km`}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                {isPassenger ? 'Siguiendo al conductor' : 'Ubicación GPS en vivo'}
              </Text>
            </View>
          ) : null}

          {!myLocation && !permissionDenied && phase !== 'arrived_pickup' ? (
            <View style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                Esperando GPS…
              </Text>
            </View>
          ) : null}

          {isDriver && phase === 'to_pickup' ? (
            <Pressable
              onPress={() => void onArrivedPickup()}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryText}>Llegué al pickup</Text>
            </Pressable>
          ) : null}

          {isDriver && phase === 'arrived_pickup' ? (
            <Pressable
              onPress={() => void onStartTrip()}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryText}>
                {waitExpired ? 'Iniciar igual (con espera)' : 'Iniciar viaje'}
              </Text>
            </Pressable>
          ) : null}

          {isDriver && phase === 'to_destination' ? (
            <Pressable
              onPress={() => void onCompleteTrip()}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryText}>Finalizar viaje</Text>
            </Pressable>
          ) : null}

          {canCancel ? (
            <Pressable
              onPress={() => setShowCancel(true)}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: waitExpired ? '#c2410c' : colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.primaryText, { color: waitExpired ? '#fff' : colors.foreground }]}>
                {isDriver ? 'Cancelar (espera agotada)' : 'Cancelar viaje'}
              </Text>
            </Pressable>
          ) : null}
        </SafeAreaView>
      ) : (
        <RideNotice
          visible
          title="Viaje completado"
          message={`Duración ${Math.max(1, Math.round(tripDurationSec / 60))} min · $${money(fare)}${isDriver ? ` · ganas $${money(earnings)}` : ''}`}
          primaryLabel="Listo"
          onPrimary={() => void finish()}
        />
      )}

      <RideNotice
        visible={showCancel}
        tone="warning"
        icon="x-circle"
        eyebrow="CANCELAR"
        title={waitExpired ? '¿Cancelar por espera?' : '¿Cancelar viaje?'}
        message={
          waitExpired
            ? `Se cobrará $${waitCost} de espera ($1/min · ${waitMinutesBillable} min) y se cancelará el viaje.`
            : phase === 'arrived_pickup' && waitCost > 0
              ? `Hay $${waitCost} de espera acumulada. El viaje se cancelará.`
              : 'Se cancelará el viaje actual.'
        }
        primaryLabel="Sí, cancelar"
        onPrimary={() => void onConfirmCancel()}
        secondaryLabel="Seguir"
        onSecondary={() => setShowCancel(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#c5d5cc' },
  map: { ...StyleSheet.absoluteFillObject },
  loadingScreen: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  loadingText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  backLink: { marginTop: 8, padding: 12 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  roundBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statusChip: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusDot: { borderRadius: 5, height: 8, width: 8 },
  statusText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  toolBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: 42,
  },
  bottomPanel: {
    bottom: 0,
    gap: 10,
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
  },
  navCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  navTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  driverSheet: {
    backgroundColor: '#fff',
    borderRadius: 22,
    elevation: 6,
    gap: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#d5e0d9',
    borderRadius: 3,
    height: 4,
    marginBottom: 2,
    width: 40,
  },
  sheetStats: { alignItems: 'center', flexDirection: 'row' },
  sheetDivider: { backgroundColor: '#e8efe9', height: 36, marginHorizontal: 10, width: 1 },
  sheetLabel: { color: '#6d7c75', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  sheetValue: { color: '#111b17', fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 2 },
  sheetRoute: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 13 },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
