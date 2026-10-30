import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { ScreenState } from '../components/ScreenState';
import { useGenres } from '../features/catalog/useCatalog';
import { useLibrary } from '../features/library/LibraryProvider';
import { MAX_PREFERRED_GENRES } from '../features/library/rules';
import { colors, spacing } from '../theme';

// Preferred genres for Home suggestions. A fourth genre is only accepted after removing one.
function GenrePreferences() {
  const genres = useGenres();
  const library = useLibrary();
  if (genres.status === 'loading' || library.state.status === 'loading') return <ScreenState kind="loading" />;
  if (genres.status === 'error') {
    return <ScreenState kind="error" message="Genres could not be loaded." onRetry={genres.retry} />;
  }
  if (library.state.status === 'error') {
    return <ScreenState kind="error" message="Your profile could not be loaded." onRetry={library.retry} />;
  }
  const selected = library.state.profile.genres;
  const full = selected.length >= MAX_PREFERRED_GENRES;
  return (
    <>
      <Text style={styles.meta}>
        {full
          ? `${MAX_PREFERRED_GENRES} of ${MAX_PREFERRED_GENRES} selected. Remove one to pick another.`
          : `Pick up to ${MAX_PREFERRED_GENRES}. Home suggests titles from these genres.`}
      </Text>
      <View style={styles.chips}>
        {genres.genres.map((g) => (
          <Chip key={g} label={g} selected={selected.includes(g)} onPress={() => library.togglePreferredGenre(g)} />
        ))}
      </View>
    </>
  );
}

export default function Account() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.signIn}>
        <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
        <Text style={styles.title}>You are not signed in</Text>
        <Text style={styles.sub}>Sign in to keep your lists and ratings on every device.</Text>
        <Button label="Sign in" onPress={() => {}} />
      </View>

      <Text style={styles.section} accessibilityRole="header">
        Favorite genres
      </Text>
      <GenrePreferences />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  signIn: { alignItems: 'center', gap: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  section: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  meta: { fontSize: 14, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
