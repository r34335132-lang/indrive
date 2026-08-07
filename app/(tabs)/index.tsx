import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { SectionTitle } from '@/components/SectionTitle';
import { TripCard } from '@/components/TripCard';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const { trips } = useBooking();
  const upcoming = useMemo(() => trips.find((trip) => trip.status !== 'Completado'), [trips]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppLogo />
          <Pressable testID="notifications" style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bell" size={18} color={colors.foreground} />
            <View style={[styles.notificationDot, { backgroundColor: colors.primary }]} />
          </Pressable>
        </View>
        <View style={styles.greeting}>
          <Text style={[styles.hello, { color: colors.mutedForeground }]}>Buenos días,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>Sofía</Text>
        </View>
        <LinearGradient colors={['#147c5e', '#2ca477']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCopy}>
            <View style={styles.heroLabel}><View style={styles.liveDot} /><Text style={styles.heroLabelText}>INRAID · MOVILIDAD</Text></View>
            <Text style={styles.heroTitle}>¿A dónde{'\n'}quieres ir?</Text>
            <Text style={styles.heroSubtitle}>Viaja seguro, fácil y rápido por México.</Text>
          </View>
          <View style={styles.routeCard}>
            <View style={styles.inputRow}>
              <View style={[styles.pin, { backgroundColor: '#e3f6ea' }]}><Feather name="circle" size={10} color={colors.primary} /></View>
              <View style={styles.inputText}><Text style={[styles.inputCaption, { color: colors.mutedForeground }]}>DESDE</Text><Text style={[styles.inputValue, { color: colors.foreground }]}>Colonia Roma Norte</Text></View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
            <View style={[styles.inputDivider, { borderColor: colors.border }]} />
            <View style={styles.inputRow}>
              <View style={[styles.pin, { backgroundColor: '#fff1df' }]}><Feather name="map-pin" size={11} color="#e49339" /></View>
              <View style={styles.inputText}><Text style={[styles.inputCaption, { color: colors.mutedForeground }]}>HASTA</Text><Text style={[styles.inputValue, { color: colors.foreground }]}>Aeropuerto CDMX</Text></View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
            <Pressable testID="book-home" onPress={() => router.push('/book')} style={({ pressed }) => [styles.bookButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.bookText}>Reservar un viaje</Text>
              <Feather name="arrow-up-right" size={18} color="#ffffff" />
            </Pressable>
          </View>
        </LinearGradient>
        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>12</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>viajes realizados</Text></View>
          <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>4.9</Text><View style={styles.rating}><Feather name="star" size={13} color="#e9a33f" /><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>tu calificación</Text></View></View>
        </View>
        <View style={styles.section}>
          <SectionTitle title="Tu próximo viaje" action="Ver todos" />
          {upcoming ? <TripCard trip={upcoming} onPress={() => router.push('/map')} /> : <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="calendar" size={22} color={colors.primary} /><Text style={[styles.emptyText, { color: colors.foreground }]}>Aún no tienes viajes programados</Text><Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>Reserva tu próximo destino en segundos.</Text></View>}
        </View>
        <View style={styles.section}>
          <SectionTitle eyebrow="Descubre" title="Viaja con propósito" />
          <View style={styles.discoveryRow}>
            <View style={[styles.discoveryCard, { backgroundColor: '#e7f4ed' }]}><View style={[styles.discoveryIcon, { backgroundColor: '#c8e9d5' }]}><Feather name="shield" size={18} color={colors.primary} /></View><Text style={[styles.discoveryTitle, { color: colors.foreground }]}>Viajes seguros</Text><Text style={[styles.discoveryCopy, { color: colors.mutedForeground }]}>Conductores verificados en cada trayecto.</Text></View>
            <View style={[styles.discoveryCard, { backgroundColor: '#fff4e5' }]}><View style={[styles.discoveryIcon, { backgroundColor: '#ffe4bb' }]}><Feather name="navigation" size={18} color="#d88d2e" /></View><Text style={[styles.discoveryTitle, { color: colors.foreground }]}>Siempre en ruta</Text><Text style={[styles.discoveryCopy, { color: colors.mutedForeground }]}>Sigue tu viaje en tiempo real.</Text></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 22, paddingBottom: 28, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  iconButton: { alignItems: 'center', borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', position: 'relative', width: 42 },
  notificationDot: { borderRadius: 4, height: 7, position: 'absolute', right: 9, top: 9, width: 7 },
  greeting: { gap: 3 },
  hello: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -1 },
  hero: { borderRadius: 28, minHeight: 360, overflow: 'hidden', padding: 20 },
  heroGlow: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 150, height: 260, position: 'absolute', right: -100, top: -80, width: 260 },
  heroCopy: { gap: 13, marginBottom: 24 },
  heroLabel: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  liveDot: { backgroundColor: '#b5f0c5', borderRadius: 4, height: 7, width: 7 },
  heroLabelText: { color: '#d6f5e0', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  heroTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1.2 },
  heroSubtitle: { color: '#d5f2df', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  routeCard: { backgroundColor: '#ffffff', borderRadius: 19, padding: 13 },
  inputRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 2, paddingVertical: 4 },
  pin: { alignItems: 'center', borderRadius: 10, height: 28, justifyContent: 'center', width: 28 },
  inputText: { flex: 1, gap: 3 },
  inputCaption: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  inputValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  inputDivider: { borderBottomWidth: 1, marginLeft: 40, marginVertical: 4 },
  bookButton: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 15, paddingVertical: 14 },
  bookText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.78 },
  statsRow: { flexDirection: 'row', gap: 11 },
  stat: { borderRadius: 17, borderWidth: 1, flex: 1, gap: 4, padding: 14 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  rating: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  section: { gap: 0 },
  empty: { alignItems: 'center', borderRadius: 20, borderWidth: 1, gap: 8, padding: 24 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center' },
  discoveryRow: { flexDirection: 'row', gap: 11 },
  discoveryCard: { borderRadius: 20, flex: 1, gap: 8, minHeight: 145, padding: 14 },
  discoveryIcon: { alignItems: 'center', borderRadius: 11, height: 34, justifyContent: 'center', width: 34 },
  discoveryTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  discoveryCopy: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});
