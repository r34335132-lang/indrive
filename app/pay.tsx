import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney } from '@/constants/pricing';
import { useBooking } from '@/context/BookingContext';
import { refreshRidePayment, startCardPayment } from '@/lib/api/payments';
import { useColors } from '@/hooks/useColors';

export default function PaymentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { cancelActiveRide } = useBooking();
  const { rideId, amount, next } = useLocalSearchParams<{
    rideId: string;
    amount?: string;
    next?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(Number(amount) || 0);
  const autoStarted = useRef(false);

  const goNext = useCallback(() => {
    if (next === 'waiting') {
      router.replace('/waiting' as Href);
      return;
    }
    router.replace('/(tabs)' as Href);
  }, [next, router]);

  const syncStatus = useCallback(async () => {
    if (!rideId) return;
    try {
      const row = await refreshRidePayment(rideId);
      setStatus(String(row.payment_status ?? 'pending'));
      setPrice(Number(row.price) || price);
      if (row.payment_status === 'approved') {
        setTimeout(() => goNext(), 800);
      }
    } catch {
      // ignore
    }
  }, [rideId, price, goNext]);

  useEffect(() => {
    void syncStatus();
    const t = setInterval(() => void syncStatus(), 3500);
    return () => clearInterval(t);
  }, [syncStatus]);

  const pay = async () => {
    if (!rideId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await startCardPayment(rideId);
      if (result.alreadyPaid) {
        setStatus('approved');
        goNext();
        return;
      }
      await syncStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir Mercado Pago');
    } finally {
      setBusy(false);
    }
  };

  // Abre Mercado Pago en cuanto entra a la pantalla
  useEffect(() => {
    if (!rideId || autoStarted.current) return;
    autoStarted.current = true;
    const timer = setTimeout(() => {
      void pay();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  const cancelAndLeave = async () => {
    try {
      await cancelActiveRide();
    } catch {
      // ignore
    }
    router.replace('/(tabs)' as Href);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => void cancelAndLeave()} style={styles.back}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Pagar viaje</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="credit-card" size={28} color={colors.primary} />
        <Text style={[styles.amount, { color: colors.foreground }]}>{formatMoney(price)}</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Paga ahora con Mercado Pago. Al aprobarse buscamos tu conductor.
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>
            Estado: {status === 'approved' ? 'Pagado ✓' : status === 'pending' ? 'Pendiente' : status}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {status === 'approved' ? (
        <View style={styles.okBox}>
          <Feather name="check-circle" size={22} color="#138a68" />
          <Text style={{ color: '#138a68', fontFamily: 'Inter_700Bold' }}>
            Pago aprobado · buscando conductor…
          </Text>
        </View>
      ) : (
        <Pressable
          disabled={busy}
          onPress={() => void pay()}
          style={[styles.payBtn, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="lock" size={16} color="#fff" />
              <Text style={styles.payText}>Abrir Mercado Pago</Text>
            </>
          )}
        </Pressable>
      )}

      <Pressable onPress={() => void cancelAndLeave()} style={styles.later}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>
          Cancelar viaje
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  back: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  card: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 28,
  },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 40, letterSpacing: -1 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  badge: { borderRadius: 100, marginTop: 6, paddingHorizontal: 12, paddingVertical: 6 },
  error: { color: '#dc2626', fontFamily: 'Inter_500Medium', marginTop: 12, textAlign: 'center' },
  payBtn: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  payText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  later: { alignItems: 'center', marginTop: 16, padding: 12 },
  okBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
  },
});
