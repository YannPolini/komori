import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, radius, spacing } from '../../theme';
import { GENRES, MOCK_ANIME, MOCK_STATUS } from '../../mock/anime';

const suggestions = MOCK_ANIME.slice(0, 4);
const releases = MOCK_ANIME.filter((a) => a.airingStatus === 'finished').slice(4, 8);
const upcoming = MOCK_ANIME.filter((a) => a.airingStatus === 'upcoming');

function Row({ data }: { data: typeof MOCK_ANIME }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(a) => String(a.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      renderItem={({ item }) => <AnimeCard anime={item} status={MOCK_STATUS[item.id]} width={140} />}
    />
  );
}

export default function Home() {
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

      <SectionHeader title="Suggested for you" />
      <Row data={suggestions} />

      <SectionHeader title="New releases" onSeeAll={() => router.navigate('/discover')} />
      <Row data={releases} />

      <SectionHeader title="Upcoming" onSeeAll={() => router.navigate('/discover')} />
      <Row data={upcoming} />

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
