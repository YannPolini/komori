import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { ScreenState } from '../../components/ScreenState';
import { SectionHeader } from '../../components/SectionHeader';
import { fuzzyDate, today } from '../../features/catalog/dates';
import { newReleasesFeed, upcomingFeed, type Feed } from '../../features/catalog/feeds';
import { useFeed, useGenres } from '../../features/catalog/useCatalog';
import { useLibrary } from '../../features/library/LibraryProvider';
import { reasonLabel, reasonText } from '../../features/recommendations/scoring';
import { useRecommendations } from '../../features/recommendations/useRecommendations';
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

// Up to four suggestions, each with the reason it was picked.
function Suggestions() {
  const state = useRecommendations();
  const library = useLibrary();
  const noGenres = library.state.status === 'ready' && library.state.profile.genres.length === 0;
  if (state.status === 'loading') return <ScreenState kind="loading" />;
  if (state.status === 'error') {
    return <ScreenState kind="error" message="Suggestions could not be loaded." onRetry={state.retry} />;
  }
  return (
    <>
      {noGenres && (
        <Pressable onPress={() => router.push('/account')} accessibilityRole="link" style={styles.hint}>
          <Text style={styles.hintText}>Pick your favorite genres in Account for better suggestions.</Text>
        </Pressable>
      )}
      {state.suggestions.length === 0 ? (
        <Text style={styles.empty}>No new suggestions right now. You already track every suitable title.</Text>
      ) : (
        <FlatList
          horizontal
          data={state.suggestions}
          keyExtractor={(s) => String(s.anime.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
          renderItem={({ item }) => (
            <AnimeCard
              anime={item.anime}
              width={140}
              note={{ text: reasonText(item.reason), label: reasonLabel(item.reason) }}
            />
          )}
        />
      )}
    </>
  );
}

// Genre shortcuts on Home, shown when the catalog offers them.
const HOME_GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance'];

const openDiscover = (mode: DiscoverMode, genre = '') =>
  router.navigate({ pathname: '/discover', params: { mode, genre, q: '' } });

export default function Home() {
  const day = fuzzyDate(today());
  const feeds = useMemo(
    () => ({
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
      <Suggestions />

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
  hint: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  hintText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  empty: { fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.md },
});
