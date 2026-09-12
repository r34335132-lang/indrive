import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';
import { AdminTripDetailModal } from '@/components/admin/AdminTripDetailModal';
import { AppLogo } from '@/components/AppLogo';
import { normalizeTrip, type Trip } from '@/constants/mocks';
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useColors } from '@/hooks/useColors';

type AdminTab = 'dashboard' | 'tariff' | 'trips';

type TariffNumericKey = Exclude<
  keyof ReturnType<typeof useTariff>['tariff'],
  'highDemandActive'
>;

type TariffField = {
  key: TariffNumericKey;
  label: string;
  hint: string;
};

const TARIFF_SECTIONS: Array<{
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  fields: TariffField[];
}> = [
  {
    title: 'Tarifa por kilómetro',
    subtitle: '$10 total · $7 conductor · $3 app',
    icon: 'navigation',
    fields: [
      { key: 'perKmTotal', label: 'Precio por km (total)', hint: '$10.00' },
      { key: 'perKmDriver', label: 'Por km · Conductor', hint: '$7.00' },
      { key: 'perKmApp', label: 'Por km · App', hint: '$3.00' },
    ],
  },
  {
    title: 'Tiempo y espera',
    subtitle: '$3 / min viaje · $1 / min espera · cuota app $13.20',
    icon: 'clock',
    fields: [
      { key: 'perMinute', label: 'Precio por minuto', hint: '$3.00' },
      { key: 'waitPerMinute', label: 'Espera por minuto', hint: '$1.00' },
      { key: 'appFlatFee', label: 'Cuota fija app', hint: '$13.20' },
      { key: 'systemBlockFee', label: 'Bloque de sistema', hint: '$300.00' },
    ],
  },
  {
    title: 'Viaje mínimo',
    subtitle: 'Mínimo 2 km / tarifa piso',
    icon: 'minus-circle',
    fields: [
      { key: 'minDistanceKm', label: 'Distancia mínima (km)', hint: '2 km' },
      { key: 'minFare', label: 'Tarifa mínima', hint: '$35.00' },
    ],
  },
  {
    title: 'Aeropuerto · Peaje',
    subtitle: '$30 total · $22 conductor · $8 app',
    icon: 'send',
    fields: [
      { key: 'airportTollTotal', label: 'Peaje aeropuerto (total)', hint: '$30.00' },
      { key: 'airportTollDriver', label: 'Peaje · Conductor', hint: '$22.00' },
      { key: 'airportTollApp', label: 'Peaje · App', hint: '$8.00' },
    ],
  },
  {
    title: 'Bonos por tipo de conductor',
    subtitle: 'Listos para el futuro · Go / Plus / Master',
    icon: 'award',
    fields: [
      { key: 'bonusGo', label: 'Bono Go', hint: '$1000' },
      { key: 'bonusPlus', label: 'Bono Plus', hint: '$2000' },
      { key: 'bonusMaster', label: 'Bono Master', hint: '$3000' },
    ],
  },
  {
    title: 'Tarifa alta · Demanda',
    subtitle: 'Multiplicador que ve el pasajero al pedir viaje',
    icon: 'trending-up',
    fields: [{ key: 'surgeMultiplier', label: 'Multiplicador (ej. 1.4)', hint: '1.4' }],
  },
];

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout, role, isReady, user } = useAuth();
  const { tariff, updateTariff, resetTariff } = useTariff();
  const { allTrips } = useBooking();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const trips = useMemo(() => allTrips.map(normalizeTrip), [allTrips]);

  const stats = useMemo(() => {
    const completed = trips.filter((t) => t.status === 'Completado');
    const rated = completed.filter((t) => typeof t.rating === 'number');
    const totalRevenue = completed.reduce((sum, t) => sum + t.price, 0);
    const driverPayout = completed.reduce((sum, t) => sum + t.driverNet, 0);
    const appRevenue = completed.reduce((sum, t) => sum + t.appNet, 0);
    const airportTrips = completed.filter((t) => (t.airportToll ?? 0) > 0).length;
    const avgFare = completed.length ? totalRevenue / completed.length : 0;
    const totalKm = completed.reduce((sum, t) => sum + t.distanceKm, 0);
    const avgRating = rated.length
      ? rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length
      : 0;

    const byVehicle = ['Económico', 'Comfort', 'Premium', 'Van'].map((vehicle) => ({
      label: vehicle.slice(0, 6),
      value: completed.filter((t) => t.vehicle === vehicle).length,
    }));

    const topTrips = [...completed]
      .sort((a, b) => b.price - a.price)
      .slice(0, 5)
      .map((trip) => ({
        label: trip.destination.split(' ').slice(0, 2).join(' '),
        value: trip.price,
      }));

    const statusData = [
      { label: 'Completado', value: trips.filter((t) => t.status === 'Completado').length },
      { label: 'Confirmado', value: trips.filter((t) => t.status === 'Confirmado').length },
      { label: 'En camino', value: trips.filter((t) => t.status === 'En camino').length },
    ];

    const ratingData = [5, 4, 3, 2, 1].map((stars) => ({
      label: `${stars} ★`,
      value: rated.filter((t) => Math.round(t.rating ?? 0) === stars).length,
    }));

    return {
      totalRevenue,
      driverPayout,
      appRevenue,
      airportTrips,
      tripCount: trips.length,
      completedCount: completed.length,
      avgFare,
      totalKm,
      byVehicle,
      topTrips,
      statusData,
      ratingData,
      avgRating,
    };
  }, [trips]);

  if (isReady && (!user || role !== 'admin')) {
    return <Redirect href="/" />;
  }
  const getDraftValue = (key: TariffNumericKey) => {
    if (draft[key] !== undefined) return draft[key];
    return String(tariff[key]);
  };

  const saveField = async (key: TariffNumericKey) => {
    const raw = draft[key];
    if (raw === undefined) return;
    const value = Number.parseFloat(raw);
    if (Number.isNaN(value) || value < 0) return;
    if (key === 'surgeMultiplier' && value < 1) return;
    await updateTariff({ [key]: value });
    setDraft((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openTrip = (trip: Trip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrip(trip);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={['#16362f', '#1f4f43']} style={styles.hero}>
        <View style={styles.header}>
          <AppLogo large />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PANEL ADMIN</Text>
            <Text style={styles.title}>INRIDE Control</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logout}>
            <Feather name="log-out" size={18} color="#c5edda" />
          </Pressable>
        </View>

        <View style={styles.heroStats}>
          <HeroStat label="Ingresos totales" value={formatMoney(stats.totalRevenue)} />
          <HeroStat label="Comisión app" value={formatMoney(stats.appRevenue)} />
          <HeroStat label="Km recorridos" value={`${stats.totalKm.toFixed(1)} km`} />
        </View>
      </LinearGradient>

      <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
        {([
          { id: 'dashboard', icon: 'pie-chart', label: 'Resumen' },
          { id: 'tariff', icon: 'sliders', label: 'Tarifario' },
          { id: 'trips', icon: 'list', label: 'Viajes' },
        ] as const).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            style={[styles.tab, tab === item.id && { backgroundColor: colors.card }]}
          >
            <Feather
              name={item.icon}
              size={14}
              color={tab === item.id ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabText, { color: tab === item.id ? colors.foreground : colors.mutedForeground }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'dashboard' ? (
          <>
            <View style={styles.kpiRow}>
              <KpiCard icon="navigation" label="Viajes" value={String(stats.tripCount)} sub={`${stats.completedCount} completados`} colors={colors} />
              <KpiCard icon="star" label="Rating prom." value={stats.avgRating.toFixed(1)} sub="estrellas" colors={colors} />
              <KpiCard icon="send" label="Aeropuerto" value={String(stats.airportTrips)} sub="con peaje" colors={colors} />
            </View>
            <AdminDashboardCharts stats={stats} />
          </>
        ) : null}

        {tab === 'tariff' ? (
          <>
            <View style={[styles.tariffHero, { backgroundColor: '#16362f' }]}>
              <Text style={styles.tariffHeroTitle}>Tarifario INRIDE</Text>
              <Text style={styles.tariffHeroSub}>
                Configura precios por km, tarifa mínima, peaje y demanda elevada
              </Text>
              <View style={styles.tariffHeroPills}>
                <TariffHeroPill label="/ min" value={formatMoney(tariff.perMinute)} />
                <TariffHeroPill label="Espera" value={formatMoney(tariff.waitPerMinute)} />
                <TariffHeroPill label="Bloque" value={formatMoney(tariff.systemBlockFee)} />
              </View>
              <View style={[styles.tariffHeroPills, { marginTop: 8 }]}>
                <TariffHeroPill label="Cuota app" value={formatMoney(tariff.appFlatFee)} />
                <TariffHeroPill label="Peaje cond." value={formatMoney(tariff.airportTollDriver)} />
                <TariffHeroPill label="Peaje app" value={formatMoney(tariff.airportTollApp)} />
              </View>
            </View>

            <Pressable
              onPress={async () => {
                await updateTariff({ highDemandActive: !tariff.highDemandActive });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              style={[
                styles.demandToggle,
                {
                  backgroundColor: tariff.highDemandActive ? '#fff4e8' : colors.card,
                  borderColor: tariff.highDemandActive ? '#f0d2a8' : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.demandIcon,
                  { backgroundColor: tariff.highDemandActive ? '#ffe8c8' : colors.secondary },
                ]}
              >
                <Feather
                  name="trending-up"
                  size={18}
                  color={tariff.highDemandActive ? '#d88d2e' : colors.primary}
                />
              </View>
              <View style={styles.demandCopy}>
                <Text style={[styles.demandTitle, { color: colors.foreground }]}>
                  Tarifa alta {tariff.highDemandActive ? 'activa' : 'apagada'}
                </Text>
                <Text style={[styles.demandSub, { color: colors.mutedForeground }]}>
                  {tariff.highDemandActive
                    ? `Los pasajeros verán aviso x${tariff.surgeMultiplier.toFixed(1)} al pedir viaje`
                    : 'Los pasajeros pagan la tarifa base sin aviso de demanda'}
                </Text>
              </View>
              <View
                style={[
                  styles.demandSwitch,
                  { backgroundColor: tariff.highDemandActive ? '#d88d2e' : colors.border },
                ]}
              >
                <View
                  style={[
                    styles.demandKnob,
                    tariff.highDemandActive ? styles.demandKnobOn : styles.demandKnobOff,
                  ]}
                />
              </View>
            </Pressable>

            {TARIFF_SECTIONS.map((section) => (
              <View
                key={section.title}
                style={[styles.tariffSection, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.tariffSectionHeader}>
                  <View style={[styles.tariffSectionIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={section.icon} size={16} color={colors.primary} />
                  </View>
                  <View style={styles.tariffSectionCopy}>
                    <Text style={[styles.tariffSectionTitle, { color: colors.foreground }]}>{section.title}</Text>
                    <Text style={[styles.tariffSectionSub, { color: colors.mutedForeground }]}>{section.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.tariffFields}>
                  {section.fields.map((field) => (
                    <View key={field.key} style={[styles.fieldRowCard, { backgroundColor: colors.muted }]}>
                      <View style={styles.fieldCopy}>
                        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                        <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Ref: {field.hint}</Text>
                      </View>
                      <View style={styles.fieldActions}>
                        <TextInput
                          value={getDraftValue(field.key)}
                          onChangeText={(text) => setDraft((c) => ({ ...c, [field.key]: text }))}
                          keyboardType="decimal-pad"
                          style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                        />
                        <Pressable
                          onPress={() => saveField(field.key)}
                          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                        >
                          <Feather name="check" size={16} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <Pressable
              onPress={async () => {
                await resetTariff();
                setDraft({});
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }}
              style={[styles.resetBtn, { borderColor: colors.border }]}
            >
              <Feather name="rotate-ccw" size={16} color={colors.mutedForeground} />
              <Text style={[styles.resetText, { color: colors.mutedForeground }]}>
                Restaurar tarifario original
              </Text>
            </Pressable>
          </>
        ) : null}

        {tab === 'trips' ? (
          <>
            <View style={[styles.tripsSummary, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.tripsSummaryTitle, { color: colors.primary }]}>
                {trips.length} viajes · {formatMoney(stats.totalRevenue)} facturados
              </Text>
              <Text style={[styles.tripsSummarySub, { color: colors.mutedForeground }]}>
                Toca un viaje para ver detalle, estrellas y comentarios
              </Text>
            </View>

            <AdminDashboardCharts stats={stats} compact />

            {trips.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => openTrip(trip)}
                style={({ pressed }) => [
                  styles.tripCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.tripTop}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(trip.status).bg }]}>
                    <Text style={[styles.tripStatus, { color: statusColor(trip.status).text }]}>
                      {trip.status}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </View>

                <Text style={[styles.tripRoute, { color: colors.foreground }]}>
                  {trip.origin} → {trip.destination}
                </Text>
                <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
                  {trip.date} · {trip.time} · {trip.distanceKm} km · {trip.vehicle}
                </Text>

                <View style={styles.tripPrices}>
                  <PricePill label="Total" value={formatMoney(trip.price)} accent colors={colors} />
                  <PricePill label="Conductor" value={formatMoney(trip.driverNet)} colors={colors} />
                  <PricePill label="App" value={formatMoney(trip.appNet)} colors={colors} />
                </View>

                {typeof trip.rating === 'number' ? (
                  <View style={styles.tripRatingRow}>
                    <TripStars rating={trip.rating} />
                    <Text style={[styles.tripRatingText, { color: colors.foreground }]}>
                      {trip.rating.toFixed(1)}
                    </Text>
                    {trip.comment ? (
                      <Text style={[styles.tripCommentPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                        · {trip.comment}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.tripPending, { color: colors.mutedForeground }]}>
                    Sin calificación aún
                  </Text>
                )}
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>

      <AdminTripDetailModal
        trip={selectedTrip}
        visible={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
      />
    </SafeAreaView>
  );
}

function statusColor(status: string) {
  if (status === 'Completado') return { bg: '#d8f1e4', text: '#138a68' };
  if (status === 'En camino') return { bg: '#e8f1ff', text: '#3b6fd9' };
  return { bg: '#fff3db', text: '#a66d16' };
}

function TripStars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Feather
          key={star}
          name="star"
          size={12}
          color={star <= Math.round(rating) ? '#e9a33f' : '#d5e0d9'}
        />
      ))}
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

function TariffHeroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tariffHeroPill}>
      <Text style={styles.tariffHeroPillLabel}>{label}</Text>
      <Text style={styles.tariffHeroPillValue}>{value}</Text>
    </View>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.kpiIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={[styles.kpiValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.kpiSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </View>
  );
}

function PricePill({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  accent?: boolean;
}) {
  return (
    <View style={[styles.pricePill, { backgroundColor: accent ? colors.secondary : colors.muted }]}>
      <Text style={[styles.pricePillLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.pricePillValue, { color: accent ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#b9ead0', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  title: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  logout: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    flex: 1,
    gap: 4,
    padding: 10,
  },
  heroStatLabel: { color: '#c5edda', fontFamily: 'Inter_500Medium', fontSize: 9 },
  heroStatValue: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  tabs: {
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  content: { gap: 12, padding: 20, paddingBottom: 40 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCard: { borderRadius: 16, borderWidth: 1, flex: 1, gap: 3, padding: 10 },
  kpiIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  kpiValue: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 4 },
  kpiLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  kpiSub: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  tariffHero: { borderRadius: 20, gap: 10, padding: 18 },
  tariffHeroTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 18 },
  tariffHeroSub: { color: '#c5edda', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  tariffHeroPills: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tariffHeroPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    flex: 1,
    gap: 4,
    padding: 10,
  },
  tariffHeroPillLabel: { color: '#b9ead0', fontFamily: 'Inter_500Medium', fontSize: 10 },
  tariffHeroPillValue: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  demandToggle: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  demandIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  demandCopy: { flex: 1, gap: 3 },
  demandTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  demandSub: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  demandSwitch: {
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 48,
  },
  demandKnob: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    height: 22,
    width: 22,
  },
  demandKnobOn: { alignSelf: 'flex-end' },
  demandKnobOff: { alignSelf: 'flex-start' },
  tariffSection: { borderRadius: 20, borderWidth: 1, gap: 12, padding: 16 },
  tariffSectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  tariffSectionIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tariffSectionCopy: { flex: 1, gap: 2 },
  tariffSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  tariffSectionSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  tariffFields: { gap: 8 },
  fieldRowCard: { borderRadius: 14, gap: 10, padding: 12 },
  fieldCopy: { gap: 2 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  fieldHint: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  fieldActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveBtn: { alignItems: 'center', borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  resetBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 6,
    paddingVertical: 14,
  },
  resetText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  tripsSummary: { borderRadius: 16, gap: 4, padding: 14 },
  tripsSummaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  tripsSummarySub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  tripCard: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 14 },
  pressed: { opacity: 0.85 },
  tripTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statusPill: { borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  tripStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  tripRoute: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  tripMeta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  tripPrices: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pricePill: { borderRadius: 10, flex: 1, gap: 2, paddingHorizontal: 8, paddingVertical: 6 },
  pricePillLabel: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  pricePillValue: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  tripRatingRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  tripRatingText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  tripCommentPreview: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11 },
  tripPending: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
});
