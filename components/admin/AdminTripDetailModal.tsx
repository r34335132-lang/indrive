import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Trip } from '@/constants/mocks';
import { formatMoney } from '@/constants/pricing';
import { useColors } from '@/hooks/useColors';

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Feather
          key={star}
          name="star"
          size={18}
          color={star <= Math.round(rating) ? '#e9a33f' : '#d5e0d9'}
        />
      ))}
    </View>
  );
}

export function AdminTripDetailModal({
  trip,
  visible,
  onClose,
}: {
  trip: Trip | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  if (!trip) return null;

  const status = statusColor(trip.status);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>DETALLE DEL VIAJE</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>#{trip.id}</Text>
              </View>
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={[styles.statusCard, { backgroundColor: status.bg }]}>
              <Feather name="activity" size={16} color={status.text} />
              <Text style={[styles.statusText, { color: status.text }]}>{trip.status}</Text>
            </View>

            <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={styles.routeCopy}>
                  <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>ORIGEN</Text>
                  <Text style={[styles.routeValue, { color: colors.foreground }]}>{trip.origin}</Text>
                </View>
              </View>
              <View style={[styles.routeLine, { borderColor: colors.border }]} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: '#e49339' }]} />
                <View style={styles.routeCopy}>
                  <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>DESTINO</Text>
                  <Text style={[styles.routeValue, { color: colors.foreground }]}>{trip.destination}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <InfoTile label="Fecha" value={trip.date} colors={colors} />
              <InfoTile label="Hora" value={trip.time} colors={colors} />
              <InfoTile label="Distancia" value={`${trip.distanceKm} km`} colors={colors} />
              <InfoTile label="Duración" value={trip.duration} colors={colors} />
              <InfoTile label="Vehículo" value={trip.vehicle} colors={colors} />
              <InfoTile label="Rol" value={trip.role === 'passenger' ? 'Pasajero' : 'Conductor'} colors={colors} />
            </View>

            <View style={[styles.peopleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <PersonRow icon="user" label="Pasajero" value={trip.passengerName} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <PersonRow icon="navigation" label="Conductor" value={trip.driverName} colors={colors} />
            </View>

            <View style={[styles.priceCard, { backgroundColor: '#16362f' }]}>
              <Text style={styles.priceTitle}>Desglose de tarifa</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total cobrado</Text>
                <Text style={styles.priceValue}>{formatMoney(trip.price)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Ganancia conductor</Text>
                <Text style={styles.priceValue}>{formatMoney(trip.driverNet)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Comisión INRIDE</Text>
                <Text style={styles.priceValue}>{formatMoney(trip.appNet)}</Text>
              </View>
              {trip.airportToll ? (
                <View style={[styles.airportRow, { borderTopColor: 'rgba(255,255,255,0.15)' }]}>
                  <Feather name="send" size={14} color="#e49339" />
                  <Text style={styles.airportText}>Peaje aeropuerto {formatMoney(trip.airportToll)}</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calificación y comentario</Text>
              {typeof trip.rating === 'number' ? (
                <>
                  <View style={styles.ratingRow}>
                    <Stars rating={trip.rating} />
                    <Text style={[styles.ratingValue, { color: colors.foreground }]}>
                      {trip.rating.toFixed(1)} / 5.0
                    </Text>
                  </View>
                  <Text style={[styles.comment, { color: colors.mutedForeground }]}>
                    {trip.comment ?? 'Sin comentario registrado.'}
                  </Text>
                </>
              ) : (
                <View style={styles.pendingRating}>
                  <Feather name="clock" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>
                    Viaje pendiente · aún sin calificación
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function statusColor(status: string) {
  if (status === 'Completado') return { bg: '#d8f1e4', text: '#138a68' };
  if (status === 'En camino') return { bg: '#e8f1ff', text: '#3b6fd9' };
  return { bg: '#fff3db', text: '#a66d16' };
}

function InfoTile({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function PersonRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.personRow}>
      <View style={[styles.personIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View>
        <Text style={[styles.personLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.personValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    marginBottom: 8,
    marginTop: 10,
    width: 42,
  },
  content: { gap: 14, paddingHorizontal: 20, paddingTop: 4 },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 2 },
  closeBtn: { alignItems: 'center', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  statusCard: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  routeCard: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 14 },
  routeRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  dot: { borderRadius: 8, height: 10, width: 10 },
  routeCopy: { flex: 1, gap: 2 },
  routeLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  routeValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  routeLine: { borderLeftWidth: 1, borderStyle: 'dashed', height: 14, marginLeft: 4 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoTile: { borderRadius: 14, borderWidth: 1, gap: 4, minWidth: '47%', padding: 12 },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  infoValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  peopleCard: { borderRadius: 18, borderWidth: 1, gap: 12, padding: 14 },
  personRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  personIcon: { alignItems: 'center', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  personLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  personValue: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 2 },
  divider: { height: 1 },
  priceCard: { borderRadius: 18, gap: 10, padding: 16 },
  priceTitle: { color: '#c5edda', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 },
  priceRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { color: '#c5edda', fontFamily: 'Inter_500Medium', fontSize: 13 },
  priceValue: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  airportRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
  },
  airportText: { color: '#ffd9a8', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  ratingCard: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  stars: { flexDirection: 'row', gap: 4 },
  ratingValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  comment: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  pendingRating: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  pendingText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});
