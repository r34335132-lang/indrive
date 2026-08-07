import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBooking, type VehicleType } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

const vehicles: Array<{ type: VehicleType; icon: keyof typeof Feather.glyphMap; label: string; capacity: string; price: number; duration: string }> = [
  { type: 'Económico', icon: 'navigation', label: 'Económico', capacity: '1–4 personas', price: 122, duration: '31 min' },
  { type: 'Comfort', icon: 'truck', label: 'Comfort', capacity: '1–4 personas', price: 178, duration: '27 min' },
  { type: 'Premium', icon: 'star', label: 'Premium', capacity: '1–4 personas', price: 286, duration: '25 min' },
  { type: 'Van', icon: 'users', label: 'Van', capacity: 'Hasta 6 personas', price: 348, duration: '29 min' },
];

export default function BookScreen() {
  const colors = useColors();
  const { booking, updateBooking, addTrip } = useBooking();
  const [step, setStep] = useState(1);
  const canContinue = booking.origin.trim().length > 2 && booking.destination.trim().length > 2;

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) setStep((current) => current + 1);
    else {
      addTrip();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/map');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable testID="back-booking" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable><View><Text style={[styles.eyebrow, { color: colors.primary }]}>NUEVA RESERVA</Text><Text style={[styles.title, { color: colors.foreground }]}>Pide tu auto</Text></View><View style={{ width: 42 }} /></View>
        <View style={styles.progress}><View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step / 3) * 100}%` }]} /></View><Text style={[styles.progressText, { color: colors.mutedForeground }]}>Paso {step} de 3</Text></View>

        {step === 1 ? <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>¿A dónde te llevamos?</Text>
          <Text style={[styles.stepCopy, { color: colors.mutedForeground }]}>Indica tu ruta y nosotros nos encargamos del resto.</Text>
          <View style={[styles.routeForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formRow}><View style={[styles.formIcon, { backgroundColor: colors.secondary }]}><Feather name="circle" size={11} color={colors.primary} /></View><View style={styles.formField}><Text style={[styles.label, { color: colors.mutedForeground }]}>PUNTO DE PARTIDA</Text><TextInput testID="origin-input" value={booking.origin} onChangeText={(origin) => updateBooking({ origin })} placeholder="¿Desde dónde sales?" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} /></View></View>
            <View style={[styles.routeConnector, { borderColor: colors.border }]} />
            <View style={styles.formRow}><View style={[styles.formIcon, { backgroundColor: '#fff1df' }]}><Feather name="map-pin" size={12} color="#e49339" /></View><View style={styles.formField}><Text style={[styles.label, { color: colors.mutedForeground }]}>DESTINO</Text><TextInput testID="destination-input" value={booking.destination} onChangeText={(destination) => updateBooking({ destination })} placeholder="¿A dónde vas?" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} /></View></View>
          </View>
          <Text style={[styles.subheading, { color: colors.foreground }]}>¿Cuándo viajas?</Text>
          <View style={styles.choiceRow}><Pressable onPress={() => updateBooking({ date: 'Hoy, 07 ago' })} style={[styles.choice, { borderColor: booking.date.startsWith('Hoy') ? colors.primary : colors.border, backgroundColor: booking.date.startsWith('Hoy') ? colors.secondary : colors.card }]}><Feather name="calendar" size={16} color={colors.primary} /><View><Text style={[styles.choiceLabel, { color: colors.mutedForeground }]}>FECHA</Text><Text style={[styles.choiceValue, { color: colors.foreground }]}>Hoy, 07 ago</Text></View></Pressable><Pressable onPress={() => updateBooking({ time: '18:30' })} style={[styles.choice, { borderColor: colors.primary, backgroundColor: colors.secondary }]}><Feather name="clock" size={16} color={colors.primary} /><View><Text style={[styles.choiceLabel, { color: colors.mutedForeground }]}>HORA</Text><Text style={[styles.choiceValue, { color: colors.foreground }]}>18:30</Text></View></Pressable></View>
        </View> : null}

        {step === 2 ? <View style={styles.stepContent}><Text style={[styles.stepTitle, { color: colors.foreground }]}>Elige tu experiencia</Text><Text style={[styles.stepCopy, { color: colors.mutedForeground }]}>Vehículos cómodos para cada tipo de trayecto.</Text><View style={styles.vehicleList}>{vehicles.map((vehicle) => <Pressable key={vehicle.type} testID={`vehicle-${vehicle.type}`} onPress={() => updateBooking({ vehicle: vehicle.type })} style={({ pressed }) => [styles.vehicle, { backgroundColor: booking.vehicle === vehicle.type ? colors.secondary : colors.card, borderColor: booking.vehicle === vehicle.type ? colors.primary : colors.border }, pressed && styles.pressed]}><View style={[styles.vehicleIcon, { backgroundColor: booking.vehicle === vehicle.type ? colors.primary : colors.muted }]}><Feather name={vehicle.icon} size={21} color={booking.vehicle === vehicle.type ? '#ffffff' : colors.primary} /></View><View style={styles.vehicleCopy}><Text style={[styles.vehicleName, { color: colors.foreground }]}>{vehicle.label}</Text><Text style={[styles.vehicleMeta, { color: colors.mutedForeground }]}>{vehicle.capacity} · {vehicle.duration}</Text></View><View style={styles.vehiclePrice}><Text style={[styles.from, { color: colors.mutedForeground }]}>desde</Text><Text style={[styles.price, { color: colors.foreground }]}>${vehicle.price}</Text></View>{booking.vehicle === vehicle.type ? <View style={[styles.check, { backgroundColor: colors.primary }]}><Feather name="check" size={11} color="#ffffff" /></View> : null}</Pressable>)}</View></View> : null}

        {step === 3 ? <View style={styles.stepContent}><View style={[styles.confirmIcon, { backgroundColor: colors.secondary }]}><Feather name="check-circle" size={32} color={colors.primary} /></View><Text style={[styles.stepTitle, { color: colors.foreground }]}>Revisa tu viaje</Text><Text style={[styles.stepCopy, { color: colors.mutedForeground }]}>Todo listo para moverte con INRAID.</Text><View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.summaryRoute}><View style={styles.summaryPinCol}><View style={[styles.smallDot, { backgroundColor: colors.primary }]} /><View style={[styles.summaryDash, { borderColor: colors.border }]} /><View style={[styles.smallDot, { backgroundColor: '#e49339' }]} /></View><View style={styles.summaryAddresses}><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>ORIGEN</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{booking.origin}</Text><Text style={[styles.summaryLabel, { color: colors.mutedForeground, marginTop: 16 }]}>DESTINO</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{booking.destination}</Text></View></View><View style={[styles.summaryDetails, { borderTopColor: colors.border }]}><View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>FECHA Y HORA</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{booking.date} · {booking.time}</Text></View><View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>VEHÍCULO</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{booking.vehicle}</Text></View></View><View style={[styles.estimate, { backgroundColor: colors.secondary }]}><Text style={[styles.estimateLabel, { color: colors.mutedForeground }]}>PRECIO ESTIMADO</Text><Text style={[styles.estimateValue, { color: colors.primary }]}>${vehicles.find((item) => item.type === booking.vehicle)?.price}</Text></View></View></View> : null}
        <Pressable testID="booking-continue" disabled={step === 1 && !canContinue} onPress={nextStep} style={({ pressed }) => [styles.continue, { backgroundColor: step === 1 && !canContinue ? colors.border : colors.primary }, pressed && styles.pressed]}><Text style={[styles.continueText, { color: step === 1 && !canContinue ? colors.mutedForeground : '#ffffff' }]}>{step === 3 ? 'Confirmar viaje' : 'Continuar'}</Text><Feather name={step === 3 ? 'check' : 'arrow-right'} size={18} color={step === 1 && !canContinue ? colors.mutedForeground : '#ffffff'} /></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 22, paddingBottom: 30, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  back: { alignItems: 'center', borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, textAlign: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.6, marginTop: 3, textAlign: 'center' },
  progress: { alignItems: 'center', gap: 8 },
  progressTrack: { borderRadius: 4, height: 5, overflow: 'hidden', width: '100%' },
  progressFill: { borderRadius: 4, height: 5 },
  progressText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  stepContent: { gap: 10 },
  stepTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.7 },
  stepCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 7 },
  routeForm: { borderRadius: 20, borderWidth: 1, padding: 16 },
  formRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  formIcon: { alignItems: 'center', borderRadius: 11, height: 33, justifyContent: 'center', width: 33 },
  formField: { flex: 1, gap: 2 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  input: { fontFamily: 'Inter_600SemiBold', fontSize: 14, padding: 0 },
  routeConnector: { borderLeftWidth: 1, borderStyle: 'dashed', height: 19, marginLeft: 16, marginVertical: 2 },
  subheading: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 10 },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choice: { alignItems: 'center', borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 9, padding: 12 },
  choiceLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  choiceValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 3 },
  vehicleList: { gap: 10 },
  vehicle: { alignItems: 'center', borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 12, position: 'relative' },
  pressed: { opacity: 0.78 },
  vehicleIcon: { alignItems: 'center', borderRadius: 13, height: 48, justifyContent: 'center', width: 48 },
  vehicleCopy: { flex: 1, gap: 5 },
  vehicleName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  vehicleMeta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  vehiclePrice: { alignItems: 'flex-end', gap: 2 },
  from: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  check: { alignItems: 'center', borderRadius: 20, height: 19, justifyContent: 'center', position: 'absolute', right: 11, top: 10, width: 19 },
  confirmIcon: { alignItems: 'center', borderRadius: 20, height: 64, justifyContent: 'center', marginBottom: 4, width: 64 },
  summaryCard: { borderRadius: 21, borderWidth: 1, overflow: 'hidden', padding: 16 },
  summaryRoute: { flexDirection: 'row', gap: 12 },
  summaryPinCol: { alignItems: 'center', height: 91, justifyContent: 'space-between', paddingVertical: 5, width: 10 },
  smallDot: { borderRadius: 10, height: 9, width: 9 },
  summaryDash: { borderLeftWidth: 1, borderStyle: 'dashed', flex: 1 },
  summaryAddresses: { flex: 1 },
  summaryLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 4 },
  summaryDetails: { borderTopWidth: 1, flexDirection: 'row', gap: 16, marginTop: 20, paddingTop: 14 },
  detailLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  detailValue: { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginTop: 4 },
  estimate: { alignItems: 'center', borderRadius: 13, flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 13, paddingVertical: 11 },
  estimateLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  estimateValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  continue: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  continueText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});