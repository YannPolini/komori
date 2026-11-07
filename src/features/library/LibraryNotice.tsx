import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../../services/connectivity';
import { colors, spacing } from '../../theme';
import { useLibrary } from './LibraryProvider';

export function LibraryNotice() {
  const { saveError, dismissSaveError } = useLibrary();
  const offline = useOffline();
  const insets = useSafeAreaInsets();
  if (!saveError && !offline) return null;
  return (
    <View style={[styles.notice, { paddingBottom: insets.bottom + spacing.sm }]}>
      <Text accessibilityLiveRegion="polite" style={[styles.message, saveError && { color: colors.danger }]}>
        {saveError ? 'Your last change could not be saved. Try it again.' : 'Offline. Saved titles and lists are still available.'}
      </Text>
      {saveError && (
        <Pressable accessibilityRole="button" onPress={dismissSaveError} hitSlop={8}>
          <Text style={styles.message}>Dismiss</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.sm, backgroundColor: colors.primarySoft },
  message: { color: colors.text, fontSize: 13 },
});
