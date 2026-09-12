import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DRIVER_DOCUMENTS } from '@/constants/mocks';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function RegisterDriverScreen() {
  const colors = useColors();
  const router = useRouter();
  const { driverDocs, docsComplete, toggleDocument, setAllDocumentsUploaded, logout } = useAuth();

  const uploadedCount = (['ineFront', 'ineBack', 'license', 'circulation', 'insurance'] as const).filter(
    (k) => driverDocs[k],
  ).length;

  const finish = () => {
    if (!docsComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/driver');
  };

  const mockUploadAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setAllDocumentsUploaded();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={async () => {
              await logout();
              router.replace('/');
            }}
            style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>REGISTRO CONDUCTOR</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Documentos</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <LinearGradient colors={['#16362f', '#138a68']} style={styles.banner}>
          <Text style={styles.bannerTitle}>Verificación inride</Text>
          <Text style={styles.bannerCopy}>
            Marca cada documento como cargado para activar el modo conductor. Luego podrás recibir
            viajes en tiempo real.
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(uploadedCount / 5) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{uploadedCount}/5</Text>
          </View>
        </LinearGradient>

        <View style={styles.list}>
          {DRIVER_DOCUMENTS.map((doc) => {
            const done = driverDocs[doc.key];
            return (
              <Pressable
                key={doc.key}
                testID={`doc-${doc.key}`}
                onPress={async () => {
                  Haptics.selectionAsync();
                  await toggleDocument(doc.key);
                }}
                style={({ pressed }) => [
                  styles.docCard,
                  {
                    backgroundColor: done ? colors.secondary : colors.card,
                    borderColor: done ? colors.primary : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.docIcon,
                    { backgroundColor: done ? colors.primary : colors.muted },
                  ]}
                >
                  <Feather name={doc.icon} size={18} color={done ? '#ffffff' : colors.primary} />
                </View>
                <View style={styles.docCopy}>
                  <Text style={[styles.docTitle, { color: colors.foreground }]}>{doc.title}</Text>
                  <Text style={[styles.docSubtitle, { color: colors.mutedForeground }]}>
                    {doc.subtitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.check,
                    {
                      backgroundColor: done ? colors.primary : colors.muted,
                      borderColor: done ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {done ? <Feather name="check" size={14} color="#ffffff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={mockUploadAll}
          style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather name="upload" size={16} color={colors.primary} />
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
            Simular carga de todos los documentos
          </Text>
        </Pressable>

        <Pressable
          testID="finish-driver-register"
          onPress={finish}
          disabled={!docsComplete}
          style={({ pressed }) => [
            styles.primaryBtnWrap,
            !docsComplete && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={docsComplete ? ['#138a68', '#0f7458'] : ['#c5d5cc', '#b8c8bf']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>
              {docsComplete ? 'Continuar al centro del conductor' : 'Completa los 5 documentos'}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 16, paddingBottom: 36, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  back: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  banner: { borderRadius: 22, gap: 8, overflow: 'hidden', padding: 18 },
  bannerTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 18 },
  bannerCopy: { color: '#c5edda', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 8 },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#ffffff', height: '100%' },
  progressText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  list: { gap: 10 },
  docCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  docIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  docCopy: { flex: 1, gap: 3 },
  docTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  docSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  check: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  secondaryBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  primaryBtnWrap: { borderRadius: 16, overflow: 'hidden' },
  primaryBtn: { alignItems: 'center', paddingVertical: 16 },
  primaryBtnText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  disabled: { opacity: 0.9 },
  pressed: { opacity: 0.85 },
});
