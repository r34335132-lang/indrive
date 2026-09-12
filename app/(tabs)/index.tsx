import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { SectionTitle } from '@/components/SectionTitle';
import { TripCard } from '@/components/TripCard';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, role, isReady } = useAuth();
  const { trips } = useBooking();

  const upcoming = useMemo(
    () => trips.find((trip) => trip.status !== 'Completado'),
    [trips],
  );
  const completed = useMemo(
    () => trips.filter((trip) => trip.status === 'Completado'),
    [trips],
  );
  const avgRating = useMemo(() => {
    const rated = completed.filter((t) => typeof t.rating === 'number');
    if (!rated.length) return user?.rating ?? 4.9;
    return rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length;
  }, [completed, user?.rating]);

  if (isReady && role !== 'passenger') {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppLogo />
          <Pressable
            testID="notifications"
            style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="bell" size={18} color={colors.foreground} />
            <View style={[styles.notificationDot, { backgroundColor: colors.primary }]} />
          </Pressable>
        </View>

        <View style={styles.greeting}>
          <Text style={[styles.hello, { color: colors.mutedForeground }]}>
            Hola, {user?.firstName ?? 'Sofía'}
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>¿De dónde vamos hoy?</Text>
        </View>

        <LinearGradient
          colors={['#147c5e', '#2ca477']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroCopy}>
            <View style={styles.heroLabel}>
              <View style={styles.liveDot} />
              <Text style={styles.heroLabelText}>INRIDE · MOVILIDAD</Text>
            </View>
            <Text style={styles.heroTitle}>Cuéntanos tu{'\n'}ruta</Text>
            <Text style={styles.heroSubtitle}>
              Indica origen y destino, te mostramos la tarifa y buscamos conductor.
            </Text>
          </View>
          <View style={styles.routeCard}>
            <Pressable style={styles.inputRow} onPress={() => router.push('/book')}>
              <View style={[styles.pin, { backgroundColor: '#e3f6ea' }]}>
                <Feather name="circle" size={10} color={colors.primary} />
              </View>
              <View style={styles.inputText}>
                <Text style={[styles.inputCaption, { color: colors.mutedForeground }]}>DESDE</Text>
                <Text style={[styles.inputValue, { color: colors.foreground }]}>
                  ¿Desde dónde sales?
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <View style={[styles.inputDivider, { borderColor: colors.border }]} />
            <Pressable style={styles.inputRow} onPress={() => router.push('/book')}>
              <View style={[styles.pin, { backgroundColor: '#fff1df' }]}>
                <Feather name="map-pin" size={11} color="#e49339" />
              </View>
              <View style={styles.inputText}>
                <Text style={[styles.inputCaption, { color: colors.mutedForeground }]}>HASTA</Text>
                <Text style={[styles.inputValue, { color: colors.foreground }]}>
                  ¿A dónde te llevamos?
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              testID="book-home"
              onPress={() => router.push('/book')}
              style={({ pressed }) => [
                styles.bookButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.bookText}>Pedir viaje</Text>
              <Feather name="arrow-up-right" size={18} color="#ffffff" />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {user?.totalTrips ?? trips.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>viajes realizados</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {avgRating.toFixed(1)}
            </Text>
            <View style={styles.rating}>
              <Feather name="star" size={13} color="#e9a33f" />
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>tu calificación</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Tu próximo viaje" action="Ver todos" />
          {upcoming ? (
            <TripCard trip={upcoming} onPress={() => router.push('/map')} />
          ) : (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={22} color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.foreground }]}>
                Aún no tienes viajes programados
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle eyebrow="Historial" title="Viajes recientes" />
          <View style={styles.recentList}>
            {completed.slice(0, 3).map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 22, paddingBottom: 28, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  notificationDot: {
    borderRadius: 4,
    height: 7,
    position: 'absolute',
    right: 9,
    top: 9,
    width: 7,
  },
  greeting: { gap: 4 },
  hello: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 34,
  },
  hero: { borderRadius: 28, minHeight: 360, overflow: 'hidden', padding: 20 },
  heroGlow: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 150,
    height: 260,
    position: 'absolute',
    right: -100,
    top: -80,
    width: 260,
  },
  heroCopy: { gap: 13, marginBottom: 24 },
  heroLabel: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  liveDot: { backgroundColor: '#b5f0c5', borderRadius: 4, height: 7, width: 7 },
  heroLabelText: {
    color: '#d6f5e0',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 31,
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    color: '#d5f2df',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  routeCard: { backgroundColor: '#ffffff', borderRadius: 19, padding: 13 },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  pin: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  inputText: { flex: 1, gap: 3 },
  inputCaption: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  inputValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  inputDivider: { borderBottomWidth: 1, marginLeft: 40, marginVertical: 4 },
  bookButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  bookText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.78 },
  statsRow: { flexDirection: 'row', gap: 11 },
  stat: { borderRadius: 17, borderWidth: 1, flex: 1, gap: 4, padding: 14 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  rating: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  section: { gap: 12 },
  recentList: { gap: 12 },
  empty: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
