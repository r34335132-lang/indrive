import { Pressable, StyleSheet, Text, View } from 'react-native';

type RouteInfoCardProps = {
  distanceMeters: number;
  durationSeconds: number;
  priceLabel?: string;
  loading?: boolean;
  requesting?: boolean;
  onClear: () => void;
  onRequest?: () => void;
};

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function RouteInfoCard({
  distanceMeters,
  durationSeconds,
  priceLabel,
  loading,
  requesting,
  onClear,
  onRequest,
}: RouteInfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.metrics}>
        <View>
          <Text style={styles.label}>DISTANCIA</Text>
          <Text style={styles.value}>{loading ? '…' : formatDistance(distanceMeters)}</Text>
        </View>
        <View>
          <Text style={styles.label}>TIEMPO</Text>
          <Text style={styles.value}>{loading ? '…' : formatDuration(durationSeconds)}</Text>
        </View>
        <View>
          <Text style={styles.label}>TARIFA</Text>
          <Text style={styles.value}>{loading || !priceLabel ? '…' : priceLabel}</Text>
        </View>
      </View>
      {onRequest ? (
        <Pressable
          disabled={loading || requesting}
          onPress={onRequest}
          style={({ pressed }) => [styles.request, (pressed || requesting) && styles.pressed]}
        >
          <Text style={styles.requestText}>{requesting ? 'Pidiendo viaje…' : 'Pedir viaje'}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onClear} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
        <Text style={styles.clearText}>Limpiar destino</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 4,
    gap: 12,
    padding: 16,
    shadowColor: '#16362f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#6b7c74', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  value: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 4 },
  request: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 12,
    paddingVertical: 14,
  },
  requestText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  clear: {
    alignItems: 'center',
    backgroundColor: '#fff4e8',
    borderRadius: 12,
    paddingVertical: 12,
  },
  clearText: { color: '#b06d12', fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.8 },
});
