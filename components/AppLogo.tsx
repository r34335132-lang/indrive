import { Image, StyleSheet, View } from 'react-native';

const logoSource = require('@/assets/images/inride-logo.png');

export function AppLogo({ large = false }: { light?: boolean; large?: boolean }) {
  return (
    <View style={[styles.wrap, large && styles.wrapLarge]}>
      <Image source={logoSource} style={[styles.logo, large && styles.logoLarge]} resizeMode="contain" />
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
    height: 88,
    width: 88,
  },
  logo: {
    height: 48,
    width: 48,
  },
  logoLarge: {
    height: 88,
    width: 88,
  },
});
