import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkText}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
