import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenState } from '../../components/ScreenState';
import { getAnime } from '../../mock/anime';
import { colors, radius, spacing } from '../../theme';

export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const anime = getAnime(Number(id));

  if (!anime) return <ScreenState kind="empty" message="This title could not be found." />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.cover}>
        <Ionicons name="image-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {anime.title}
      </Text>
      <Text style={styles.meta}>
        {anime.year ?? 'Date unknown'} · Catalog score {anime.score != null ? `${anime.score.toFixed(1)} / 10` : 'n/a'}
      </Text>
      <View style={styles.genres}>
        {anime.genres.map((g) => (
          <View key={g} style={styles.genre}>
            <Text style={styles.genreText}>{g}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.synopsis}>{anime.synopsis ?? 'No synopsis available.'}</Text>
      <View style={styles.actions}>
        <Button label="Add to Plan to watch" onPress={() => {}} />
        <Button label="Add to list" variant="outline" onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  cover: {
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  genre: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  genreText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  synopsis: { fontSize: 16, lineHeight: 24, color: colors.text },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
