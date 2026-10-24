import { StyleSheet, View } from 'react-native';
import { InrideMark } from '@/components/InrideMark';

export function AppLogo({ light = false, large = false }: { light?: boolean; large?: boolean }) {
  const size = large ? 76 : 40;
  return (
    <View style={[styles.wrap, large && styles.wrapLarge]}>
      <InrideMark size={size} tone={light ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  wrapLarge: {
    height: 92,
    width: 88,
  },
});
