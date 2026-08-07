import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

export default function MapScreen() {
  const colors = useColors();
  const { booking, trips } = useBooking();
  const activeTrip = trips[0];
  return (
    <View style={[styles.screen, { backgroundColor: '#dfeae3' }]}>
      <View style={styles.mapSurface}>
        <View style={[styles.mapBlob, styles.blobOne]} /><View style={[styles.mapBlob, styles.blobTwo]} /><View style={[styles.mapBlock, styles.blockOne]} /><View style={[styles.mapBlock, styles.blockTwo]} /><View style={[styles.mapBlock, styles.blockThree]} /><View style={[styles.mapBlock, styles.blockFour]} />
        <View style={styles.roadA} /><View style={styles.roadB} /><View style={styles.roadC} />
        <View style={styles.routeLine} />
        <View style={[styles.mapMarker, { backgroundColor: colors.primary, left: '23%', top: '47%' }]}><Feather name="circle" size={13} color="#ffffff" /></View>
        <View style={[styles.mapMarker, { backgroundColor: '#e49339', left: '68%', top: '26%' }]}><Feather name="map-pin" size={14} color="#ffffff" /></View>
        <View style={[styles.carMarker, { backgroundColor: '#16362f', left: '47%', top: '38%' }]}><Feather name="truck" size={14} color="#ffffff" /></View>
        <SafeAreaView style={styles.mapHeader} edges={['top']}><Pressable testID="back-map" onPress={() => router.back()} style={styles.mapButton}><Feather name="arrow-left" size={20} color="#16362f" /></Pressable><View style={styles.mapChip}><View style={styles.greenDot} /><Text style={styles.mapChipText}>Mapa simulado</Text></View><Pressable style={styles.mapButton}><Feather name="crosshair" size={18} color="#16362f" /></Pressable></SafeAreaView>
        <View style={styles.mapHint}><Feather name="info" size={14} color={colors.primary} /><Text style={[styles.mapHintText, { color: colors.mutedForeground }]}>Lista para conectar Google Maps</Text></View>
      </View>
      <LinearGradient colors={['rgba(246,251,248,0.4)', '#f6fbf8 23%']} style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={[styles.sheetEyebrow, { color: colors.primary }]}>VIAJE CONFIRMADO</Text>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Tu conductor va en camino</Text>
        <View style={styles.driverRow}><View style={[styles.driverAvatar, { backgroundColor: colors.secondary }]}><Feather name="user" size={23} color={colors.primary} /></View><View style={styles.driverCopy}><Text style={[styles.driverName, { color: colors.foreground }]}>Mauricio Hernández</Text><View style={styles.rating}><Feather name="star" size={12} color="#e9a33f" /><Text style={[styles.ratingText, { color: colors.mutedForeground }]}>4.98 · Toyota Corolla verde</Text></View></View><View style={[styles.plate, { backgroundColor: colors.secondary }]}><Text style={[styles.plateText, { color: colors.primary }]}>NRA-218</Text></View></View>
        <View style={[styles.routeSummary, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.routeDotColumn}><View style={[styles.routeDot, { backgroundColor: colors.primary }]} /><View style={[styles.routeDash, { borderColor: colors.border }]} /><View style={[styles.routeDot, { backgroundColor: '#e49339' }]} /></View><View style={styles.routeLabels}><Text style={[styles.routeText, { color: colors.foreground }]}>{activeTrip?.origin ?? booking.origin}</Text><Text style={[styles.routeText, { color: colors.foreground }]}>{activeTrip?.destination ?? booking.destination}</Text></View><View style={styles.routeTimes}><Text style={[styles.routeTime, { color: colors.mutedForeground }]}>Ahora</Text><Text style={[styles.routeTime, { color: colors.mutedForeground }]}>27 min</Text></View></View>
        <View style={styles.sheetActions}><Pressable style={[styles.action, { backgroundColor: colors.secondary }]}><Feather name="phone" size={17} color={colors.primary} /><Text style={[styles.actionText, { color: colors.primary }]}>Llamar</Text></Pressable><Pressable style={[styles.action, { backgroundColor: colors.secondary }]}><Feather name="message-circle" size={17} color={colors.primary} /><Text style={[styles.actionText, { color: colors.primary }]}>Mensaje</Text></Pressable><Pressable onPress={() => router.replace('/(tabs)')} style={[styles.action, { backgroundColor: '#fff0ee' }]}><Feather name="x" size={17} color={colors.destructive} /><Text style={[styles.actionText, { color: colors.destructive }]}>Cancelar</Text></Pressable></View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapSurface: { flex: 1, overflow: 'hidden', position: 'relative' },
  mapBlob: { backgroundColor: '#c9ddce', borderRadius: 150, opacity: 0.65, position: 'absolute' },
  blobOne: { height: 260, left: -80, top: 70, width: 280 },
  blobTwo: { height: 320, right: -130, top: 160, width: 320 },
  mapBlock: { backgroundColor: '#edf5ed', borderRadius: 18, opacity: 0.9, position: 'absolute' },
  blockOne: { height: 100, left: '6%', top: '18%', transform: [{ rotate: '16deg' }], width: 170 },
  blockTwo: { height: 150, right: '1%', top: '12%', transform: [{ rotate: '-18deg' }], width: 180 },
  blockThree: { bottom: '26%', height: 150, left: '12%', transform: [{ rotate: '-24deg' }], width: 150 },
  blockFour: { bottom: '8%', height: 120, right: '4%', transform: [{ rotate: '22deg' }], width: 180 },
  roadA: { backgroundColor: '#f7fbf6', height: 20, left: -40, position: 'absolute', top: '43%', transform: [{ rotate: '25deg' }], width: '130%' },
  roadB: { backgroundColor: '#f7fbf6', height: 18, left: -30, position: 'absolute', top: '60%', transform: [{ rotate: '-30deg' }], width: '130%' },
  roadC: { backgroundColor: '#f7fbf6', height: 15, left: '43%', position: 'absolute', top: -20, transform: [{ rotate: '65deg' }], width: 17 },
  routeLine: { borderColor: '#138a68', borderRadius: 50, borderStyle: 'dashed', borderWidth: 3, height: 230, left: '33%', position: 'absolute', top: '24%', transform: [{ rotate: '33deg' }], width: 170 },
  mapMarker: { alignItems: 'center', borderColor: '#ffffff', borderRadius: 20, borderWidth: 3, height: 34, justifyContent: 'center', position: 'absolute', width: 34 },
  carMarker: { alignItems: 'center', borderColor: '#ffffff', borderRadius: 20, borderWidth: 3, height: 35, justifyContent: 'center', position: 'absolute', width: 35 },
  mapHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 0, paddingHorizontal: 18, position: 'absolute', right: 0, top: 0 },
  mapButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 14, height: 43, justifyContent: 'center', width: 43 },
  mapChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 100, flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingVertical: 9 },
  greenDot: { backgroundColor: '#138a68', borderRadius: 4, height: 7, width: 7 },
  mapChipText: { color: '#16362f', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  mapHint: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 100, bottom: 16, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 8, position: 'absolute' },
  mapHintText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  sheet: { borderTopLeftRadius: 29, borderTopRightRadius: 29, minHeight: 305, paddingHorizontal: 20, paddingTop: 13 },
  handle: { alignSelf: 'center', backgroundColor: '#d0ded5', borderRadius: 4, height: 4, marginBottom: 18, width: 38 },
  sheetEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, marginTop: 5 },
  driverRow: { alignItems: 'center', flexDirection: 'row', gap: 11, marginTop: 17 },
  driverAvatar: { alignItems: 'center', borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  driverCopy: { flex: 1, gap: 5 },
  driverName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  rating: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  ratingText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  plate: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  plateText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.7 },
  routeSummary: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 17, padding: 13 },
  routeDotColumn: { alignItems: 'center', height: 42, justifyContent: 'space-between', width: 9 },
  routeDot: { borderRadius: 10, height: 8, width: 8 },
  routeDash: { borderLeftWidth: 1, borderStyle: 'dashed', flex: 1 },
  routeLabels: { flex: 1, gap: 14 },
  routeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  routeTimes: { alignItems: 'flex-end', gap: 14 },
  routeTime: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  action: { alignItems: 'center', borderRadius: 12, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', paddingVertical: 11 },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});