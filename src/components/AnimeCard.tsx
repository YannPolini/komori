import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WATCH_STATUS_LABEL, type Anime } from '../features/catalog/types';
import { useLibrary } from '../features/library/LibraryProvider';
import { colors, radius, shadow, spacing } from '../theme';
import { StatusBadge } from './StatusBadge';

interface Props {
  anime: Anime;
  width?: number;
}

export function AnimeCard({ anime, width }: Props) {
  const library = useLibrary();
  const status = library.state.status === 'ready' ? library.state.profile.statuses[anime.id] : undefined;
  const label = `${anime.title}${status ? `, ${WATCH_STATUS_LABEL[status]}` : ''}, open details`;

  // The save button is also offered as an accessibility action, because screen readers
  // treat the whole card as one element.
  return (
    <Link href={{ pathname: '/anime/[id]', params: { id: anime.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityActions={status ? [] : [{ name: 'quickSave', label: 'Add to Plan to watch' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'quickSave' && library.quickSave(anime.id)}
        style={StyleSheet.flatten([styles.card, width ? { width } : { flex: 1 }])}
      >
        <View style={styles.cover}>
          <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          {library.state.status === 'ready' && (
            <Pressable
              onPress={() => library.quickSave(anime.id)}
              disabled={!!status}
              accessibilityRole="button"
              accessibilityLabel={status ? `Saved as ${WATCH_STATUS_LABEL[status]}` : 'Add to Plan to watch'}
              hitSlop={6}
              style={styles.save}
            >
              <Ionicons name={status ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.primaryDark} />
            </Pressable>
          )}
          {anime.score != null && (
            <View style={styles.score}>
              <Ionicons name="star-outline" size={12} color={colors.text} />
              <Text style={styles.scoreText}>{anime.score.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {anime.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {anime.year ?? 'Date unknown'} · {anime.genres[0]}
          </Text>
          {status && (
            <View style={{ marginTop: spacing.xs }}>
              <StatusBadge status={status} />
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', ...shadow },
  cover: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: { fontSize: 12, fontWeight: '600', color: colors.text },
  body: { padding: spacing.sm + 2, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  save: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
