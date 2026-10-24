import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { ScreenState } from '../../components/ScreenState';
import { SectionHeader } from '../../components/SectionHeader';
import { useCatalog } from '../../features/catalog/useCatalog';
import type { Anime } from '../../features/catalog/types';
import { colors, radius, spacing } from '../../theme';
import { GENRES } from '../../mock/anime';

function Row({ data }: { data: Anime[] }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(a) => String(a.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      renderItem={({ item }) => <AnimeCard anime={item} width={140} />}
    />
  );
}

export default function Home() {
  const catalog = useCatalog();
  const anime = catalog.status === 'ready' ? catalog.anime : [];
  const suggestions = anime.slice(0, 4);
  const releases = anime.filter((a) => a.airingStatus === 'finished').slice(4, 8);
  const upcoming = anime.filter((a) => a.airingStatus === 'upcoming');

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Pressable
        style={styles.search}
        accessibilityRole="search"
        accessibilityLabel="Search anime"
        onPress={() => router.navigate('/discover')}
      >
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <Text style={styles.searchText}>Search anime</Text>
      </Pressable>

      {catalog.status === 'loading' && <ScreenState kind="loading" />}
      {catalog.status === 'error' && (
        <ScreenState kind="error" message="Titles could not be loaded." onRetry={catalog.retry} />
      )}
      {catalog.status === 'ready' && (
        <>
          <SectionHeader title="Suggested for you" />
          <Row data={suggestions} />

          <SectionHeader title="New releases" onSeeAll={() => router.navigate('/discover')} />
          <Row data={releases} />

          <SectionHeader title="Upcoming" onSeeAll={() => router.navigate('/discover')} />
          <Row data={upcoming} />
        </>
      )}

      <SectionHeader title="Genres" />
      <View style={styles.chips}>
        {GENRES.slice(0, 6).map((g) => (
          <Pressable key={g} style={styles.chip} onPress={() => router.navigate('/discover')}>
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
});
