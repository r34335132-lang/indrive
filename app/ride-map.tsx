import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationBanner } from '@/components/NavigationBanner';
import { RideChatButton } from '@/components/RideChatSheet';
import { RideNotice } from '@/components/RideNotice';
import { AppMap } from '@/components/maps/AppMap';
import { BRAND, cardShadow } from '@/constants/theme';
import { closeRealtimeChannel, fetchRideLocation, subscribeRideLocation } from '@/lib/api/rides';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';
import {
  formatArrivalTime,
  formatDistanceM,
  formatEtaMinutes,
  openExternalNavigation,
  resolveGuidance,
} from '@/lib/navigation';
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

const summaryBackground = require('@/assets/images/login-bg.jpg');

const PASSENGER_STEPS = ['Solicitado', 'En camino', 'Llegó', 'En viaje'];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

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
  const lastRouteTo = useRef('');
  const publishRef = useRef(publishDriverLocation);
  publishRef.current = publishDriverLocation;

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

  const passengerStep =
    phase === 'to_pickup' ? 1 : phase === 'arrived_pickup' ? 2 : 3;
  const passengerEta = guidance
    ? formatEtaMinutes(guidance.remainingSeconds)
    : routeMeta.seconds > 0
      ? formatEtaMinutes(routeMeta.seconds)
      : '—';
  const passengerDistance = guidance
    ? formatDistanceM(guidance.remainingMeters)
    : driverLive
      ? `${distanceKmBetween(driverLive, targetPoint).toFixed(1)} km`
      : '';
  const passengerHint =
    phase === 'to_pickup'
      ? 'Tu conductor viene en camino'
      : phase === 'arrived_pickup'
        ? 'Tu conductor llegó al punto de partida'
        : 'Rumbo a tu destino';

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
          void publishRef.current(next.latitude, next.longitude, lastHeading.current).catch(() => {});
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
            void publishRef.current(point.latitude, point.longitude, nextHeading).catch(() => {});
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
  }, [activeRide?.id, isDriver]);

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
    const toKey = `${to.latitude.toFixed(5)},${to.longitude.toFixed(5)}`;
    const sameTarget = lastRouteTo.current === toKey;
    const prev = lastRouteFrom.current;
    if (sameTarget && prev && distanceKmBetween(prev, from) < 0.12 && routeCoords.length > 1) {
      return;
    }
    if (!sameTarget) {
      setRouteCoords([]);
      setRouteSteps([]);
      setRouteMeta({ meters: 0, seconds: 0 });
    }
    let cancelled = false;
    setRouting(true);
    getOsrmRoute(from, to)
      .then((route) => {
        if (cancelled) return;
        lastRouteFrom.current = from;
        lastRouteTo.current = toKey;
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
        maneuver={
          navigating && guidance && guidance.step.type !== 'arrive' && guidance.step.streetName
            ? { coordinate: guidance.step.location, label: guidance.step.streetName }
            : null
        }
        markers={[
          { id: 'pickup', coordinate: pickupPoint, color: '#138a68' },
          { id: 'dest', coordinate: destinationPoint, color: '#c2410c' },
          ...(carOnMap ? [{ id: 'car', coordinate: carOnMap, color: '#111b17' }] : []),
        ]}
      />

      {navigating ? (
        <NavigationBanner
          guidance={guidance}
          destinationLabel={targetLabel}
          topInset={insets.top}
          navLocked={navLocked}
          onRecenter={() => setNavLocked((v) => !v)}
          leftAction={
            <Pressable onPress={() => router.back()} style={styles.toolBtn}>
              <Feather name="arrow-left" size={20} color="#202124" />
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
            <Feather name="arrow-left" size={20} color={BRAND.primary} />
          </Pressable>
          <View style={styles.statusChip}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: waitExpired ? '#d88d2e' : BRAND.green },
              ]}
            />
            <Text style={styles.statusText} numberOfLines={2}>
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

          {isPassenger ? (
            <View style={styles.tripCard}>
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  {activeRide.driverPhotoUrl ? (
                    <Image
                      source={{ uri: activeRide.driverPhotoUrl }}
                      style={styles.driverAvatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.driverAvatarText}>
                      {initialsOf(activeRide.driverName || 'Conductor')}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {activeRide.driverName || 'Conductor'}
                  </Text>
                  <Text style={styles.driverMeta} numberOfLines={1}>
                    ★ {Number(activeRide.driverRating || 5).toFixed(1)} · {activeRide.driverCar}
                  </Text>
                </View>
                <View style={styles.plate}>
                  <Text style={styles.plateText}>{activeRide.driverPlate}</Text>
                </View>
              </View>

              <View style={styles.stepper}>
                {PASSENGER_STEPS.map((label, index) => {
                  const done = index < passengerStep;
                  const current = index === passengerStep;
                  return (
                    <View key={label} style={styles.step}>
                      <View style={styles.stepTrack}>
                        <View
                          style={[
                            styles.stepLine,
                            index === 0 && styles.stepLineHidden,
                            (done || current) && styles.stepLineOn,
                          ]}
                        />
                        <View
                          style={[
                            styles.stepDot,
                            done && styles.stepDotDone,
                            current && styles.stepDotCurrent,
                          ]}
                        >
                          {done ? <Feather name="check" size={11} color="#fff" /> : null}
                          {current ? (
                            <MaterialCommunityIcons name="car-side" size={13} color={BRAND.primary} />
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.stepLine,
                            index === PASSENGER_STEPS.length - 1 && styles.stepLineHidden,
                            done && styles.stepLineOn,
                          ]}
                        />
                      </View>
                      <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.etaBlock}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etaBig}>
                    {phase === 'arrived_pickup' ? 'Ya llegó' : passengerEta}
                  </Text>
                  <Text style={styles.etaHint} numberOfLines={1}>
                    {passengerDistance ? `${passengerDistance} · ` : ''}
                    {passengerHint}
                  </Text>
                </View>
                <View style={styles.farePill}>
                  <Text style={styles.farePillText}>${money(fare)}</Text>
                </View>
              </View>

              {phase === 'arrived_pickup' ? (
                <View style={styles.waitRow}>
                  <Feather name="clock" size={14} color={waitExpired ? '#d88d2e' : BRAND.green} />
                  <Text style={styles.waitText}>
                    Espera {formatClock(Math.min(waitSec, MAX_WAIT_SEC))} / 5:00 · $
                    {WAIT_PESOS_PER_MIN}/min · cargo ${waitCost}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : phase === 'arrived_pickup' ? (
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
            <View style={styles.navBar}>
              <View style={styles.navBarTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navEta}>
                    {guidance ? formatEtaMinutes(guidance.remainingSeconds) : routing ? 'Calculando…' : '—'}
                  </Text>
                  <Text style={styles.navEtaSub} numberOfLines={1}>
                    {guidance
                      ? `${formatDistanceM(guidance.remainingMeters)} · Llegada ${formatArrivalTime(guidance.remainingSeconds)}`
                      : targetLabel}
                  </Text>
                </View>
                <View style={styles.navEarn}>
                  <Text style={styles.navEarnLabel}>Ganas</Text>
                  <Text style={styles.navEarnValue}>${money(earnings)}</Text>
                </View>
              </View>
              <View style={styles.navTarget}>
                <View
                  style={[
                    styles.navTargetDot,
                    { backgroundColor: phase === 'to_pickup' ? '#138a68' : '#c2410c' },
                  ]}
                />
                <Text style={styles.navTargetText} numberOfLines={1}>
                  {phase === 'to_pickup'
                    ? `Recoger a ${activeRide.passengerName || 'pasajero'} · ${originLabel}`
                    : `Destino · ${destLabel}`}
                </Text>
              </View>
              <View style={styles.extNavRow}>
                <Pressable
                  onPress={() => void openExternalNavigation('google', targetPoint).catch(() => {})}
                  style={({ pressed }) => [styles.extNavBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="google-maps" size={18} color="#1a73e8" />
                  <Text style={styles.extNavText}>Google Maps</Text>
                </Pressable>
                <Pressable
                  onPress={() => void openExternalNavigation('waze', targetPoint).catch(() => {})}
                  style={({ pressed }) => [styles.extNavBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="waze" size={18} color="#05c8f7" />
                  <Text style={styles.extNavText}>Waze</Text>
                </Pressable>
              </View>
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

          {!isPassenger && !myLocation && !permissionDenied && phase !== 'arrived_pickup' ? (
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
        <View style={[styles.summaryWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.summaryCard}>
            <ImageBackground
              source={summaryBackground}
              style={styles.summaryHero}
              imageStyle={styles.summaryHeroImage}
              resizeMode="cover"
            >
              <View style={styles.summaryHeroShade} />
              <View style={styles.summaryCheck}>
                <Feather name="check" size={26} color={BRAND.green} />
              </View>
              <Text style={styles.summaryTitle}>¡Viaje completado!</Text>
              <Text style={styles.summarySub}>Gracias por viajar con INRIDE</Text>
            </ImageBackground>

            <View style={styles.summaryBody}>
              <View style={styles.summaryInfo}>
                <View style={styles.summaryPerson}>
                  <View style={styles.driverAvatar}>
                    {isPassenger && activeRide.driverPhotoUrl ? (
                      <Image
                        source={{ uri: activeRide.driverPhotoUrl }}
                        style={styles.driverAvatarImg}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.driverAvatarText}>
                        {initialsOf(
                          isPassenger
                            ? activeRide.driverName || 'Conductor'
                            : activeRide.passengerName || 'Pasajero',
                        )}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {isPassenger
                        ? activeRide.driverName || 'Conductor'
                        : activeRide.passengerName || 'Pasajero'}
                    </Text>
                    <Text style={styles.driverMeta} numberOfLines={1}>
                      ★{' '}
                      {Number(
                        (isPassenger ? activeRide.driverRating : activeRide.passengerRating) || 5,
                      ).toFixed(1)}
                      {isPassenger ? ` · ${activeRide.driverPlate}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRoute}>
                  <View style={styles.summaryRouteRow}>
                    <View style={[styles.routeDotSmall, { backgroundColor: BRAND.green }]} />
                    <Text style={styles.summaryRouteText} numberOfLines={1}>
                      {originLabel}
                    </Text>
                  </View>
                  <View style={styles.summaryRouteRow}>
                    <View style={[styles.routeDotSmall, { backgroundColor: BRAND.red }]} />
                    <Text style={styles.summaryRouteText} numberOfLines={1}>
                      {destLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <MaterialCommunityIcons name="car-side" size={18} color={BRAND.primary} />
                  <View>
                    <Text style={styles.summaryStatLabel}>Distancia</Text>
                    <Text style={styles.summaryStatValue}>
                      {Number(activeRide.distanceKm || 0).toFixed(1)} km
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryStat}>
                  <Feather name="clock" size={16} color={BRAND.primary} />
                  <View>
                    <Text style={styles.summaryStatLabel}>Tiempo</Text>
                    <Text style={styles.summaryStatValue}>
                      {tripDurationSec > 0
                        ? `${Math.max(1, Math.round(tripDurationSec / 60))} min`
                        : activeRide.duration}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryStat}>
                  <Feather
                    name={activeRide.paymentMethod === 'card' ? 'credit-card' : 'dollar-sign'}
                    size={16}
                    color={BRAND.primary}
                  />
                  <View>
                    <Text style={styles.summaryStatLabel}>
                      {isDriver ? 'Ganas' : activeRide.paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}
                    </Text>
                    <Text style={styles.summaryStatValue}>
                      ${money(isDriver ? earnings : fare)}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => void finish()}
                style={({ pressed }) => [styles.finishBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.finishText}>Listo</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  map: { ...StyleSheet.absoluteFill },
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
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statusChip: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  statusText: { color: BRAND.text, flex: 1, fontFamily: 'Inter_700Bold', fontSize: 13 },
  tripCard: {
    ...cardShadow,
    backgroundColor: '#fff',
    borderRadius: 24,
    gap: 14,
    padding: 16,
  },
  driverRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  driverAvatar: {
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderColor: BRAND.mint,
    borderRadius: 26,
    borderWidth: 3,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  driverAvatarImg: { height: '100%', width: '100%' },
  driverAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  driverName: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 17 },
  driverMeta: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  plate: {
    backgroundColor: BRAND.bg,
    borderColor: BRAND.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  plateText: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 },
  stepper: { flexDirection: 'row' },
  step: { alignItems: 'center', flex: 1, gap: 6 },
  stepTrack: { alignItems: 'center', flexDirection: 'row', width: '100%' },
  stepLine: { backgroundColor: BRAND.border, flex: 1, height: 3 },
  stepLineOn: { backgroundColor: BRAND.green },
  stepLineHidden: { backgroundColor: 'transparent' },
  stepDot: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: BRAND.border,
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stepDotDone: { backgroundColor: BRAND.green, borderColor: BRAND.green },
  stepDotCurrent: { backgroundColor: BRAND.mint, borderColor: BRAND.primary },
  stepLabel: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 11 },
  stepLabelOn: { color: BRAND.text, fontFamily: 'Inter_700Bold' },
  etaBlock: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  etaBig: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 24 },
  etaHint: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  farePill: {
    backgroundColor: BRAND.mint,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  farePillText: { color: BRAND.primary, fontFamily: 'Inter_700Bold', fontSize: 16 },
  waitRow: {
    alignItems: 'center',
    backgroundColor: BRAND.bg,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waitText: { color: BRAND.text, flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  summaryWrap: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  summaryCard: {
    ...cardShadow,
    backgroundColor: '#fff',
    borderRadius: 26,
    overflow: 'hidden',
  },
  summaryHero: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 18,
    paddingTop: 20,
  },
  summaryHeroImage: { opacity: 0.9 },
  summaryHeroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,30,25,0.45)',
  },
  summaryCheck: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 6,
    width: 52,
  },
  summaryTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 22 },
  summarySub: { color: '#d6ece4', fontFamily: 'Inter_500Medium', fontSize: 13 },
  summaryBody: { gap: 14, padding: 16 },
  summaryInfo: {
    backgroundColor: BRAND.bg,
    borderRadius: 18,
    gap: 12,
    padding: 14,
  },
  summaryPerson: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  summaryDivider: { backgroundColor: BRAND.border, height: 1 },
  summaryRoute: { gap: 8 },
  summaryRouteRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  routeDotSmall: { borderRadius: 5, height: 10, width: 10 },
  summaryRouteText: { color: BRAND.text, flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summaryStats: { flexDirection: 'row', gap: 8 },
  summaryStat: {
    alignItems: 'center',
    backgroundColor: BRAND.bg,
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  summaryStatLabel: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 10 },
  summaryStatValue: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 1 },
  finishBtn: {
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
  },
  finishText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  toolBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    width: 48,
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
  navBar: {
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 8,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  navBarTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  navEta: { color: '#188038', fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.5 },
  navEtaSub: { color: '#5f6368', fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 1 },
  navEarn: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navEarnLabel: { color: BRAND.muted, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  navEarnValue: { color: BRAND.primary, fontFamily: 'Inter_700Bold', fontSize: 16 },
  navTarget: {
    alignItems: 'center',
    borderTopColor: '#eceff1',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  navTargetDot: { borderRadius: 5, height: 10, width: 10 },
  navTargetText: { color: '#202124', flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  extNavRow: { flexDirection: 'row', gap: 10 },
  extNavBtn: {
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 20,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    justifyContent: 'center',
  },
  extNavText: { color: '#202124', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: 28,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
