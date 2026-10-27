import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RatingTags, StarRatingInput } from '@/components/StarRatingInput';

export function RateDriverModal({
  visible,
  driverName,
  driverPhotoUrl,
  subtitle,
  onSubmit,
  onSkip,
}: {
  visible: boolean;
  driverName: string;
  driverPhotoUrl?: string | null;
  subtitle?: string;
  onSubmit: (stars: number, comment: string) => Promise<void>;
  onSkip: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStars(0);
    setTags([]);
    setError(null);
  }, [visible]);

  const submit = async () => {
    if (!stars || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(stars, tags.join(', '));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  };

  const initials = driverName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']} style={styles.content}>
            <View style={styles.handle} />
            <Pressable onPress={onSkip} style={styles.close} hitSlop={10} disabled={busy}>
              <Feather name="x" size={20} color="#6d7c75" />
            </Pressable>

            <View style={styles.avatar}>
              {driverPhotoUrl ? (
                <Image source={{ uri: driverPhotoUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{initials || 'IR'}</Text>
              )}
            </View>
            <Text style={styles.title}>¿Cómo estuvo tu viaje?</Text>
            <Text style={styles.sub}>
              Califica a {driverName || 'tu conductor'}
              {subtitle ? ` · ${subtitle}` : ''}
            </Text>

            <StarRatingInput value={stars} onChange={setStars} disabled={busy} />
            {stars ? (
              <RatingTags
                selected={tags}
                disabled={busy}
                onToggle={(tag) =>
                  setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]))
                }
              />
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => void submit()}
              disabled={!stars || busy}
              style={[styles.primary, (!stars || busy) && { opacity: 0.5 }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enviar calificación</Text>}
            </Pressable>
            <Pressable onPress={onSkip} disabled={busy} style={styles.skip}>
              <Text style={styles.skipText}>Ahora no</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(8,20,16,0.55)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  content: { alignItems: 'center', gap: 14, paddingBottom: 12, paddingHorizontal: 22, paddingTop: 10 },
  handle: { backgroundColor: '#dfe8e3', borderRadius: 3, height: 5, width: 44 },
  close: { position: 'absolute', right: 18, top: 16 },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#e3f4ec',
    borderRadius: 40,
    height: 72,
    justifyContent: 'center',
    marginTop: 8,
    overflow: 'hidden',
    width: 72,
  },
  avatarImg: { height: '100%', width: '100%' },
  avatarText: { color: '#0f7458', fontFamily: 'Inter_700Bold', fontSize: 24 },
  title: { color: '#10221c', fontFamily: 'Inter_700Bold', fontSize: 20 },
  sub: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: -8, textAlign: 'center' },
  error: { color: '#d64545', fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'center' },
  primary: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#138a68',
    borderRadius: 16,
    marginTop: 4,
    paddingVertical: 15,
  },
  primaryText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  skip: { padding: 6 },
  skipText: { color: '#6d7c75', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
