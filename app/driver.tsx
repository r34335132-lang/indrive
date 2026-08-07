import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { useColors } from '@/hooks/useColors';

const offers = [
  { id: 'offer-1', passenger: 'Daniel R.', pickup: 'Condesa', destination: 'Terminal 2 · AICM', distance: '8.4 km', duration: '26 min', price: '$186', net: '$158' },
  { id: 'offer-2', passenger: 'Mariana L.', pickup: 'Polanco', destination: 'Santa Fe Centro', distance: '11.2 km', duration: '32 min', price: '$244', net: '$207' },
];

export default function DriverScreen() {
  const colors = useColors();
  const [online, setOnline] = useState(true);
  const [accepted, setAccepted] = useState<string | null>(null);
  const selected = offers.find((offer) => offer.id === accepted) ?? offers[0];

  const toggleOnline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnline((current) => !current);
  };

  const acceptOffer = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccepted(id);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable testID="back-driver" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable>
          <AppLogo light />
          <Pressable testID="driver-toggle" onPress={toggleOnline} style={[styles.onlinePill, { backgroundColor: online ? colors.secondary : colors.muted }]}><View style={[styles.onlineDot, { backgroundColor: online ? colors.primary : colors.mutedForeground }]} /><Text style={[styles.onlineText, { color: online ? colors.primary : colors.mutedForeground }]}>{online ? 'En línea' : 'Desconectado'}</Text></Pressable>
        </View>
        <View style={[styles.welcome, { backgroundColor: '#16362f' }]}>
          <View style={styles.welcomeCopy}><Text style={styles.welcomeEyebrow}>CENTRO DEL CONDUCTOR</Text><Text style={styles.welcomeTitle}>Hola, Mauricio</Text><Text style={styles.welcomeCopyText}>{online ? 'Hay solicitudes cerca de ti.' : 'Conéctate para empezar a recibir viajes.'}</Text></View>
          <View style={styles.steering}><Feather name="navigation" size={23} color="#16362f" /></View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.statIcon, { backgroundColor: colors.secondary }]}><Feather name="trending-up" size={16} color={colors.primary} /></View><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>HOY</Text><Text style={[styles.statValue, { color: colors.foreground }]}>$1,248</Text><Text style={[styles.statHint, { color: colors.primary }]}>+18% vs. ayer</Text></View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.statIcon, { backgroundColor: '#fff1df' }]}><Feather name="navigation" size={16} color="#d88d2e" /></View><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>VIAJES</Text><Text style={[styles.statValue, { color: colors.foreground }]}>8</Text><Text style={[styles.statHint, { color: colors.mutedForeground }]}>6 h 24 min en ruta</Text></View>
        </View>
        <View style={styles.sectionHeader}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>SOLICITUDES CERCA DE TI</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{online ? 'Elige tu próximo viaje' : 'No estás disponible'}</Text></View><View style={[styles.radius, { backgroundColor: colors.secondary }]}><Feather name="radio" size={13} color={colors.primary} /><Text style={[styles.radiusText, { color: colors.primary }]}>5 km</Text></View></View>
        {online ? <View style={styles.offerList}>{offers.map((offer) => <View key={offer.id} style={[styles.offerCard, { backgroundColor: colors.card, borderColor: accepted === offer.id ? colors.primary : colors.border }]}><View style={styles.offerTop}><View style={[styles.passengerAvatar, { backgroundColor: colors.secondary }]}><Feather name="user" size={17} color={colors.primary} /></View><View style={styles.passengerCopy}><Text style={[styles.passengerName, { color: colors.foreground }]}>{offer.passenger}</Text><View style={styles.passengerRating}><Feather name="star" size={11} color="#e9a33f" /><Text style={[styles.ratingText, { color: colors.mutedForeground }]}>4.9 · pasajero frecuente</Text></View></View><Text style={[styles.offerPrice, { color: colors.foreground }]}>{offer.price}</Text></View><View style={styles.route}><View style={styles.routeLine}><View style={[styles.routeDot, { backgroundColor: colors.primary }]} /><View style={[styles.routeDash, { borderColor: colors.border }]} /><View style={[styles.routeDot, { backgroundColor: '#e49339' }]} /></View><View style={styles.routeCopy}><Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>RECOGER EN</Text><Text style={[styles.routeValue, { color: colors.foreground }]}>{offer.pickup}</Text><Text style={[styles.routeLabel, { color: colors.mutedForeground, marginTop: 13 }]}>DESTINO</Text><Text style={[styles.routeValue, { color: colors.foreground }]}>{offer.destination}</Text></View><View style={styles.routeMeta}><Text style={[styles.metaValue, { color: colors.foreground }]}>{offer.distance}</Text><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>distancia</Text><Text style={[styles.metaValue, { color: colors.foreground, marginTop: 13 }]}>{offer.duration}</Text><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>estimado</Text></View></View><View style={[styles.offerBottom, { borderTopColor: colors.border }]}><View><Text style={[styles.netLabel, { color: colors.mutedForeground }]}>RECIBES APROX.</Text><Text style={[styles.netValue, { color: colors.primary }]}>{offer.net}</Text></View><Pressable testID={`accept-${offer.id}`} onPress={() => acceptOffer(offer.id)} style={({ pressed }) => [styles.acceptButton, { backgroundColor: accepted === offer.id ? colors.secondary : colors.primary }, pressed && styles.pressed]}><Text style={[styles.acceptText, { color: accepted === offer.id ? colors.primary : '#ffffff' }]}>{accepted === offer.id ? 'Viaje aceptado' : 'Aceptar viaje'}</Text><Feather name={accepted === offer.id ? 'check' : 'arrow-up-right'} size={16} color={accepted === offer.id ? colors.primary : '#ffffff'} /></Pressable></View></View>)}</View> : <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.offlineIcon, { backgroundColor: colors.muted }]}><Feather name="power" size={22} color={colors.mutedForeground} /></View><Text style={[styles.offlineTitle, { color: colors.foreground }]}>Activa tu disponibilidad</Text><Text style={[styles.offlineCopy, { color: colors.mutedForeground }]}>Recibirás solicitudes según tu zona y preferencias de viaje.</Text><Pressable onPress={toggleOnline} style={[styles.connectButton, { backgroundColor: colors.primary }]}><Text style={styles.connectText}>Conectarme</Text></Pressable></View>}
        <View style={[styles.earningsCard, { backgroundColor: colors.secondary }]}><View style={styles.earningsHeader}><View><Text style={[styles.earningsEyebrow, { color: colors.primary }]}>RESUMEN SEMANAL</Text><Text style={[styles.earningsTitle, { color: colors.foreground }]}>Tus ganancias</Text></View><Feather name="bar-chart-2" size={21} color={colors.primary} /></View><View style={styles.chart}><View style={[styles.bar, { backgroundColor: '#aad9bd', height: 30 }]} /><View style={[styles.bar, { backgroundColor: '#aad9bd', height: 46 }]} /><View style={[styles.bar, { backgroundColor: '#aad9bd', height: 38 }]} /><View style={[styles.bar, { backgroundColor: '#aad9bd', height: 60 }]} /><View style={[styles.bar, { backgroundColor: colors.primary, height: 82 }]} /><View style={[styles.bar, { backgroundColor: '#aad9bd', height: 51 }]} /><View style={[styles.bar, { backgroundColor: '#aad9bd', height: 40 }]} /></View><View style={styles.days}><Text>L</Text><Text>M</Text><Text>M</Text><Text>J</Text><Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold' }}>V</Text><Text>S</Text><Text>D</Text></View><View style={styles.weekTotal}><Text style={[styles.weekTotalLabel, { color: colors.mutedForeground }]}>TOTAL ESTA SEMANA</Text><Text style={[styles.weekTotalValue, { color: colors.foreground }]}>$6,842</Text></View></View>
        <View style={[styles.tip, { borderColor: colors.border }]}><Feather name="shield" size={16} color={colors.primary} /><Text style={[styles.tipText, { color: colors.mutedForeground }]}>Tu seguridad es prioridad. La información del pasajero se muestra solo después de aceptar el viaje.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 19, paddingBottom: 30, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5 },
  back: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  onlinePill: { alignItems: 'center', borderRadius: 100, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  onlineDot: { borderRadius: 5, height: 7, width: 7 },
  onlineText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  welcome: { alignItems: 'center', borderRadius: 23, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', padding: 18 },
  welcomeCopy: { flex: 1, gap: 7 },
  welcomeEyebrow: { color: '#b9ead0', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  welcomeTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.6 },
  welcomeCopyText: { color: '#c5edda', fontFamily: 'Inter_400Regular', fontSize: 12 },
  steering: { alignItems: 'center', backgroundColor: '#d8f1e4', borderRadius: 23, height: 50, justifyContent: 'center', width: 50 },
  statsRow: { flexDirection: 'row', gap: 11 },
  statCard: { borderRadius: 18, borderWidth: 1, flex: 1, gap: 4, padding: 13 },
  statIcon: { alignItems: 'center', borderRadius: 10, height: 31, justifyContent: 'center', marginBottom: 3, width: 31 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  statHint: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4, marginBottom: 5 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  radius: { alignItems: 'center', borderRadius: 100, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  radiusText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  offerList: { gap: 12 },
  offerCard: { borderRadius: 20, borderWidth: 1, padding: 15 },
  offerTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  passengerAvatar: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  passengerCopy: { flex: 1, gap: 4 },
  passengerName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  passengerRating: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  ratingText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  route: { flexDirection: 'row', gap: 11, marginTop: 18 },
  routeLine: { alignItems: 'center', height: 85, justifyContent: 'space-between', width: 9 },
  routeDot: { borderRadius: 9, height: 8, width: 8 },
  routeDash: { borderLeftWidth: 1, borderStyle: 'dashed', flex: 1 },
  routeCopy: { flex: 1 },
  routeLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  routeValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 3 },
  routeMeta: { alignItems: 'flex-end' },
  metaValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  metaLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  offerBottom: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 17, paddingTop: 13 },
  netLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.8 },
  netValue: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 3 },
  acceptButton: { alignItems: 'center', borderRadius: 11, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 11 },
  acceptText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  pressed: { opacity: 0.78 },
  offlineCard: { alignItems: 'center', borderRadius: 20, borderWidth: 1, gap: 9, padding: 25 },
  offlineIcon: { alignItems: 'center', borderRadius: 22, height: 46, justifyContent: 'center', width: 46 },
  offlineTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  offlineCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  connectButton: { borderRadius: 11, marginTop: 4, paddingHorizontal: 17, paddingVertical: 11 },
  connectText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  earningsCard: { borderRadius: 20, padding: 16 },
  earningsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  earningsEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3 },
  earningsTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 4 },
  chart: { alignItems: 'flex-end', flexDirection: 'row', gap: 10, height: 94, justifyContent: 'center', marginTop: 10 },
  bar: { borderRadius: 5, width: 23 },
  days: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 7 },
  weekTotal: { alignItems: 'center', borderTopColor: '#cbe5d5', borderTopWidth: 1, marginTop: 14, paddingTop: 13 },
  weekTotalLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.1 },
  weekTotalValue: { fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 4 },
  tip: { alignItems: 'flex-start', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 9, padding: 13 },
  tipText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
});