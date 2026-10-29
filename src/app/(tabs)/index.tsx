import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { ScreenState } from '../../components/ScreenState';
import { SectionHeader } from '../../components/SectionHeader';
import { fuzzyDate, today } from '../../features/catalog/dates';
import { newReleasesFeed, searchFeed, upcomingFeed, type Feed } from '../../features/catalog/feeds';
import { useFeed, useGenres } from '../../features/catalog/useCatalog';
import { colors, radius, spacing } from '../../theme';
import type { DiscoverMode } from './discover';

// A preview of the first titles of a feed, with its own loading and error state.
function FeedRow<C>({ feed, count }: { feed: Feed<C>; count: number }) {
  const state = useFeed(feed);
  if (state.status === 'loading') return <ScreenState kind="loading" />;
  if (state.status === 'error') {
    return <ScreenState kind="error" message="Titles could not be loaded." onRetry={state.retry} />;
  }
  if (!state.items.length) return <Text style={styles.empty}>No titles right now.</Text>;
  return (
    <FlatList
      horizontal
      data={state.items.slice(0, count)}
      keyExtractor={(a) => String(a.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      renderItem={({ item }) => <AnimeCard anime={item} width={140} />}
    />
  );
}

// Genre shortcuts on Home, shown when the catalog offers them.
const HOME_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance'];

const openDiscover = (mode: DiscoverMode, genre = '') =>
  router.navigate({ pathname: '/discover', params: { mode, genre, q: '' } });

export default function Home() {
  const day = fuzzyDate(today());
  // Suggestions come with the recommendations issue. Until then Home shows popular titles,
  // the same feed as the default Discover search.
  const feeds = useMemo(
    () => ({
      popular: searchFeed({ query: '', genre: null, sort: 'popularity' }),
      releases: newReleasesFeed(today()),
      upcoming: upcomingFeed(today()),
    }),
    [day],
  );
  const genres = useGenres();
  const shortcuts = genres.status === 'ready' ? HOME_GENRES.filter((g) => genres.genres.includes(g)) : [];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Pressable
        style={styles.search}
        accessibilityRole="search"
        accessibilityLabel="Search anime"
        onPress={() => openDiscover('search')}
      >
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <Text style={styles.searchText}>Search anime</Text>
      </Pressable>

      <SectionHeader title="Suggested for you" />
      <FeedRow feed={feeds.popular} count={4} />

      <SectionHeader title="New releases" onSeeAll={() => openDiscover('new')} />
      <FeedRow feed={feeds.releases} count={3} />

      <SectionHeader title="Upcoming" onSeeAll={() => openDiscover('upcoming')} />
      <FeedRow feed={feeds.upcoming} count={3} />

      <SectionHeader title="Genres" />
      {genres.status === 'error' && (
        <ScreenState kind="error" message="Genres could not be loaded." onRetry={genres.retry} />
      )}
      <View style={styles.chips}>
        {shortcuts.map((g) => (
          <Pressable
            key={g}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${g}`}
            onPress={() => openDiscover('search', g)}
          >
            <Text style={styles.chipText}>{g}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: { fontSize: 16, color: colors.textMuted },
  rowContent: { paddingHorizontal: spacing.md, gap: spacing.md, paddingBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  empty: { fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.md },
});
