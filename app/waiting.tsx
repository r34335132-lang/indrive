import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideNotice } from '@/components/RideNotice';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

export default function WaitingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeRide, clearActiveRide } = useBooking();
  const [seconds, setSeconds] = useState(0);
  const [showAccepted, setShowAccepted] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const acceptedRef = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!activeRide) {
      router.replace('/(tabs)/book');
      return;
    }

    const acceptedStates = [
      'accepted',
      'en_route_pickup',
      'arrived_pickup',
      'in_progress',
    ] as const;

    if (acceptedStates.includes(activeRide.status as (typeof acceptedStates)[number])) {
      if (!acceptedRef.current) {
        acceptedRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAccepted(true);
      }
    }
  }, [activeRide, router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Pressable
          onPress={() => setShowCancel(true)}
          style={[styles.close, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>

        <View style={[styles.radarCore, { backgroundColor: colors.primary }]}>
          <Feather name="navigation" size={28} color="#ffffff" />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Buscando conductor...</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Esperando que un conductor en el otro dispositivo acepte tu viaje
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>ORIGEN</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>
            {activeRide?.origin ?? '—'}
          </Text>
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>DESTINO</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>
            {activeRide?.destination ?? '—'}
          </Text>
          <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {activeRide?.vehicle} · {activeRide?.duration}
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              ${activeRide?.price?.toFixed?.(2) ?? activeRide?.price ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            Esperando respuesta · {seconds}s
          </Text>
        </View>

        <LinearGradient colors={['#16362f', '#138a68']} style={styles.tip}>
          <Feather name="shield" size={16} color="#d8f1e4" />
          <Text style={styles.tipText}>
            Abre la app en el otro teléfono como Mauricio para aceptar este viaje en tiempo real.
          </Text>
        </LinearGradient>
      </View>

      <RideNotice
        visible={showAccepted}
        tone="success"
        icon="check-circle"
        eyebrow="¡LISTO!"
        title="Viaje aceptado"
        message={`${activeRide?.driverName ?? 'Tu conductor'} aceptó tu solicitud y va en camino.`}
        details={[
          { label: 'Ruta', value: `${activeRide?.origin ?? ''} → ${activeRide?.destination ?? ''}` },
          { label: 'Vehículo', value: activeRide?.driverCar ?? '—' },
          { label: 'Placas', value: activeRide?.driverPlate ?? '—' },
        ]}
        primaryLabel="Ver en el mapa"
        onPrimary={() => {
          setShowAccepted(false);
          router.replace('/map');
        }}
      />

      <RideNotice
        visible={showCancel}
        tone="warning"
        icon="x-circle"
        eyebrow="CANCELAR"
        title="¿Cancelar búsqueda?"
        message="Se cancelará tu solicitud actual."
        primaryLabel="Sí, cancelar"
        onPrimary={async () => {
          setShowCancel(false);
          await clearActiveRide();
          router.replace('/(tabs)');
        }}
        secondaryLabel="Seguir esperando"
        onSecondary={() => setShowCancel(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  close: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  radarCore: {
    alignItems: 'center',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginTop: 40,
    width: 72,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
    textAlign: 'center',
  },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, width: '100%' },
  label: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  value: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 3 },
  metaRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  meta: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 4 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  tip: {
    alignItems: 'flex-start',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    padding: 14,
    width: '100%',
  },
  tipText: {
    color: '#c5edda',
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});
