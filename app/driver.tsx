import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Redirect, type Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { RideNotice } from '@/components/RideNotice';
import { RideChatButton } from '@/components/RideChatSheet';
import { SideMenu } from '@/components/SideMenu';
import { LegalLinks } from '@/components/LegalLinks';
import { TripCard } from '@/components/TripCard';
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import { useBooking, type Trip } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useColors } from '@/hooks/useColors';
import { playNewRideChime } from '@/lib/newRideSound';
import type { Ride } from '@/types';

type TabId = 'home' | 'activity' | 'earnings';

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeekMonday(d = new Date()) {
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(d);
  monday.setDate(monday.getDate() + offset);
  return monday;
}

function tripTime(trip: Trip) {
  const raw = trip.createdAt ? new Date(trip.createdAt) : null;
  return raw && !Number.isNaN(raw.getTime()) ? raw : null;
}

export default function DriverScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout, deleteAccount, docsComplete, docsApproved, blockFeeSatisfied, satisfyBlockFee, isReady, role } = useAuth();
  const { trips, openRides, acceptRideAsDriver, activeRide } = useBooking();
  const { tariff } = useTariff();

  const [tab, setTab] = useState<TabId>('home');
  const [selected, setSelected] = useState<Ride | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showNewTripNotice, setShowNewTripNotice] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notifiedId = useRef<string | null>(null);

  const pulse = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const completed = useMemo(() => trips.filter((t) => t.status === 'Completado'), [trips]);

  const earnings = useMemo(() => {
    const todayStart = startOfDay();
    const weekStart = startOfWeekMonday();
    let today = 0;
    let week = 0;
    let todayTrips = 0;
    let weekTrips = 0;
    for (const trip of completed) {
      const when = tripTime(trip);
      if (!when) {
        week += trip.driverNet;
        weekTrips += 1;
        continue;
      }
      if (when >= weekStart) {
        week += trip.driverNet;
        weekTrips += 1;
      }
      if (when >= todayStart) {
        today += trip.driverNet;
        todayTrips += 1;
      }
    }
    return { today, week, todayTrips, weekTrips };
  }, [completed]);

  const lifetimeEarnings = useMemo(
    () => completed.reduce((sum, trip) => sum + Number(trip.driverNet || 0), 0),
    [completed],
  );
  const blockFee = Number(tariff.systemBlockFee) || 300;
  const canWork = blockFeeSatisfied || lifetimeEarnings >= blockFee;
  const blockProgress = Math.min(1, lifetimeEarnings / Math.max(blockFee, 1));

  const availableRides = useMemo(
    () => (online && canWork ? openRides.filter((ride) => !skippedIds.includes(ride.id)) : []),
    [openRides, skippedIds, online, canWork],
  );
  const offer = availableRides[0] ?? null;
  const live =
    activeRide &&
    ['accepted', 'en_route_pickup', 'arrived_pickup', 'in_progress'].includes(activeRide.status)
      ? activeRide
      : null;

  useEffect(() => {
    if (!blockFeeSatisfied && lifetimeEarnings >= blockFee) {
      void satisfyBlockFee();
    }
  }, [blockFeeSatisfied, lifetimeEarnings, blockFee, satisfyBlockFee]);

  useEffect(() => {
    if (!canWork && online) setOnline(false);
  }, [canWork, online]);

  const avgRating =
    completed.reduce((sum, t) => sum + (t.rating ?? 0), 0) /
    Math.max(completed.filter((t) => t.rating).length, 1);

  const recentTrips = trips.slice(0, 8);
  const todayTripsList = completed.filter((t) => {
    const when = tripTime(t);
    return when ? when >= startOfDay() : false;
  });

  useEffect(() => {
    if (!docsComplete && role === 'driver') {
      router.replace('/register-driver');
    }
  }, [docsComplete, role, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fade, pulse, slide]);

  useEffect(() => {
    if (!offer || notifiedId.current === offer.id) return;
    notifiedId.current = offer.id;
    setSelected(offer);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void playNewRideChime();
    setShowNewTripNotice(true);
  }, [offer]);

  if (isReady && role === 'passenger') {
    return <Redirect href="/(tabs)" />;
  }
  if (isReady && role === 'admin') {
    return <Redirect href="/admin" />;
  }
  if (isReady && !user) {
    return <Redirect href="/" />;
  }

  const acceptTrip = async () => {
    if (!canWork) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!selected && !offer) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void playNewRideChime();
    try {
      await acceptRideAsDriver(selected?.id ?? offer?.id);
      setShowOfferModal(false);
      setShowNewTripNotice(false);
      router.push('/ride-map' as Href);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = e instanceof Error ? e.message : 'No se pudo aceptar';
      setShowOfferModal(false);
      if (selected?.id) setSkippedIds((ids) => [...ids, selected.id]);
      console.warn(message);
    }
  };

  const current = selected ?? offer;
  const vehicleLabel =
    [user?.vehicleMake, user?.vehicleModel].filter(Boolean).join(' ') ||
    user?.bio ||
    'Tu vehículo';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            testID="driver-menu"
            onPress={() => setMenuOpen(true)}
            style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="menu" size={18} color={colors.foreground} />
          </Pressable>
          <AppLogo light />
          <Pressable
            onPress={() => {
              if (!canWork) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return;
              }
              setOnline((v) => !v);
              void Haptics.selectionAsync();
            }}
            style={[
              styles.onlinePill,
              { backgroundColor: online ? colors.secondary : '#f1f4f2' },
            ]}
          >
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: online ? colors.primary : '#9aa8a1' },
              ]}
            />
            <Text style={[styles.onlineText, { color: online ? colors.primary : '#6d7c75' }]}>
              {online ? 'En línea' : 'Fuera'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(
            [
              { id: 'home' as const, label: 'Inicio', icon: 'home' as const },
              { id: 'activity' as const, label: 'Viajes', icon: 'list' as const },
              { id: 'earnings' as const, label: 'Ganancias', icon: 'dollar-sign' as const },
            ] as const
          ).map((item) => {
            const on = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Feather name={item.icon} size={15} color={on ? '#fff' : '#16362f'} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'home' ? (
          <>
            {!canWork ? (
              <View style={[styles.blockCard, { backgroundColor: colors.card, borderColor: '#d88d2e' }]}>
                <Text style={[styles.blockTitle, { color: colors.foreground }]}>
                  Bloque de sistema · {formatMoney(blockFee)}
                </Text>
                <Text style={[styles.blockCopy, { color: colors.mutedForeground }]}>
                  Para recibir viajes cubre el bloque (depósito) o alcánzalo con tus ganancias.
                  Llevas {formatMoney(lifetimeEarnings)} de {formatMoney(blockFee)}.
                </Text>
                <View style={styles.blockTrack}>
                  <View style={[styles.blockFill, { width: Math.round(blockProgress * 100) + '%' }]} />
                </View>
                <Pressable
                  onPress={() => void satisfyBlockFee()}
                  style={[styles.blockBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.blockBtnText}>Ya pagué el depósito</Text>
                </Pressable>
                <Text style={[styles.blockHint, { color: colors.mutedForeground }]}>
                  Docs {docsComplete ? 'subidos' : 'pendientes'} · revisión{' '}
                  {docsApproved ? 'aprobada' : 'pendiente (puedes operar al cubrir el bloque)'}
                </Text>
              </View>
            ) : null}
            <LinearGradient colors={['#0f241f', '#16362f', '#138a68']} style={styles.hero}>
              <Text style={styles.heroEyebrow}>HOY · INRIDE CONDUCTOR</Text>
              <Text style={styles.heroMoney}>${earnings.today.toFixed(0)}</Text>
              <Text style={styles.heroSub}>
                {earnings.todayTrips} viaje{earnings.todayTrips === 1 ? '' : 's'} hoy · semana $
                {earnings.week.toFixed(0)}
              </Text>
              <View style={styles.heroMeta}>
                <View style={styles.heroChip}>
                  <Feather name="star" size={13} color="#f5d27a" />
                  <Text style={styles.heroChipText}>
                    {(user?.rating ?? avgRating ?? 5).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.heroChip}>
                  <Feather name="truck" size={13} color="#c5edda" />
                  <Text style={styles.heroChipText} numberOfLines={1}>
                    {vehicleLabel}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>HOY</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  ${earnings.today.toFixed(0)}
                </Text>
                <Text style={[styles.statHint, { color: colors.mutedForeground }]}>
                  {earnings.todayTrips} viajes
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>SEMANA</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  ${earnings.week.toFixed(0)}
                </Text>
                <Text style={[styles.statHint, { color: colors.mutedForeground }]}>
                  {earnings.weekTrips} viajes
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>TOTAL</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {completed.length}
                </Text>
                <Text style={[styles.statHint, { color: colors.mutedForeground }]}>completados</Text>
              </View>
            </View>

            {live && user ? (
              <View style={styles.liveRow}>
                <Pressable
                  onPress={() => router.push('/ride-map' as Href)}
                  style={[styles.alertCard, styles.liveCard, { backgroundColor: '#111b17' }]}
                >
                  <View style={styles.liveTop}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveTitle}>Navegando viaje</Text>
                  </View>
                  <Text style={styles.liveSub} numberOfLines={2}>
                    {live.origin} → {live.destination}
                  </Text>
                  <Text style={styles.liveCta}>Abrir navegación →</Text>
                </Pressable>
                <RideChatButton
                  rideId={live.id}
                  meId={user.id}
                  peerName={live.passengerName || 'Pasajero'}
                />
              </View>
            ) : null}

            {availableRides.length ? (
              <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Solicitudes ({availableRides.length})
                </Text>
                {availableRides.map((ride) => (
                  <Pressable
                    key={ride.id}
                    onPress={() => {
                      setSelected(ride);
                      setShowOfferModal(true);
                    }}
                    style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  >
                    <View style={styles.alertHeader}>
                      <View style={[styles.alertBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="navigation" size={16} color="#ffffff" />
                      </View>
                      <View style={styles.alertHeaderCopy}>
                        <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                          {ride.passengerName} · ${Number(ride.driverNet).toFixed(0)}
                        </Text>
                        <Text style={[styles.alertSubtitle, { color: colors.mutedForeground }]}>
                          {ride.origin} → {ride.destination}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setSkippedIds((ids) => [...ids, ride.id])}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather name="x" size={18} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </Animated.View>
            ) : (
              <View style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                  {online ? 'Buscando viajes…' : 'Estás fuera de línea'}
                </Text>
                <Text style={[styles.alertSubtitle, { color: colors.mutedForeground }]}>
                  {online
                    ? 'Cuando un pasajero pida un viaje cerca, te avisamos aquí con navegación al pickup.'
                    : 'Activa “En línea” para recibir solicitudes.'}
                </Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recientes</Text>
              <Pressable onPress={() => setTab('activity')}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Ver todos</Text>
              </Pressable>
            </View>
            <View style={styles.tripList}>
              {recentTrips.slice(0, 3).map((trip) => (
                <TripCard key={trip.id} trip={trip} showDriverEarnings />
              ))}
              {!recentTrips.length ? (
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                  Aún no hay viajes.
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        {tab === 'activity' ? (
          <View style={{ gap: 14 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tu actividad</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>HOY</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {todayTripsList.length}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>SEMANA</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {earnings.weekTrips}
                </Text>
              </View>
            </View>
            <View style={styles.tripList}>
              {recentTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} showDriverEarnings />
              ))}
              {!recentTrips.length ? (
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                  Sin viajes todavía.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {tab === 'earnings' ? (
          <View style={{ gap: 14 }}>
            <LinearGradient colors={['#138a68', '#0f7458']} style={styles.earnHero}>
              <Text style={styles.earnEyebrow}>GANANCIAS DE LA SEMANA</Text>
              <Text style={styles.earnMoney}>${earnings.week.toFixed(2)}</Text>
              <Text style={styles.earnSub}>
                {earnings.weekTrips} viajes · bloque {formatMoney(tariff.systemBlockFee)} por viaje
              </Text>
            </LinearGradient>

            <View style={[styles.earnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.earnRowLabel, { color: colors.mutedForeground }]}>Hoy</Text>
              <Text style={[styles.earnRowValue, { color: colors.foreground }]}>
                ${earnings.today.toFixed(2)}
              </Text>
              <Text style={[styles.earnRowHint, { color: colors.mutedForeground }]}>
                {earnings.todayTrips} viajes completados
              </Text>
            </View>

            <View style={[styles.earnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.earnRowLabel, { color: colors.mutedForeground }]}>Esta semana</Text>
              <Text style={[styles.earnRowValue, { color: colors.foreground }]}>
                ${earnings.week.toFixed(2)}
              </Text>
              <Text style={[styles.earnRowHint, { color: colors.mutedForeground }]}>
                Promedio $
                {(earnings.weekTrips ? earnings.week / earnings.weekTrips : 0).toFixed(0)} por viaje
              </Text>
            </View>

            <View style={[styles.earnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.earnRowLabel, { color: colors.mutedForeground }]}>Histórico</Text>
              <Text style={[styles.earnRowValue, { color: colors.foreground }]}>
                ${completed.reduce((s, t) => s + t.driverNet, 0).toFixed(2)}
              </Text>
              <Text style={[styles.earnRowHint, { color: colors.mutedForeground }]}>
                {completed.length} viajes en total
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Detalle de hoy</Text>
            <View style={styles.tripList}>
              {todayTripsList.map((trip) => (
                <TripCard key={trip.id} trip={trip} showDriverEarnings />
              ))}
              {!todayTripsList.length ? (
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>
                  Aún no hay ganancias hoy. Ponte en línea y acepta un viaje.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        <LegalLinks tone="muted" center />
      </ScrollView>

      <Modal visible={showOfferModal && !!current} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.offerSheet, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['bottom']} style={styles.offerContent}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.offerTitle, { color: colors.foreground }]}>Nuevo viaje</Text>
              <Text style={[styles.offerSubtitle, { color: colors.mutedForeground }]}>
                Al aceptar abrimos la navegación hasta el pasajero
              </Text>

              <View style={[styles.passengerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                  <Feather name="user" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.passengerName, { color: colors.foreground }]}>
                    {current?.passengerName}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={13} color="#e9a33f" />
                    <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                      {current?.passengerRating} · pasajero
                    </Text>
                  </View>
                </View>
                <Text style={[styles.offerPrice, { color: colors.foreground }]}>
                  ${Number(current?.driverNet ?? 0).toFixed(0)}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <InfoRow icon="map-pin" label="Recoger" value={current?.origin ?? ''} colors={colors} />
                <InfoRow icon="flag" label="Destino" value={current?.destination ?? ''} colors={colors} />
                <InfoRow
                  icon="navigation"
                  label="Distancia"
                  value={`${current?.distanceKm ?? 0} km`}
                  colors={colors}
                />
                <InfoRow
                  icon="dollar-sign"
                  label="Tu ganancia"
                  value={`$${Number(current?.driverNet ?? 0).toFixed(2)}`}
                  colors={colors}
                  highlight
                />
              </View>

              <Pressable
                testID="accept-trip"
                onPress={acceptTrip}
                style={({ pressed }) => [styles.acceptWrap, pressed && styles.pressed]}
              >
                <LinearGradient colors={['#138a68', '#0f7458']} style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>Aceptar y navegar</Text>
                  <Feather name="navigation" size={18} color="#ffffff" />
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (current?.id) setSkippedIds((ids) => [...ids, current.id]);
                  setShowOfferModal(false);
                }}
                style={styles.dismiss}
              >
                <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>
                  Omitir este viaje
                </Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      <RideNotice
        visible={showNewTripNotice && !!current}
        tone="warning"
        icon="bell"
        eyebrow="NUEVO VIAJE"
        title="¡Viaje disponible!"
        message="Solicitud en tiempo real. Acepta para abrir la navegación."
        details={[
          {
            label: 'Pasajero',
            value: `${current?.passengerName ?? ''} · ${current?.passengerRating ?? ''} ★`,
          },
          { label: 'Ruta', value: `${current?.origin ?? ''} → ${current?.destination ?? ''}` },
          { label: 'Ganas', value: `$${Number(current?.driverNet ?? 0).toFixed(2)}` },
        ]}
        primaryLabel="Ver detalles"
        onPrimary={() => {
          setShowNewTripNotice(false);
          setShowOfferModal(true);
        }}
        secondaryLabel="Después"
        onSecondary={() => setShowNewTripNotice(false)}
      />

      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={user?.name ?? 'Conductor'}
        subtitle={user?.bio ?? user?.email}
        rating={user?.rating}
        items={[
          {
            key: 'earnings',
            label: 'Ganancias',
            icon: 'dollar-sign',
            onPress: () => setTab('earnings'),
          },
          {
            key: 'trips',
            label: 'Mis viajes',
            icon: 'list',
            onPress: () => setTab('activity'),
          },
          {
            key: 'help',
            label: 'Ayuda',
            icon: 'help-circle',
            onPress: () => {},
          },
          {
            key: 'delete',
            label: 'Eliminar cuenta',
            icon: 'trash-2',
            onPress: () => setShowDelete(true),
          },
          {
            key: 'logout',
            label: 'Cerrar sesión',
            icon: 'log-out',
            onPress: () => void logout(),
          },
        ]}
      />

      <RideNotice
        visible={showDelete}
        tone="warning"
        icon="trash-2"
        eyebrow="ELIMINAR CUENTA"
        title="¿Borrar tu cuenta de conductor?"
        message="Se eliminarán tu perfil, documentos y acceso. Esta acción no se puede deshacer."
        primaryLabel={deleting ? 'Eliminando…' : 'Sí, eliminar definitivamente'}
        onPrimary={() => {
          if (deleting) return;
          setDeleting(true);
          void deleteAccount()
            .then(() => {
              setShowDelete(false);
              router.replace('/');
            })
            .finally(() => setDeleting(false));
        }}
        secondaryLabel="Cancelar"
        onSecondary={() => {
          if (!deleting) setShowDelete(false);
        }}
      />
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  highlight,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          { color: highlight ? colors.primary : colors.foreground },
          highlight && styles.infoValueBold,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 5 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  back: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  onlinePill: {
    alignItems: 'center',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  onlineDot: { borderRadius: 5, height: 7, width: 7 },
  onlineText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  tabs: {
    backgroundColor: '#e8f0eb',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabOn: { backgroundColor: '#138a68' },
  tabText: { color: '#16362f', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  tabTextOn: { color: '#fff' },
  blockCard: { borderRadius: 18, borderWidth: 1.5, gap: 8, padding: 16 },
  blockTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  blockCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  blockTrack: { backgroundColor: '#e8efe9', borderRadius: 100, height: 8, overflow: 'hidden' },
  blockFill: { backgroundColor: '#d88d2e', height: '100%' },
  blockBtn: { alignItems: 'center', borderRadius: 12, marginTop: 4, paddingVertical: 12 },
  blockBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  blockHint: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  hero: { borderRadius: 24, gap: 6, overflow: 'hidden', padding: 20 },
  heroEyebrow: {
    color: '#8fd9bc',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  heroMoney: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 42,
    letterSpacing: -1.2,
  },
  heroSub: { color: '#c5edda', fontFamily: 'Inter_500Medium', fontSize: 13 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  heroChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 12, maxWidth: 160 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { borderRadius: 16, borderWidth: 1, flex: 1, gap: 2, padding: 12 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statHint: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  alertCard: { borderRadius: 20, borderWidth: 1.5, gap: 6, padding: 16 },
  liveRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  liveCard: { borderWidth: 0, flex: 1 },
  liveTop: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  livePulse: {
    backgroundColor: '#3dffa0',
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  liveTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  liveSub: { color: '#a8b5ae', fontFamily: 'Inter_400Regular', fontSize: 12 },
  liveCta: { color: '#8fd9bc', fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 4 },
  alertHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  alertBadge: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  alertHeaderCopy: { flex: 1, gap: 3 },
  alertTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  alertSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  tripList: { gap: 12 },
  earnHero: { borderRadius: 22, gap: 6, padding: 20 },
  earnEyebrow: {
    color: '#d8f1e4',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  earnMoney: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 36 },
  earnSub: { color: '#d8f1e4', fontFamily: 'Inter_500Medium', fontSize: 13 },
  earnCard: { borderRadius: 18, borderWidth: 1, gap: 4, padding: 16 },
  earnRowLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.6 },
  earnRowValue: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  earnRowHint: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  modalOverlay: {
    backgroundColor: 'rgba(22,54,47,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  offerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  offerContent: { gap: 14, padding: 20 },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#d5e0d9',
    borderRadius: 3,
    height: 4,
    width: 42,
  },
  offerTitle: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  offerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: -6 },
  passengerCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  passengerName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 2 },
  ratingText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  infoCard: { borderRadius: 18, borderWidth: 1, gap: 12, padding: 14 },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  infoIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  infoLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12 },
  infoValue: { flex: 1.4, fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'right' },
  infoValueBold: { fontFamily: 'Inter_700Bold' },
  acceptWrap: { borderRadius: 16, overflow: 'hidden' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  acceptBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  acceptText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  dismiss: { alignItems: 'center', paddingVertical: 8 },
  dismissText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
