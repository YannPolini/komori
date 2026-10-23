import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WATCH_STATUS_LABEL, type Anime, type WatchStatus } from '../features/catalog/types';
import { colors, radius, shadow, spacing } from '../theme';

interface Props {
  anime: Anime;
  status?: WatchStatus;
  width?: number;
}

export function AnimeCard({ anime, status, width }: Props) {
  return (
    <Link href={{ pathname: '/anime/[id]', params: { id: anime.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${anime.title}, open details`}
        style={StyleSheet.flatten([styles.card, width ? { width } : { flex: 1 }])}
      >
        <View style={styles.cover}>
          <Ionicons name="image-outline" size={32} color={colors.textMuted} />
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{WATCH_STATUS_LABEL[status]}</Text>
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
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primaryDark },
});
