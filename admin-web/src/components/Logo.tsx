export const LOGO_TEAL = '#17a9b1';
export const LOGO_NAVY = '#0b2545';

type Tone = 'dark' | 'light';

function colors(tone: Tone) {
  return tone === 'light' ? { arc: '#3fd0d6', ink: '#ffffff' } : { arc: LOGO_TEAL, ink: LOGO_NAVY };
}

/** Logo completo INRIDEE (arcos + texto + pin). */
export function InrideMark({ size = 150, tone = 'dark' }: { size?: number; tone?: Tone }) {
  const { arc, ink } = colors(tone);
  return (
    <svg width={size} height={size * 1.2} viewBox="112 76 292 350" aria-label="INRIDEE">
      <path d="M 142 213 A 116 116 0 0 1 374 213" stroke={arc} strokeWidth={26} fill="none" />
      <path d="M 182 213 A 76 76 0 0 1 334 213" stroke={arc} strokeWidth={21} fill="none" />
      <rect x={207} y={199} width={20} height={9} fill={arc} />
      <rect x={247} y={199} width={20} height={9} fill={arc} />
      <rect x={287} y={199} width={20} height={9} fill={arc} />
      <text
        x={257}
        y={264}
        fill={ink}
        fontSize={58}
        fontWeight={800}
        textAnchor="middle"
        letterSpacing={3}
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
      >
        INRIDEE
      </text>
      <path d="M 194 286 A 104 104 0 0 0 320 286" stroke={ink} strokeWidth={20} fill="none" />
      <path
        d="M 150 286 L 257 412 L 364 286"
        stroke={ink}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Pin sin texto. */
export function InrideIcon({
  size = 28,
  arcColor = LOGO_TEAL,
  pinColor = LOGO_NAVY,
}: {
  size?: number;
  arcColor?: string;
  pinColor?: string;
}) {
  return (
    <svg width={size} height={size * 1.15} viewBox="130 80 256 340" aria-hidden>
      <path d="M 142 213 A 116 116 0 0 1 374 213" stroke={arcColor} strokeWidth={30} fill="none" />
      <path d="M 186 213 A 72 72 0 0 1 330 213" stroke={arcColor} strokeWidth={26} fill="none" />
      <path d="M 196 262 A 90 90 0 0 0 318 262" stroke={pinColor} strokeWidth={24} fill="none" />
      <path
        d="M 150 262 L 257 404 L 364 262"
        stroke={pinColor}
        strokeWidth={28}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
