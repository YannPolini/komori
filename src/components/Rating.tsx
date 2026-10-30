import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RATING_MAX } from '../features/library/rules';
import { colors, spacing } from '../theme';

const STARS = Array.from({ length: RATING_MAX }, (_, i) => i + 1);

export const ratingLabel = (rating: number) => `Your rating ${rating} of ${RATING_MAX}`;

// The personal rating on cards and list rows. Filled stars keep it apart from the
// catalog score, which is shown as a number out of 10.
export function RatingStars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <View style={styles.stars} accessible accessibilityLabel={ratingLabel(rating)}>
      {STARS.map((n) => (
        <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={size} color={colors.warning} />
      ))}
    </View>
  );
}

interface InputProps {
  rating: number | undefined;
  onRate: (rating: number) => void;
  onClear: () => void;
}

// Sets, changes and clears a whole-number rating from 1 to 5.
export function RatingInput({ rating, onRate, onClear }: InputProps) {
  return (
    <View style={styles.input}>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Your rating">
        {STARS.map((n) => (
          <Pressable
            key={n}
            onPress={() => onRate(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: rating === n }}
            accessibilityLabel={`${n} of ${RATING_MAX} stars`}
            hitSlop={2}
            style={styles.star}
          >
            <Ionicons
              name={rating != null && n <= rating ? 'star' : 'star-outline'}
              size={30}
              color={rating != null && n <= rating ? colors.warning : colors.textMuted}
            />
          </Pressable>
        ))}
      </View>
      {rating != null && (
        <Pressable onPress={onClear} accessibilityRole="button" style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  input: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  clearText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
