import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {action ? <Text style={[styles.action, { color: colors.primary }]}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  copy: { flex: 1, gap: 3 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  action: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 2 },
});