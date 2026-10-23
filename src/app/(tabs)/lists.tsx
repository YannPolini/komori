import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { WATCH_STATUS_LABEL, type WatchStatus } from '../../features/catalog/types';
import { MOCK_STATUS } from '../../mock/anime';
import { colors, radius, shadow, spacing } from '../../theme';

const countOf = (s: WatchStatus) => Object.values(MOCK_STATUS).filter((v) => v === s).length;

const ROWS = [
  { key: 'plan', name: WATCH_STATUS_LABEL.plan, count: countOf('plan'), icon: 'bookmark-outline', builtIn: true },
  { key: 'watching', name: WATCH_STATUS_LABEL.watching, count: countOf('watching'), icon: 'play-circle-outline', builtIn: true },
  { key: 'watched', name: WATCH_STATUS_LABEL.watched, count: countOf('watched'), icon: 'checkmark-circle-outline', builtIn: true },
  { key: 'cozy', name: 'Cozy evenings', count: 2, icon: 'list-outline', builtIn: false },
] as const;

export default function Lists() {
  return (
    <FlatList
      data={ROWS}
      keyExtractor={(r) => r.key}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <Pressable style={styles.row} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.count} titles`}>
          <View style={styles.icon}>
            <Ionicons name={item.icon} size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sub}>{item.builtIn ? 'Built-in' : 'Custom list'}</Text>
          </View>
          <Text style={styles.count}>{item.count}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadow,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  count: { fontSize: 16, fontWeight: '700', color: colors.text },
});
