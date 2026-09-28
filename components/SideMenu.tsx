import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export type SideMenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  badge?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  rating?: number;
  items: SideMenuItem[];
};

export function SideMenu({ visible, onClose, title, subtitle, rating, items }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Feather name="user" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
            ) : null}
            {typeof rating === 'number' ? (
              <Text style={[styles.rating, { color: colors.foreground }]}>
                {rating.toFixed(2)} ★
              </Text>
            ) : null}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
              >
                <Feather name={item.icon} size={20} color={colors.foreground} />
                <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                {item.badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{item.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    position: 'absolute',
    top: 0,
    width: '78%',
  },
  header: { gap: 4, marginBottom: 18, paddingBottom: 16 },
  avatar: {
    alignItems: 'center',
    borderRadius: 36,
    height: 64,
    justifyContent: 'center',
    marginBottom: 10,
    width: 64,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  rating: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 4 },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
  },
  itemLabel: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});
