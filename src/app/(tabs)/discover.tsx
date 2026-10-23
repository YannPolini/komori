import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { ScreenState } from '../../components/ScreenState';
import { useCatalog } from '../../features/catalog/useCatalog';
import { GENRES, MOCK_STATUS } from '../../mock/anime';
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
      <View style={styles.search}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search anime"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Search anime"
          style={styles.input}
        />
      </View>

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
          renderItem={({ item }) => <AnimeCard anime={item} status={MOCK_STATUS[item.id]} width={cardWidth} />}
          ListEmptyComponent={<ScreenState kind="empty" message="No titles match your search." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.text, minHeight: 44 },
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
