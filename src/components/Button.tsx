import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}

export function Button({ label, onPress, variant = 'primary' }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.label, { color: primary ? '#fff' : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary },
  label: { fontSize: 16, fontWeight: '600' },
});
