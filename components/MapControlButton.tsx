import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

type MapControlButtonProps = {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
};

export function MapControlButton({ icon, onPress, accessibilityLabel }: MapControlButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Feather name={icon} size={20} color="#16362f" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 3,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#16362f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: 48,
  },
  pressed: { opacity: 0.75 },
});
