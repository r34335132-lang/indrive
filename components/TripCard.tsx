import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Trip } from '@/context/BookingContext';

export function TripCard({ trip, onPress }: { trip: Trip; onPress?: () => void }) {
  const colors = useColors();
  const content = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="calendar" size={15} color={colors.primary} />
          <Text style={[styles.date, { color: colors.secondaryForeground }]}>{trip.date}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: trip.status === 'Completado' ? colors.secondary : '#fff3db' }]}>
          <Text style={[styles.statusText, { color: trip.status === 'Completado' ? colors.primary : '#a66d16' }]}>{trip.status}</Text>
        </View>
      </View>
      <View style={styles.route}>
        <View style={styles.routeLine}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dash, { borderColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: '#f0a24d' }]} />
        </View>
        <View style={styles.addresses}>
          <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>{trip.origin}</Text>
          <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>{trip.destination}</Text>
        </View>
        <View style={styles.details}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{trip.time}</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>${trip.price}</Text>
        </View>
      </View>
      <View style={[styles.bottom, { borderTopColor: colors.border }]}>
        <Text style={[styles.vehicle, { color: colors.mutedForeground }]}>{trip.vehicle} · {trip.duration}</Text>
        {onPress ? <Feather name="chevron-right" size={18} color={colors.mutedForeground} /> : null}
      </View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>{content}</Pressable> : content;
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 15 },
  pressed: { opacity: 0.8 },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dateBadge: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingVertical: 7 },
  date: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  status: { borderRadius: 100, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  route: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  routeLine: { alignItems: 'center', height: 48, justifyContent: 'space-between', width: 12 },
  dot: { borderRadius: 10, height: 8, width: 8 },
  dash: { borderLeftWidth: 1, borderStyle: 'dashed', flex: 1, marginVertical: 3 },
  addresses: { flex: 1, gap: 17 },
  address: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  details: { alignItems: 'flex-end', gap: 13 },
  time: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  bottom: { borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  vehicle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
});