import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';

export default function Account() {
  return (
    <View style={styles.container}>
      <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
      <Text style={styles.title}>You are not signed in</Text>
      <Text style={styles.sub}>Sign in to keep your lists and ratings on every device.</Text>
      <Button label="Sign in" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
});
