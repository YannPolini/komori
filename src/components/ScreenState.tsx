import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Button } from './Button';

type Props =
  | { kind: 'loading' }
  | { kind: 'empty'; message: string; action?: { label: string; onPress: () => void } }
  | { kind: 'error'; message: string; onRetry: () => void };

export function ScreenState(props: Props) {
  if (props.kind === 'loading') {
    return (
      <View style={styles.box} accessibilityLabel="Loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  const error = props.kind === 'error';
  return (
    <View style={styles.box}>
      <Ionicons
        name={error ? 'cloud-offline-outline' : 'search-outline'}
        size={44}
        color={error ? colors.danger : colors.textMuted}
      />
      <Text style={styles.message}>{props.message}</Text>
      {props.kind === 'error' && <Button label="Retry" onPress={props.onRetry} />}
      {props.kind === 'empty' && props.action && <Button label={props.action.label} onPress={props.action.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  message: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
