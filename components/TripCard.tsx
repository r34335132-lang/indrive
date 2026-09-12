import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '@/constants/pricing';
import { useColors } from '@/hooks/useColors';
import type { Trip } from '@/context/BookingContext';

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Feather
          key={star}
          name="star"
          size={11}
          color={star <= Math.round(rating) ? '#e9a33f' : '#d5e0d9'}
        />
      ))}
    </View>
  );
}

export function TripCard({
  trip,
  onPress,
  showDriverEarnings = false,
}: {
  trip: Trip;
  onPress?: () => void;
  showDriverEarnings?: boolean;
}) {
  const colors = useColors();
  const displayAmount = showDriverEarnings ? trip.driverNet : trip.price;
  const content = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="calendar" size={15} color={colors.primary} />
          <Text style={[styles.date, { color: colors.secondaryForeground }]}>{trip.date}</Text>
        </View>
        <View
          style={[
            styles.status,
            {
              backgroundColor:
                trip.status === 'Completado'
                  ? colors.secondary
                  : trip.status === 'En camino'
                    ? '#e8f1ff'
                    : '#fff3db',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  trip.status === 'Completado'
                    ? colors.primary
                    : trip.status === 'En camino'
                      ? '#3b6fd9'
                      : '#a66d16',
              },
            ]}
          >
            {trip.status}
          </Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeLine}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <View style={[styles.dash, { borderColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
        </View>
        <View style={styles.addresses}>
          <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>
            {trip.origin}
          </Text>
          <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>
        <View style={styles.details}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{trip.time}</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>{formatMoney(displayAmount)}</Text>
        </View>
      </View>

      <View style={[styles.bottom, { borderTopColor: colors.border }]}>
        <View style={styles.bottomLeft}>
          <Text style={[styles.vehicle, { color: colors.mutedForeground }]}>
            {trip.vehicle} · {trip.duration} · {trip.distanceKm} km
          </Text>
          <Text style={[styles.counterparty, { color: colors.foreground }]}>
            {trip.counterparty}
          </Text>
        </View>
        <View style={styles.bottomRight}>
          {typeof trip.rating === 'number' ? (
            <>
              <Stars rating={trip.rating} />
              <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                {trip.rating.toFixed(1)}
              </Text>
            </>
          ) : onPress ? (
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          ) : null}
        </View>
      </View>
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, gap: 15, padding: 16 },
  pressed: { opacity: 0.8 },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dateBadge: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
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
  bottom: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  bottomLeft: { flex: 1, gap: 3 },
  vehicle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  counterparty: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bottomRight: { alignItems: 'flex-end', gap: 3 },
  stars: { flexDirection: 'row', gap: 2 },
  ratingText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});
