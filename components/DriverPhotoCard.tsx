import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BRAND, cardShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export function DriverPhotoCard({ compact = false }: { compact?: boolean }) {
  const { user, uploadPhoto } = useAuth();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarUrl = user?.avatarUrl;

  const pick = async (source: 'camera' | 'library') => {
    if (busy) return;
    setError(null);
    setBusy(source);
    try {
      await uploadPhoto(source);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir la foto';
      if (msg !== 'CANCELLED') setError(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{user?.initials ?? 'IR'}</Text>
          )}
          {busy ? (
            <View style={styles.avatarBusy}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title}>Foto de perfil</Text>
          <Text style={styles.sub}>
            {avatarUrl
              ? 'Los pasajeros te verán al aceptar su viaje.'
              : 'Sube una foto clara de tu rostro. Los pasajeros la verán al aceptar su viaje.'}
          </Text>
        </View>
        {avatarUrl ? (
          <View style={styles.ok}>
            <Feather name="check" size={14} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.buttons}>
        <Pressable
          onPress={() => void pick('camera')}
          disabled={Boolean(busy)}
          style={({ pressed }) => [styles.btn, styles.btnMain, pressed && styles.pressed]}
        >
          <Feather name="camera" size={16} color="#fff" />
          <Text style={styles.btnMainText}>{avatarUrl ? 'Nueva selfie' : 'Tomar selfie'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void pick('library')}
          disabled={Boolean(busy)}
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
        >
          <Feather name="image" size={16} color={BRAND.primary} />
          <Text style={styles.btnGhostText}>Elegir foto</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardShadow,
    backgroundColor: '#fff',
    borderRadius: 20,
    gap: 14,
    padding: 16,
  },
  cardCompact: { padding: 14 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  avatar: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderColor: '#fff',
    borderRadius: 34,
    borderWidth: 3,
    height: 68,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 68,
    ...cardShadow,
  },
  avatarImg: { height: '100%', width: '100%' },
  avatarText: { color: BRAND.primary, fontFamily: 'Inter_700Bold', fontSize: 20 },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  title: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 15 },
  sub: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  ok: {
    alignItems: 'center',
    backgroundColor: BRAND.green,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    justifyContent: 'center',
  },
  btnMain: { backgroundColor: BRAND.primary },
  btnMainText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  btnGhost: { backgroundColor: BRAND.mint },
  btnGhostText: { color: BRAND.primary, fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.8 },
  error: { color: BRAND.red, fontFamily: 'Inter_500Medium', fontSize: 12 },
});
