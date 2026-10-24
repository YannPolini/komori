import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { ScreenState } from '../../components/ScreenState';
import { SearchField } from '../../components/SearchField';
import { useCatalog } from '../../features/catalog/useCatalog';
import { GENRES } from '../../mock/anime';
import { colors, radius, spacing } from '../../theme';

export default function Discover() {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const catalog = useCatalog();
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.md * 3) / 2;

  const results = (catalog.status === 'ready' ? catalog.anime : []).filter(
    (a) =>
      a.title.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!genre || a.genres.includes(genre)),
  );

  return (
    <View style={{ flex: 1 }}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search anime" />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {GENRES.map((g) => {
            const active = g === genre;
            return (
              <Pressable
                key={g}
                onPress={() => setGenre(active ? null : g)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{g}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {catalog.status === 'loading' && <ScreenState kind="loading" />}
      {catalog.status === 'error' && (
        <ScreenState kind="error" message="Titles could not be loaded." onRetry={catalog.retry} />
      )}
      {catalog.status === 'ready' && (
        <FlatList
          data={results}
          keyExtractor={(a) => String(a.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => <AnimeCard anime={item} width={cardWidth} />}
          ListEmptyComponent={<ScreenState kind="empty" message="No titles match your search." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  grid: { padding: spacing.md, gap: spacing.md },
});
