import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceM, maneuverGlyph, type ActiveGuidance } from '@/lib/navigation';

type Props = {
  guidance: ActiveGuidance | null;
  destinationLabel: string;
  topInset: number;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  onRecenter?: () => void;
  navLocked?: boolean;
};

/** Banner de navegación estilo Google Maps: flecha de giro, distancia y calle. */
export function NavigationBanner({
  guidance,
  destinationLabel,
  topInset,
  leftAction,
  rightAction,
  onRecenter,
  navLocked = true,
}: Props) {
  const step = guidance?.step;
  const arriving = step?.type === 'arrive';
  const glyph = step ? maneuverGlyph(step.type, step.modifier) : 'navigation-variant';
  const dist = guidance ? formatDistanceM(guidance.distanceToManeuverM) : '';
  const title = !step
    ? 'Calculando ruta…'
    : arriving
      ? destinationLabel
      : step.streetName || step.instruction;
  const subtitle = !step
    ? `Hacia ${destinationLabel}`
    : arriving
      ? 'Llegas a tu destino'
      : step.streetName
        ? step.shortInstruction
        : null;
  const next = guidance?.nextStep;
  const showNext = Boolean(next) && !arriving && (guidance?.distanceToManeuverM ?? 9999) < 400;

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 6 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <MaterialCommunityIcons name={glyph} size={48} color="#fff" />
        <View style={styles.copy}>
          {dist ? <Text style={styles.dist}>{dist}</Text> : null}
          <Text style={styles.street} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.sub} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {showNext && next ? (
        <View style={styles.thenTab}>
          <Text style={styles.thenText}>Luego</Text>
          <MaterialCommunityIcons
            name={maneuverGlyph(next.type, next.modifier)}
            size={20}
            color="#fff"
          />
        </View>
      ) : null}

      <View style={styles.controls} pointerEvents="box-none">
        <View>{leftAction}</View>
        <View style={styles.rightCol}>
          {rightAction}
          {onRecenter ? (
            <Pressable
              onPress={onRecenter}
              style={[styles.toolBtn, !navLocked && styles.toolBtnFree]}
              hitSlop={6}
            >
              <Feather
                name={navLocked ? 'navigation' : 'crosshair'}
                size={18}
                color={navLocked ? '#1a73e8' : '#fff'}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 10,
    position: 'absolute',
    right: 10,
    top: 0,
    zIndex: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 18,
    elevation: 10,
    flexDirection: 'row',
    gap: 14,
    minHeight: 92,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  copy: { flex: 1, gap: 1 },
  dist: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    letterSpacing: -0.6,
  },
  street: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  sub: {
    color: '#b8c2bd',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  thenTab: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    flexDirection: 'row',
    gap: 8,
    marginLeft: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  thenText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  controls: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rightCol: { alignItems: 'center', gap: 10 },
  toolBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    width: 48,
  },
  toolBtnFree: { backgroundColor: '#1a73e8' },
});
