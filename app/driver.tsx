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
import { TripCard } from '@/components/TripCard';
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useColors } from '@/hooks/useColors';
import { playNewRideChime } from '@/lib/newRideSound';
import type { Ride } from '@/types';

export default function DriverScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout, docsComplete, isReady, role } = useAuth();
  const { trips, openRides, acceptRideAsDriver, activeRide } = useBooking();
  const { tariff } = useTariff();

  const [selected, setSelected] = useState<Ride | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showNewTripNotice, setShowNewTripNotice] = useState(false);
  const notifiedId = useRef<string | null>(null);

  const pulse = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const offer = useMemo(() => openRides[0] ?? null, [openRides]);
  const live =
    activeRide &&
    ['accepted', 'en_route_pickup', 'arrived_pickup', 'in_progress'].includes(activeRide.status)
      ? activeRide
      : null;

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

  if (isReady && (!user || role !== 'driver')) {
    return <Redirect href="/" />;
  }

  const acceptTrip = async () => {
    if (!selected && !offer) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await acceptRideAsDriver(selected?.id ?? offer?.id);
      setShowOfferModal(false);
      setShowNewTripNotice(false);
      router.push('/ride-map' as Href);
    } catch (e) {
      console.warn(e);
    }
  };

  const current = selected ?? offer;
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  const completed = trips.filter((t) => t.status === 'Completado');
  const avgRating =
    completed.reduce((sum, t) => sum + (t.rating ?? 0), 0) /
    Math.max(completed.filter((t) => t.rating).length, 1);
  const weekEarnings = completed.reduce((sum, t) => sum + t.driverNet, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            testID="back-driver"
            onPress={async () => {
              await logout();
            }}
            style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="log-out" size={18} color={colors.foreground} />
          </Pressable>
          <AppLogo light />
          <View style={[styles.onlinePill, { backgroundColor: colors.secondary }]}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.onlineText, { color: colors.primary }]}>En línea</Text>
          </View>
        </View>

        <LinearGradient colors={['#16362f', '#1f4f43', '#138a68']} style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>CENTRO DEL CONDUCTOR · INRIDE</Text>
            <Text style={styles.heroTitle}>Hola, {user?.firstName ?? 'Mauricio'}</Text>
            <Text style={styles.heroSubtitle}>
              {user?.bio ?? 'Toyota Corolla · NRA-218'} · {(user?.rating ?? 4.98).toFixed(2)} ★
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Feather name="navigation" size={22} color="#16362f" />
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>GANANCIAS</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              ${weekEarnings.toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Bloque {formatMoney(tariff.systemBlockFee)} a tu cargo
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>RATING</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {(user?.rating ?? avgRating).toFixed(2)}
            </Text>
          </View>
        </View>

        {live && user ? (
          <View style={styles.liveRow}>
            <Pressable
              onPress={() => router.push('/ride-map' as Href)}
              style={[styles.alertCard, styles.liveCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
            >
              <Text style={[styles.alertTitle, { color: colors.foreground }]}>Viaje activo</Text>
              <Text style={[styles.alertSubtitle, { color: colors.mutedForeground }]}>
                {live.origin} → {live.destination} · toca para abrir mapa
              </Text>
            </Pressable>
            <RideChatButton
              rideId={live.id}
              meId={user.id}
              peerName={live.passengerName || 'Pasajero'}
            />
          </View>
        ) : null}

        {current ? (
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <Pressable
              onPress={() => {
                setSelected(current);
                setShowOfferModal(true);
              }}
              style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertBadgeWrap}>
                  <Animated.View
                    style={[
                      styles.alertPulse,
                      {
                        backgroundColor: colors.primary,
                        opacity: ringOpacity,
                        transform: [{ scale: ringScale }],
                      },
                    ]}
                  />
                  <View style={[styles.alertBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="bell" size={16} color="#ffffff" />
                  </View>
                </View>
                <View style={styles.alertHeaderCopy}>
                  <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                    ¡Nuevo viaje disponible!
                  </Text>
                  <Text style={[styles.alertSubtitle, { color: colors.mutedForeground }]}>
                    {current.passengerName} · {current.origin} → {current.destination}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.primary} />
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.alertTitle, { color: colors.foreground }]}>Sin solicitudes</Text>
            <Text style={[styles.alertSubtitle, { color: colors.mutedForeground }]}>
              Cuando Sofía pida un viaje en el otro dispositivo, aparecerá aquí.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Viajes recientes</Text>
        </View>
        <View style={styles.tripList}>
          {trips.slice(0, 4).map((trip) => (
            <TripCard key={trip.id} trip={trip} showDriverEarnings />
          ))}
        </View>
      </ScrollView>

      <Modal visible={showOfferModal && !!current} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.offerSheet, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['bottom']} style={styles.offerContent}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.offerTitle, { color: colors.foreground }]}>Detalle del viaje</Text>
              <Text style={[styles.offerSubtitle, { color: colors.mutedForeground }]}>
                Aceptar abre la ruta hasta el punto de recogida
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
                  ${Number(current?.price ?? 0).toFixed(0)}
                </Text>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <InfoRow icon="map-pin" label="Origen" value={current?.origin ?? ''} colors={colors} />
                <InfoRow icon="flag" label="Destino" value={current?.destination ?? ''} colors={colors} />
                <InfoRow
                  icon="navigation"
                  label="Distancia"
                  value={`${current?.distanceKm ?? 0} km`}
                  colors={colors}
                />
                <InfoRow
                  icon="dollar-sign"
                  label="Tu ganancia neta"
                  value={`$${Number(current?.driverNet ?? 0).toFixed(2)}`}
                  colors={colors}
                  highlight
                />
                <InfoRow
                  icon="shield"
                  label="Bloque de sistema"
                  value={`${formatMoney(tariff.systemBlockFee)} · lo cubre el conductor`}
                  colors={colors}
                />
              </View>

              <Pressable
                testID="accept-trip"
                onPress={acceptTrip}
                style={({ pressed }) => [styles.acceptWrap, pressed && styles.pressed]}
              >
                <LinearGradient colors={['#138a68', '#0f7458']} style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>Aceptar y navegar al pickup</Text>
                  <Feather name="arrow-up-right" size={18} color="#ffffff" />
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => setShowOfferModal(false)} style={styles.dismiss}>
                <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Cerrar</Text>
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
        message="Solicitud en tiempo real desde el otro dispositivo."
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
  scrollContent: { gap: 18, paddingBottom: 36, paddingHorizontal: 20, paddingTop: 5 },
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
  hero: { borderRadius: 24, flexDirection: 'row', overflow: 'hidden', padding: 18 },
  heroCopy: { flex: 1, gap: 6 },
  heroEyebrow: {
    color: '#b9ead0',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.6,
  },
  heroSubtitle: { color: '#c5edda', fontFamily: 'Inter_400Regular', fontSize: 12 },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: '#d8f1e4',
    borderRadius: 22,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { borderRadius: 18, borderWidth: 1, flex: 1, gap: 4, padding: 14 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  alertCard: { borderRadius: 20, borderWidth: 1.5, gap: 6, padding: 16 },
  liveRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  liveCard: { flex: 1 },
  alertHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  alertBadgeWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  alertPulse: { borderRadius: 22, height: 44, position: 'absolute', width: 44 },
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
  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  tripList: { gap: 12 },
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
  offerContent: { gap: 14, paddingBottom: 10, paddingHorizontal: 20, paddingTop: 10 },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#d0ded5',
    borderRadius: 4,
    height: 4,
    width: 40,
  },
  offerTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.4 },
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
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  passengerName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 3 },
  ratingText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  infoCard: { borderRadius: 18, borderWidth: 1, gap: 12, padding: 14 },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  infoIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  infoLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12 },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  infoValueBold: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  acceptWrap: { borderRadius: 16, overflow: 'hidden' },
  acceptBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  acceptText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  dismiss: { alignItems: 'center', paddingVertical: 8 },
  dismissText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  pressed: { opacity: 0.88 },
});
