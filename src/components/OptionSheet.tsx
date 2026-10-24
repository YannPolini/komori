import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  options: { key: string; label: string }[];
  onSelect: (key: string) => void;
  onCancel: () => void;
}

// Bottom sheet with one button per option, e.g. the target list for a move.
export function OptionSheet({ visible, title, options, onSelect, onCancel }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: bottom + spacing.md }]}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {options.map((o) => (
          <Pressable key={o.key} onPress={() => onSelect(o.key)} accessibilityRole="button" style={styles.option}>
            <Text style={styles.optionText}>{o.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onCancel} accessibilityRole="button" style={styles.option}>
          <Text style={[styles.optionText, { color: colors.textMuted }]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  option: { minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  optionText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
