import { Image, StyleSheet, View } from 'react-native';

export function AppLogo({ light = false }: { light?: boolean }) {
  return (
    <View style={[styles.logoBox, { backgroundColor: light ? '#16362f' : '#111b17' }]}>
      <Image
        accessibilityLabel="INRAID"
        source={require('@/assets/images/logo-inraid.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoBox: { alignItems: 'center', borderRadius: 10, height: 34, justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 8, width: 86 },
  logoImage: { height: 31, width: 70 },
});