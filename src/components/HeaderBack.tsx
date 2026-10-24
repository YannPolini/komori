import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Replaces the native back button, which stops responding after the first pop on iOS 26
// (Expo Go / react-native-screens 4.16). Falls back to Home when there is no history,
// e.g. after a cold start on a deep link.
export function HeaderBack() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={styles.touch}
    >
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
