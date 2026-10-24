import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

export const LOGO_TEAL = '#17a9b1';
export const LOGO_NAVY = '#0b2545';

type Tone = 'dark' | 'light';

type Props = {
  size?: number;
  /** `dark`: texto y pin azul marino (fondos claros). `light`: blanco (fondos oscuros/fotos). */
  tone?: Tone;
};

function toneColors(tone: Tone) {
  return tone === 'light'
    ? { arc: '#3fd0d6', ink: '#ffffff' }
    : { arc: LOGO_TEAL, ink: LOGO_NAVY };
}

/** Logo completo INRIDEE (arcos + texto + pin). */
export function InrideMark({ size = 150, tone = 'dark' }: Props) {
  const { arc, ink } = toneColors(tone);
  return (
    <Svg width={size} height={size * 1.2} viewBox="112 76 292 350">
      <Path d="M 142 213 A 116 116 0 0 1 374 213" stroke={arc} strokeWidth={26} fill="none" />
      <Path d="M 182 213 A 76 76 0 0 1 334 213" stroke={arc} strokeWidth={21} fill="none" />
      <Rect x={207} y={199} width={20} height={9} fill={arc} />
      <Rect x={247} y={199} width={20} height={9} fill={arc} />
      <Rect x={287} y={199} width={20} height={9} fill={arc} />
      <SvgText
        x={257}
        y={264}
        fill={ink}
        fontSize={58}
        fontFamily="Inter_700Bold"
        fontWeight="800"
        textAnchor="middle"
        letterSpacing={3}
      >
        INRIDEE
      </SvgText>
      <Path
        d="M 194 286 A 104 104 0 0 0 320 286"
        stroke={ink}
        strokeWidth={20}
        fill="none"
      />
      <Path
        d="M 150 286 L 257 412 L 364 286"
        stroke={ink}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

type IconProps = {
  size?: number;
  arcColor?: string;
  pinColor?: string;
};

/** Pin sin texto, para encabezados pequeños. */
export function InrideIcon({ size = 28, arcColor = LOGO_TEAL, pinColor = LOGO_NAVY }: IconProps) {
  return (
    <Svg width={size} height={size * 1.15} viewBox="130 80 256 340">
      <G>
        <Path d="M 142 213 A 116 116 0 0 1 374 213" stroke={arcColor} strokeWidth={30} fill="none" />
        <Path d="M 186 213 A 72 72 0 0 1 330 213" stroke={arcColor} strokeWidth={26} fill="none" />
        <Path
          d="M 196 262 A 90 90 0 0 0 318 262"
          stroke={pinColor}
          strokeWidth={24}
          fill="none"
        />
        <Path
          d="M 150 262 L 257 404 L 364 262"
          stroke={pinColor}
          strokeWidth={28}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    </Svg>
  );
}

type WordmarkProps = IconProps & {
  textColor?: string;
};

export function InrideWordmark({
  size = 28,
  arcColor,
  pinColor,
  textColor = LOGO_NAVY,
}: WordmarkProps) {
  return (
    <View style={styles.wordmark}>
      <InrideIcon size={size} arcColor={arcColor} pinColor={pinColor} />
      <Text style={[styles.wordmarkText, { color: textColor, fontSize: size * 0.74 }]}>INRIDEE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  wordmarkText: { fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
});
