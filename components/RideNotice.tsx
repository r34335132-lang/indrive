import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

type NoticeTone = 'success' | 'info' | 'warning';

type RideNoticeProps = {
  visible: boolean;
  tone?: NoticeTone;
  icon?: keyof typeof Feather.glyphMap;
  eyebrow?: string;
  title: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

const TONE_COLORS: Record<NoticeTone, { gradient: [string, string]; soft: string; icon: string }> = {
  success: { gradient: ['#138a68', '#0f7458'], soft: '#e7f4ed', icon: '#138a68' },
  info: { gradient: ['#16362f', '#1f4f43'], soft: '#e8f1ff', icon: '#3b6fd9' },
  warning: { gradient: ['#d88d2e', '#b06d12'], soft: '#fff4e8', icon: '#d88d2e' },
};

export function RideNotice({
  visible,
  tone = 'success',
  icon = 'check-circle',
  eyebrow,
  title,
  message,
  details,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: RideNoticeProps) {
  const colors = useColors();
  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const toneColors = TONE_COLORS[tone];

  useEffect(() => {
    if (!visible) return;
    slide.setValue(48);
    fade.setValue(0);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [fade, scale, slide, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fade }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              transform: [{ translateY: slide }, { scale }],
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: toneColors.soft }]}>
            <Feather name={icon} size={28} color={toneColors.icon} />
          </View>

          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: toneColors.icon }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>

          {details?.length ? (
            <View style={[styles.details, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {details.map((item) => (
                <View key={item.label} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [styles.primaryWrap, pressed && styles.pressed]}
          >
            <LinearGradient colors={toneColors.gradient} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </LinearGradient>
          </Pressable>

          {secondaryLabel && onSecondary ? (
            <Pressable onPress={onSecondary} style={styles.secondaryBtn}>
              <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 54, 47, 0.55)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: 28,
    elevation: 12,
    gap: 10,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 28,
    height: 64,
    justifyContent: 'center',
    marginBottom: 4,
    width: 64,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  details: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
    padding: 14,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  detailValue: { flexShrink: 1, fontFamily: 'Inter_700Bold', fontSize: 12, textAlign: 'right' },
  primaryWrap: { borderRadius: 16, marginTop: 8, overflow: 'hidden' },
  primaryBtn: { alignItems: 'center', paddingVertical: 15 },
  primaryText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  pressed: { opacity: 0.88 },
});
