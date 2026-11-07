import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export function AccountInput({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} autoCapitalize="none" placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, fontSize: 16,
  },
});
