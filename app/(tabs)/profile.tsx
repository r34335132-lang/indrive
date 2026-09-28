import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { LegalLinks } from '@/components/LegalLinks';
import { RideNotice } from '@/components/RideNotice';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';
import type { UserRole } from '@/types';

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.8';

const ROLE_LABEL: Record<UserRole, string> = {
  passenger: 'Pasajero',
  driver: 'Conductor',
  admin: 'Admin',
};

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, role, logout, deleteAccount, switchRole, docsComplete } = useAuth();
  const { trips } = useBooking();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const completed = trips.filter((t) => t.status === 'Completado');
  const rated = completed.filter((t) => typeof t.rating === 'number');
  const avgRating = rated.length
    ? rated.reduce((sum, t) => sum + (t.rating ?? 0), 0) / rated.length
    : user?.rating ?? 4.9;

  const changeRole = async (next: UserRole) => {
    if (next === role) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await switchRole(next);
    if (next === 'driver') {
      router.replace(docsComplete ? '/driver' : '/register-driver');
    } else if (next === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/(tabs)');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setShowDelete(false);
      router.replace('/');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  };

  const accountOptions: Array<{
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
  }> = [
    {
      icon: 'help-circle',
      title: 'Centro de ayuda',
      subtitle: SUPPORT_EMAIL,
      onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
    },
    {
      icon: 'file-text',
      title: 'Términos y condiciones',
      subtitle: 'Contrato de uso de INRIDE',
      onPress: () => void Linking.openURL(TERMS_URL),
    },
    {
      icon: 'shield',
      title: 'Política de privacidad',
      subtitle: 'Cómo usamos tus datos',
      onPress: () => void Linking.openURL(PRIVACY_URL),
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppLogo />
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {user?.initials ?? 'IR'}
              </Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{user?.name ?? 'Usuario'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            </View>
          </View>
          <View style={styles.profileStats}>
            <View>
              <Text style={styles.profileStatValue}>{user?.totalTrips ?? trips.length}</Text>
              <Text style={styles.profileStatLabel}>viajes</Text>
            </View>
            <View style={styles.profileStatLine} />
            <View>
              <Text style={styles.profileStatValue}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.profileStatLabel}>calificación</Text>
            </View>
            <View style={styles.profileStatLine} />
            <View>
              <Text style={styles.profileStatValue}>{user?.memberSince ?? '—'}</Text>
              <Text style={styles.profileStatLabel}>desde</Text>
            </View>
          </View>
        </View>

        {(user?.roles?.length ?? 0) > 1 ? (
          <View style={[styles.roleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.roleTitle, { color: colors.foreground }]}>Cambiar rol</Text>
            <Text style={[styles.roleHint, { color: colors.mutedForeground }]}>
              Activo: {ROLE_LABEL[role ?? 'passenger']}
            </Text>
            <View style={styles.roleRow}>
              {(user?.roles ?? []).filter((r) => r !== 'admin').map((r) => (
                <Pressable
                  key={r}
                  onPress={() => changeRole(r)}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: r === role ? colors.primary : colors.secondary,
                      borderColor: r === role ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: r === role ? '#fff' : colors.foreground,
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 12,
                    }}
                  >
                    {ROLE_LABEL[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ratingHeader}>
            <Text style={[styles.ratingTitle, { color: colors.foreground }]}>Tu reputación</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather
                  key={star}
                  name="star"
                  size={16}
                  color={star <= Math.round(avgRating) ? '#e9a33f' : '#d5e0d9'}
                />
              ))}
            </View>
          </View>
          <Text style={[styles.ratingCopy, { color: colors.mutedForeground }]}>
            {avgRating.toFixed(2)} de promedio en {rated.length || completed.length} viajes
            calificados.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tu cuenta</Text>
        <View style={[styles.optionList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {accountOptions.map((option) => (
            <Pressable
              key={option.title}
              onPress={option.onPress}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={option.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text>
                <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>
                  {option.subtitle}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="switch-driver"
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.driverMode,
            { backgroundColor: '#16362f' },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.driverModeIcon}>
            <Feather name="users" size={19} color="#16362f" />
          </View>
          <View style={styles.driverModeCopy}>
            <Text style={styles.driverModeTitle}>Cambiar de cuenta</Text>
            <Text style={styles.driverModeSubtitle}>Cerrar sesión y elegir otra cuenta</Text>
          </View>
          <Feather name="arrow-up-right" size={18} color="#c5edda" />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Información</Text>
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Teléfono</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {user?.phone || '—'}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Ciudad</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {user?.city || 'La Laguna'}
          </Text>
        </View>

        <Pressable
          testID="logout-passenger"
          style={styles.logout}
          onPress={() => void logout()}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Cerrar sesión</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setDeleteError(null);
            setShowDelete(true);
          }}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={15} color="#b91c1c" />
          <Text style={styles.deleteText}>Eliminar cuenta</Text>
        </Pressable>

        <LegalLinks tone="muted" center />
        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          inride · versión {APP_VERSION}
        </Text>
      </ScrollView>

      <RideNotice
        visible={showDelete}
        tone="warning"
        icon="trash-2"
        eyebrow="ELIMINAR CUENTA"
        title="¿Borrar tu cuenta de INRIDE?"
        message={
          deleteError
            ? deleteError
            : 'Se eliminarán tu perfil, documentos y acceso. El historial de viajes se anonimiza. Esta acción no se puede deshacer.'
        }
        primaryLabel={deleting ? 'Eliminando…' : 'Sí, eliminar definitivamente'}
        onPrimary={() => {
          if (!deleting) void confirmDelete();
        }}
        secondaryLabel="Cancelar"
        onSecondary={() => {
          if (!deleting) setShowDelete(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 18, paddingBottom: 34, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  profileCard: { borderRadius: 23, gap: 22, padding: 18 },
  profileTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#d8f1e4',
    borderRadius: 25,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  profileCopy: { flex: 1, gap: 4 },
  profileName: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  profileEmail: { color: '#c5edda', fontFamily: 'Inter_400Regular', fontSize: 11 },
  profileStats: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  profileStatValue: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  profileStatLabel: {
    color: '#c5edda',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },
  profileStatLine: { backgroundColor: 'rgba(255,255,255,0.18)', height: 27, width: 1 },
  roleCard: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  roleTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  roleHint: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  ratingCard: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 },
  ratingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  starsRow: { flexDirection: 'row', gap: 3 },
  ratingCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 2 },
  optionList: { borderRadius: 19, borderWidth: 1, overflow: 'hidden' },
  option: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 13 },
  pressed: { opacity: 0.7 },
  optionIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  optionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  driverMode: {
    alignItems: 'center',
    borderRadius: 19,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  driverModeIcon: {
    alignItems: 'center',
    backgroundColor: '#d8f1e4',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  driverModeCopy: { flex: 1, gap: 4 },
  driverModeTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  driverModeSubtitle: { color: '#c5edda', fontFamily: 'Inter_400Regular', fontSize: 11 },
  infoRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 13,
    paddingTop: 1,
  },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  logout: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  deleteBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  deleteText: { color: '#b91c1c', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },
});
