import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { BarChart, DonutChart, HorizontalBars } from '@/components/admin/AdminCharts';
import { formatMoney } from '@/constants/pricing';
import { useColors } from '@/hooks/useColors';

const VEHICLE_COLORS = ['#138a68', '#16362f', '#e49339', '#3b6fd9'];

type AdminStats = {
  driverPayout: number;
  appRevenue: number;
  airportTrips: number;
  topTrips: Array<{ label: string; value: number }>;
  byVehicle: Array<{ label: string; value: number }>;
  statusData: Array<{ label: string; value: number }>;
  ratingData: Array<{ label: string; value: number }>;
  avgRating: number;
};

export function AdminDashboardCharts({
  stats,
  compact = false,
}: {
  stats: AdminStats;
  compact?: boolean;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const chartWidth = width - 72;

  return (
    <View style={styles.wrap}>
      <ChartCard title="Reparto de ingresos" subtitle="Conductor vs App" colors={colors}>
        <View style={[styles.donutRow, compact && styles.donutRowCompact]}>
          <DonutChart
            size={compact ? 130 : 150}
            segments={[
              { value: stats.driverPayout, color: '#16362f', label: 'Conductor' },
              { value: stats.appRevenue, color: '#138a68', label: 'App' },
            ]}
          />
          <View style={styles.legend}>
            <LegendItem color="#16362f" label="Conductores" value={formatMoney(stats.driverPayout)} />
            <LegendItem color="#138a68" label="INRIDE App" value={formatMoney(stats.appRevenue)} />
            <LegendItem
              color="#e49339"
              label="Peajes aeropuerto"
              value={String(stats.airportTrips)}
              suffix=" viajes"
            />
          </View>
        </View>
      </ChartCard>

      <ChartCard title="Top viajes por ingreso" subtitle="Los más rentables" colors={colors}>
        <BarChart
          width={chartWidth}
          data={stats.topTrips.length ? stats.topTrips : [{ label: '—', value: 0 }]}
        />
      </ChartCard>

      <ChartCard title="Calificaciones" subtitle={`Promedio ${stats.avgRating.toFixed(1)} ★`} colors={colors}>
        <HorizontalBars
          data={stats.ratingData}
          colors={['#e9a33f', '#f0b85c', '#f5d08a', '#d5e0d9', '#d5e0d9']}
        />
      </ChartCard>

      {!compact ? (
        <>
          <ChartCard title="Vehículos más usados" subtitle="Viajes completados" colors={colors}>
            <HorizontalBars data={stats.byVehicle} colors={VEHICLE_COLORS} />
          </ChartCard>

          <ChartCard title="Estado de viajes" subtitle="Distribución actual" colors={colors}>
            <HorizontalBars data={stats.statusData} colors={['#138a68', '#e49339', '#3b6fd9']} />
          </ChartCard>
        </>
      ) : null}
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  colors,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.chartTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.chartSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

function LegendItem({
  color,
  label,
  value,
  suffix = '',
}: {
  color: string;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendCopy}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={styles.legendValue}>
          {value}
          {suffix}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  chartCard: { borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 },
  chartTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  chartSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 4 },
  donutRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  donutRowCompact: { flexDirection: 'column' },
  legend: { flex: 1, gap: 12 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  legendDot: { borderRadius: 6, height: 12, width: 12 },
  legendCopy: { gap: 2 },
  legendLabel: { color: '#6b7f75', fontFamily: 'Inter_500Medium', fontSize: 11 },
  legendValue: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
