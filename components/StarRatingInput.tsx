import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!'];

export const RATING_TAGS = ['Puntual', 'Amable', 'Auto limpio', 'Buena ruta', 'Manejo seguro'];

export function StarRatingInput({
  value,
  onChange,
  size = 38,
  disabled,
}: {
  value: number;
  onChange: (stars: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((star) => {
          const on = star <= value;
          return (
            <Pressable
              key={star}
              disabled={disabled}
              hitSlop={6}
              accessibilityLabel={`${star} estrella${star === 1 ? '' : 's'}`}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(star);
              }}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}
            >
              <Feather
                name="star"
                size={size}
                color={on ? '#f2b544' : '#d5e0d9'}
                style={on ? styles.starOn : undefined}
              />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>{value ? LABELS[value] : 'Toca una estrella'}</Text>
    </View>
  );
}

export function RatingTags({
  selected,
  onToggle,
  disabled,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.tags}>
      {RATING_TAGS.map((tag) => {
        const on = selected.includes(tag);
        return (
          <Pressable
            key={tag}
            disabled={disabled}
            onPress={() => onToggle(tag)}
            style={[styles.tag, on && styles.tagOn]}
          >
            <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  starOn: {
    textShadowColor: 'rgba(242,181,68,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  label: { color: '#5c6b64', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: {
    backgroundColor: '#f1f5f3',
    borderColor: '#dfe8e3',
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagOn: { backgroundColor: '#e3f4ec', borderColor: '#138a68' },
  tagText: { color: '#4b5a53', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  tagTextOn: { color: '#0f7458' },
});
