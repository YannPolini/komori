import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.outline,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
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
