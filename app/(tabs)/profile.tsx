import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InrideWordmark } from '@/components/InrideMark';
import { LegalLinks } from '@/components/LegalLinks';
import { RideNotice } from '@/components/RideNotice';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/constants/legal';
import { BRAND, cardShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import type { UserRole } from '@/types';

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.8';

const headerBackground = require('@/assets/images/login-bg.jpg');

const ROLE_LABEL: Record<UserRole, string> = {
  passenger: 'Pasajero',
  driver: 'Conductor',
  admin: 'Admin',
};

type MenuOption = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const totalTrips = user?.totalTrips ?? trips.length;

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
      router.replace('/welcome');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  };

  const menuOptions: MenuOption[] = [
    {
      icon: 'clock',
      title: 'Mis viajes',
      subtitle: `${totalTrips} viajes realizados`,
      onPress: () => router.push('/(tabs)/trips'),
    },
    {
      icon: 'help-circle',
      title: 'Centro de ayuda',
      subtitle: SUPPORT_EMAIL,
      onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
    },
    {
      icon: 'file-text',
      title: 'Términos y condiciones',
      onPress: () => void Linking.openURL(TERMS_URL),
    },
    {
      icon: 'shield',
      title: 'Política de privacidad',
      onPress: () => void Linking.openURL(PRIVACY_URL),
    },
    {
      icon: 'users',
      title: 'Cambiar de cuenta',
      subtitle: 'Cerrar sesión y elegir otra cuenta',
      onPress: () => void logout(),
      testID: 'switch-driver',
    },
  ];

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={headerBackground}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(6,28,23,0.25)', 'rgba(6,28,23,0.55)', 'rgba(6,28,23,0.85)']}
            style={[StyleSheet.absoluteFill, styles.heroImage]}
          />
          <View style={styles.heroBrand}>
            <InrideWordmark size={26} arcColor="#3fd0d6" pinColor="#ffffff" textColor="#ffffff" />
          </View>

          <View style={styles.heroProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.initials ?? 'IR'}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name ?? 'Usuario'}
            </Text>
            {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
            {user?.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
            <View style={styles.statChip}>
              <Feather name="star" size={13} color="#f2b544" />
              <Text style={styles.statChipText}>{avgRating.toFixed(1)}</Text>
              <View style={styles.statChipLine} />
              <Text style={styles.statChipText}>{totalTrips} viajes</Text>
              <View style={styles.statChipLine} />
              <Text style={styles.statChipText}>{user?.city || 'La Laguna'}</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {(user?.roles?.length ?? 0) > 1 ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Cambiar rol</Text>
                <Text style={styles.cardHint}>Activo: {ROLE_LABEL[role ?? 'passenger']}</Text>
              </View>
              <View style={styles.roleRow}>
                {(user?.roles ?? []).filter((r) => r !== 'admin').map((r) => {
                  const active = r === role;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => changeRole(r)}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                    >
                      <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                        {ROLE_LABEL[r]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={[styles.card, styles.menuCard]}>
            {menuOptions.map((option, index) => (
              <Pressable
                key={option.title}
                testID={option.testID}
                onPress={option.onPress}
                style={({ pressed }) => [
                  styles.option,
                  index < menuOptions.length - 1 && styles.optionDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.optionIcon}>
                  <Feather name={option.icon} size={18} color={BRAND.primary} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.subtitle ? (
                    <Text style={styles.optionSubtitle} numberOfLines={1}>
                      {option.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={18} color={BRAND.muted} />
              </Pressable>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Formas de pago</Text>
              <Text style={styles.cardHint}>Se elige al pedir tu viaje</Text>
            </View>
            <View style={styles.payRow}>
              <View style={styles.payIcon}>
                <Feather name="dollar-sign" size={17} color={BRAND.green} />
              </View>
              <Text style={styles.payText}>Efectivo</Text>
            </View>
            <View style={styles.payRow}>
              <View style={styles.payIcon}>
                <Feather name="credit-card" size={17} color={BRAND.green} />
              </View>
              <Text style={styles.payText}>Tarjeta · Mercado Pago</Text>
            </View>
          </View>

          <Pressable
            testID="logout-passenger"
            onPress={() => void logout()}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          >
            <Feather name="log-out" size={17} color={BRAND.red} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
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
          <Text style={styles.version}>inride · versión {APP_VERSION}</Text>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: BRAND.bg, flex: 1 },
  content: { paddingBottom: 34 },
  hero: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  heroImage: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroBrand: { alignItems: 'center', marginBottom: 18 },
  heroProfile: { alignItems: 'center', gap: 4 },
  avatar: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderColor: '#ffffff',
    borderRadius: 46,
    borderWidth: 4,
    height: 92,
    justifyContent: 'center',
    marginBottom: 8,
    width: 92,
  },
  avatarText: { color: BRAND.primary, fontFamily: 'Inter_700Bold', fontSize: 28 },
  name: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 22 },
  phone: { color: '#e3f3ec', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  email: { color: '#c5e4d8', fontFamily: 'Inter_400Regular', fontSize: 12 },
  statChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statChipText: { color: '#ffffff', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  statChipLine: { backgroundColor: 'rgba(255,255,255,0.35)', height: 14, width: 1 },
  body: { gap: 16, paddingHorizontal: 18, paddingTop: 18 },
  card: {
    ...cardShadow,
    backgroundColor: BRAND.card,
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 15 },
  cardHint: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 12 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    backgroundColor: BRAND.bg,
    borderColor: BRAND.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  roleChipActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
  roleChipText: { color: BRAND.text, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  roleChipTextActive: { color: '#ffffff' },
  menuCard: { gap: 0, paddingVertical: 4 },
  option: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 13 },
  optionDivider: { borderBottomColor: BRAND.border, borderBottomWidth: 1 },
  pressed: { opacity: 0.7 },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { color: BRAND.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  optionSubtitle: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 11 },
  payRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  payIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  payText: { color: BRAND.text, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  logout: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: BRAND.card,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  logoutText: { color: BRAND.red, fontFamily: 'Inter_700Bold', fontSize: 14 },
  deleteBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  deleteText: { color: '#b91c1c', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  version: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },
});
