import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';

type Props = {
  tone?: 'light' | 'dark' | 'muted';
  center?: boolean;
};

export function LegalLinks({ tone = 'muted', center }: Props) {
  const color = tone === 'light' ? '#c5edda' : tone === 'dark' ? '#16362f' : '#6d7c75';

  return (
    <View style={[styles.wrap, center && styles.center]}>
      <Pressable onPress={() => void Linking.openURL(TERMS_URL)} hitSlop={6}>
        <Text style={[styles.link, { color }]}>Términos y condiciones</Text>
      </Pressable>
      <Text style={[styles.dot, { color }]}>·</Text>
      <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)} hitSlop={6}>
        <Text style={[styles.link, { color }]}>Privacidad</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  center: { justifyContent: 'center' },
  link: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  dot: { fontFamily: 'Inter_400Regular', fontSize: 12 },
});
