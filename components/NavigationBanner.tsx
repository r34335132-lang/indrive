import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatDistanceM,
  formatEtaMinutes,
  maneuverIcon,
  type ActiveGuidance,
} from '@/lib/navigation';

type Props = {
  guidance: ActiveGuidance | null;
  phaseLabel: string;
  destinationLabel: string;
  topInset: number;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  onRecenter?: () => void;
  navLocked?: boolean;
};

/** Banner estilo Uber/Google Maps: próxima maniobra + distancia. */
export function NavigationBanner({
  guidance,
  phaseLabel,
  destinationLabel,
  topInset,
  leftAction,
  rightAction,
  onRecenter,
  navLocked = true,
}: Props) {
  const icon = guidance
    ? maneuverIcon(guidance.step.type, guidance.step.modifier)
    : 'navigation';
  const dist = guidance ? formatDistanceM(guidance.distanceToManeuverM) : '—';
  const eta = guidance ? formatEtaMinutes(guidance.remainingSeconds) : '—';
  const remain = guidance ? formatDistanceM(guidance.remainingMeters) : '—';
  const instruction = guidance
    ? guidance.step.instruction
    : `Rumbo a ${destinationLabel}`;
  const nextLine = guidance?.nextStep
    ? `Luego: ${guidance.nextStep.shortInstruction}${
        guidance.nextStep.streetName ? ` · ${guidance.nextStep.streetName}` : ''
      }`
    : `Destino · ${remain} · ${eta}`;

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 6 }]} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.sideSlot}>{leftAction}</View>
        <View style={styles.sideSlotRight}>
          {onRecenter ? (
            <Pressable
              onPress={onRecenter}
              style={[styles.toolBtn, navLocked && styles.toolBtnOn]}
              hitSlop={6}
            >
              <Feather
                name={navLocked ? 'navigation' : 'move'}
                size={18}
                color={navLocked ? '#fff' : '#16362f'}
              />
            </Pressable>
          ) : null}
          {rightAction}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Feather name={icon} size={26} color="#fff" />
          <Text style={styles.dist}>{dist}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.phase}>{phaseLabel}</Text>
          <Text style={styles.instruction} numberOfLines={2}>
            {instruction}
          </Text>
          <Text style={styles.next} numberOfLines={1}>
            {nextLine}
          </Text>
        </View>
      </View>

      <View style={styles.etaRow}>
        <View style={styles.etaPill}>
          <Text style={styles.etaValue}>{eta}</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>
        <View style={styles.etaPill}>
          <Text style={styles.etaValue}>{remain}</Text>
          <Text style={styles.etaLabel}>Restante</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    left: 12,
    position: 'absolute',
    right: 12,
    top: 0,
    zIndex: 20,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  sideSlot: {
    alignItems: 'flex-start',
    minWidth: 42,
  },
  sideSlotRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    minWidth: 42,
  },
  toolBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: 42,
  },
  toolBtnOn: { backgroundColor: '#138a68' },
  card: {
    alignItems: 'center',
    backgroundColor: '#111b17',
    borderRadius: 18,
    elevation: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 14,
    gap: 2,
    justifyContent: 'center',
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dist: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  copy: { flex: 1, gap: 2 },
  phase: {
    color: '#8fd9bc',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  instruction: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  next: {
    color: '#a8b5ae',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  etaRow: { flexDirection: 'row', gap: 8 },
  etaPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(17,27,23,0.92)',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  etaValue: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  etaLabel: { color: '#8fd9bc', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});
