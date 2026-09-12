import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

type Segment = {
  value: number;
  color: string;
  label: string;
};

export function DonutChart({
  segments,
  size = 160,
  stroke = 22,
}: {
  segments: Segment[];
  size?: number;
  stroke?: number;
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.center}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e8f0ec"
          strokeWidth={stroke}
          fill="none"
        />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const circle = (
              <Circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                fill="none"
              />
            );
            offset += length;
            return circle;
          })}
        </G>
        <SvgText x={size / 2} y={size / 2 - 4} fontSize="11" fill="#6b7f75" textAnchor="middle">
          Total
        </SvgText>
        <SvgText
          x={size / 2}
          y={size / 2 + 14}
          fontSize="16"
          fontWeight="700"
          fill="#16362f"
          textAnchor="middle"
        >
          ${total.toFixed(0)}
        </SvgText>
      </Svg>
    </View>
  );
}

export function BarChart({
  data,
  height = 130,
  barColor = '#138a68',
  width = 300,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  barColor?: string;
  width?: number;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const gap = 12;
  const barWidth = (width - gap * (data.length - 1)) / Math.max(data.length, 1);

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height + 30}>
      {data.map((item, index) => {
        const barHeight = (item.value / max) * height;
        const x = index * (barWidth + gap);
        const y = height - barHeight;
        return (
          <G key={item.label}>
            <Rect x={x} y={y} width={barWidth} height={barHeight} rx={8} fill={barColor} opacity={0.9} />
            <SvgText x={x + barWidth / 2} y={height + 16} fontSize="9" fill="#6b7f75" textAnchor="middle">
              {item.label}
            </SvgText>
            <SvgText
              x={x + barWidth / 2}
              y={Math.max(y - 4, 10)}
              fontSize="9"
              fill="#16362f"
              textAnchor="middle"
              fontWeight="600"
            >
              ${item.value.toFixed(0)}
            </SvgText>
          </G>
        );
      })}
      <Line x1={0} y1={height} x2={width} y2={height} stroke="#d5e0d9" strokeWidth={1} />
      </Svg>
    </View>
  );
}

export function HorizontalBars({
  data,
  colors,
}: {
  data: Array<{ label: string; value: number }>;
  colors: string[];
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <View style={styles.barList}>
      {data.map((item, index) => {
        const pct = (item.value / max) * 100;
        return (
          <View key={item.label} style={styles.barRow}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={styles.barValue}>{item.value}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { backgroundColor: colors[index % colors.length], width: `${pct}%` },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  chartWrap: { alignItems: 'center', width: '100%' },
  barList: { gap: 12 },
  barRow: { gap: 6 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: '#4a5c55', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  barValue: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 12 },
  barTrack: { backgroundColor: '#e8f0ec', borderRadius: 8, height: 10, overflow: 'hidden' },
  barFill: { borderRadius: 8, height: 10 },
});
