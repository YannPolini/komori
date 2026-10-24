import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LIST_NAME_MAX } from '../features/library/rules';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  initialName?: string;
  submitLabel: string;
  // Returns an error message to show, or null when the name was saved.
  onSubmit: (name: string) => string | null;
  onCancel: () => void;
  onDelete?: () => void;
}

export function ListNameDialog({ visible, title, initialName = '', submitLabel, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
    }
  }, [visible, initialName]);

  const submit = () => setError(onSubmit(name));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            onSubmitEditing={submit}
            placeholder="List name"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="List name"
            accessibilityHint={`1 to ${LIST_NAME_MAX} characters`}
            autoFocus
            returnKeyType="done"
            style={[styles.input, error != null && { borderColor: colors.danger }]}
          />
          <View style={styles.hintRow}>
            <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {error ?? ''}
            </Text>
            <Text style={styles.counter}>
              {[...name.trim()].length}/{LIST_NAME_MAX}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button label="Cancel" variant="outline" onPress={onCancel} />
            <Button label={submitLabel} onPress={submit} />
          </View>
          {onDelete && (
            <Pressable onPress={onDelete} accessibilityRole="button" style={styles.delete}>
              <Text style={styles.deleteText}>Delete list</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  hintRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  error: { flex: 1, fontSize: 13, color: colors.danger },
  counter: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  delete: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  deleteText: { fontSize: 16, fontWeight: '600', color: colors.danger },
});
