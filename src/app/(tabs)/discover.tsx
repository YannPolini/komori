import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { OptionSheet } from '../../components/OptionSheet';
import { ScreenState } from '../../components/ScreenState';
import { SearchField } from '../../components/SearchField';
import { fuzzyDate, today } from '../../features/catalog/dates';
import { newReleasesFeed, searchFeed, upcomingFeed, type Feed } from '../../features/catalog/feeds';
import { CATALOG_SORT_LABEL, type CatalogSort } from '../../features/catalog/types';
import { useDebouncedValue, useFeed, useGenres } from '../../features/catalog/useCatalog';
import { colors, radius, spacing } from '../../theme';

export type DiscoverMode = 'search' | 'new' | 'upcoming';

// Mode, query, genre and sort live in the route, so Home can open Discover with them
// and going back from Details restores them.
type Params = { mode?: DiscoverMode; q?: string; genre?: string; sort?: CatalogSort };

const MODES: { mode: DiscoverMode; label: string }[] = [
  { mode: 'search', label: 'Search' },
  { mode: 'new', label: 'New releases' },
  { mode: 'upcoming', label: 'Upcoming' },
];

const EMPTY_MESSAGE: Record<DiscoverMode, string> = {
  search: 'No titles match your search.',
  new: 'No titles premiered in the last 30 days.',
  upcoming: 'No upcoming titles are announced.',
};

const SORTS = Object.keys(CATALOG_SORT_LABEL) as CatalogSort[];

export default function Discover() {
  const params = useLocalSearchParams<Params>();
  const mode: DiscoverMode = params.mode === 'new' || params.mode === 'upcoming' ? params.mode : 'search';
  const query = params.q ?? '';
  const genre = params.genre || null;
  const sort: CatalogSort = params.sort && params.sort in CATALOG_SORT_LABEL ? params.sort : 'popularity';

  // The field updates at once, the search 400 ms after typing stops.
  const [text, setText] = useState(query);
  const debounced = useDebouncedValue(text, 400);
  useEffect(() => {
    if (debounced.trim() !== query.trim()) router.setParams({ q: debounced });
  }, [debounced]);
  useEffect(() => setText((t) => (t.trim() === query.trim() ? t : query)), [query]);

  const day = fuzzyDate(today());
  const feed = useMemo<Feed<unknown>>(() => {
    if (mode === 'new') return newReleasesFeed(today());
    if (mode === 'upcoming') return upcomingFeed(today());
    return searchFeed({ query, genre, sort });
    // `day` renews the release feeds after midnight.
  }, [mode, query, genre, sort, day]);
  const results = useFeed(feed);
  const genres = useGenres();
  const [sorting, setSorting] = useState(false);

  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.md * 3) / 2;

  const footer =
    results.status !== 'ready' || !results.hasMore ? null : results.loadingMore ? (
      <ActivityIndicator color={colors.primary} style={styles.footer} accessibilityLabel="Loading more titles" />
    ) : results.loadMoreFailed ? (
      <View style={styles.footer}>
        <Text style={styles.footerError}>More titles could not be loaded.</Text>
        <Button label="Retry" onPress={results.retry} />
      </View>
    ) : (
      <View style={styles.footer}>
        <Button label="Load more" variant="outline" onPress={results.loadMore} />
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MODES.map((m) => (
            <Chip key={m.mode} label={m.label} selected={m.mode === mode} onPress={() => router.setParams({ mode: m.mode })} />
          ))}
        </ScrollView>
      </View>

      {mode === 'search' && (
        <>
          <SearchField value={text} onChangeText={setText} placeholder="Search anime" />
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Pressable
                onPress={() => setSorting(true)}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${CATALOG_SORT_LABEL[sort]}`}
                style={styles.sort}
              >
                <Ionicons name="swap-vertical-outline" size={18} color={colors.text} />
                <Text style={styles.sortText}>{CATALOG_SORT_LABEL[sort]}</Text>
              </Pressable>
              {genres.status === 'ready' &&
                genres.genres.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    selected={g === genre}
                    onPress={() => router.setParams({ genre: g === genre ? '' : g })}
                  />
                ))}
              {genres.status === 'error' && <Chip label="Load genres" selected={false} onPress={genres.retry} />}
            </ScrollView>
          </View>
        </>
      )}

      {results.status === 'loading' && <ScreenState kind="loading" />}
      {results.status === 'error' && (
        <ScreenState kind="error" message="Titles could not be loaded." onRetry={results.retry} />
      )}
      {results.status === 'ready' && (
        <FlatList
          data={results.items}
          keyExtractor={(a) => String(a.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.grid}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => <AnimeCard anime={item} width={cardWidth} />}
          ListEmptyComponent={<ScreenState kind="empty" message={EMPTY_MESSAGE[mode]} />}
          ListFooterComponent={footer}
        />
      )}

      <OptionSheet
        visible={sorting}
        title="Sort by"
        options={SORTS.map((s) => ({ key: s, label: CATALOG_SORT_LABEL[s] }))}
        onSelect={(key) => {
          router.setParams({ sort: key });
          setSorting(false);
        }}
        onCancel={() => setSorting(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.xs },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  sortText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  grid: { padding: spacing.md, gap: spacing.md },
  footer: { alignItems: 'stretch', gap: spacing.sm, paddingTop: spacing.sm },
  footerError: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
