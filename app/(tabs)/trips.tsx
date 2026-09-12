import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionTitle } from '@/components/SectionTitle';
import { TripCard } from '@/components/TripCard';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

export default function TripsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { trips } = useBooking();
  const [filter, setFilter] = useState<'Todos' | 'Próximos' | 'Completados'>('Todos');

  const filtered = trips.filter(
    (trip) =>
      filter === 'Todos' ||
      (filter === 'Completados' ? trip.status === 'Completado' : trip.status !== 'Completado'),
  );

  const completed = trips.filter((t) => t.status === 'Completado');
  const spent = completed.reduce((sum, t) => sum + t.price, 0);
  const avgRating = useMemo(() => {
    const rated = completed.filter((t) => typeof t.rating === 'number');
    if (!rated.length) return user?.rating ?? 4.9;
    return rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length;
  }, [completed, user?.rating]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>TU ACTIVIDAD · INRIDE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Mis viajes</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={19} color={colors.primary} />
          </View>
        </View>

        <View style={[styles.filters, { backgroundColor: colors.secondary }]}>
          {(['Todos', 'Próximos', 'Completados'] as const).map((item) => (
            <Text
              key={item}
              onPress={() => setFilter(item)}
              style={[
                styles.filter,
                {
                  color:
                    filter === item ? colors.primaryForeground : colors.mutedForeground,
                  backgroundColor: filter === item ? colors.primary : 'transparent',
                },
              ]}
            >
              {item}
            </Text>
          ))}
        </View>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>TOTAL</Text>
            <Text style={styles.summaryValue}>{user?.totalTrips ?? trips.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>ESTE MES</Text>
            <Text style={styles.summaryValue}>${spent}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>RATING</Text>
            <Text style={styles.summaryValue}>{avgRating.toFixed(1)}</Text>
          </View>
        </View>

        <SectionTitle title={filter === 'Completados' ? 'Historial' : 'Actividad reciente'} />
        <View style={styles.list}>
          {filtered.length ? (
            filtered.map((trip) => <TripCard key={trip.id} trip={trip} />)
          ) : (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="map" size={24} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin viajes por aquí</Text>
              <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
                Cuando reserves un viaje aparecerá en esta lista.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 20, paddingBottom: 30, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -1 },
  headerIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  filters: { borderRadius: 13, flexDirection: 'row', padding: 4 },
  filter: {
    borderRadius: 10,
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 11,
    textAlign: 'center',
  },
  summary: {
    alignItems: 'center',
    backgroundColor: '#16362f',
    borderRadius: 19,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 17,
  },
  summaryLabel: {
    color: '#c5edda',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
  },
  summaryValue: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryDivider: { backgroundColor: 'rgba(255,255,255,0.18)', height: 33, width: 1 },
  list: { gap: 12 },
  empty: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 30,
  },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },
});
