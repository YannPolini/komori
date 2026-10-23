import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

// Plain-view header: the native iOS header wraps its items in a glass capsule.
export function AppHeader() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: top }]}>
      <Pressable
        onPress={() => router.navigate('/')}
        accessibilityRole="button"
        accessibilityLabel="Komori, go to Home"
        style={styles.touch}
      >
        <Text style={styles.logo}>Komori</Text>
      </Pressable>
      <Link href="/account" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Account" style={styles.touch}>
          <Ionicons name="person-circle-outline" size={28} color={colors.text} />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  touch: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  logo: { fontSize: 22, fontWeight: '800', color: colors.primary },
});
