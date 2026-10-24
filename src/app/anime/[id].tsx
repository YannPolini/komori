import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ListNameDialog } from '../../components/ListNameDialog';
import { ScreenState } from '../../components/ScreenState';
import { WATCH_STATUS_LABEL } from '../../features/catalog/types';
import { useCatalog } from '../../features/catalog/useCatalog';
import { useLibrary } from '../../features/library/LibraryProvider';
import { WATCH_STATUSES } from '../../features/library/rules';
import { colors, radius, spacing, statusColors } from '../../theme';

export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const library = useLibrary();
  const [creating, setCreating] = useState(false);

  if (catalog.status === 'loading' || library.state.status === 'loading') return <ScreenState kind="loading" />;
  if (library.state.status === 'error') {
    return <ScreenState kind="error" message="Your lists could not be loaded." onRetry={library.retry} />;
  }
  if (catalog.status === 'error') {
    return <ScreenState kind="error" message="This title could not be loaded." onRetry={catalog.retry} />;
  }

  const anime = catalog.anime.find((a) => a.id === Number(id));
  if (!anime) return <ScreenState kind="empty" message="This title could not be found." />;

  const profile = library.state.profile;
  const status = profile.statuses[anime.id];

  const confirmClear = () =>
    status &&
    Alert.alert(
      'Remove watch status?',
      `"${anime.title}" is removed from ${WATCH_STATUS_LABEL[status]}. Its rating and custom lists stay unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => library.clearStatus(anime.id) },
      ],
    );

  // A list created here starts with this title in it.
  const createList = (name: string) => {
    const result = library.createList(name);
    if ('error' in result) return result.error;
    library.addToList(result.id, anime.id);
    setCreating(false);
    return null;
  };

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

      <Text style={styles.section} accessibilityRole="header">
        Watch status
      </Text>
      <View style={styles.statuses} accessibilityRole="radiogroup">
        {WATCH_STATUSES.map((s) => {
          const active = s === status;
          const tint = statusColors[s];
          return (
            <Pressable
              key={s}
              onPress={() => library.setStatus(anime.id, s)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={WATCH_STATUS_LABEL[s]}
              style={[styles.status, active && { backgroundColor: tint.background, borderColor: tint.text }]}
            >
              {active && <Ionicons name="checkmark" size={16} color={tint.text} />}
              <Text style={[styles.statusText, active && { color: tint.text }]}>{WATCH_STATUS_LABEL[s]}</Text>
            </Pressable>
          );
        })}
      </View>
      {status ? (
        <Button label="Remove status" variant="outline" onPress={confirmClear} />
      ) : (
        <Button label="Add to Plan to watch" onPress={() => library.quickSave(anime.id)} />
      )}

      <Text style={styles.section} accessibilityRole="header">
        Custom lists
      </Text>
      {profile.customLists.length === 0 && <Text style={styles.meta}>You have no custom lists yet.</Text>}
      {profile.customLists.map((l) => {
        const inList = l.animeIds.includes(anime.id);
        return (
          <Pressable
            key={l.id}
            onPress={() => (inList ? library.removeFromList(l.id, anime.id) : library.addToList(l.id, anime.id))}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: inList }}
            accessibilityLabel={l.name}
            style={styles.listRow}
          >
            <Ionicons
              name={inList ? 'checkbox' : 'square-outline'}
              size={24}
              color={inList ? colors.primary : colors.textMuted}
            />
            <Text style={styles.listName} numberOfLines={1}>
              {l.name}
            </Text>
          </Pressable>
        );
      })}
      <Button label="New list" variant="outline" onPress={() => setCreating(true)} />

      <ListNameDialog
        visible={creating}
        title="New list"
        submitLabel="Create"
        onSubmit={createList}
        onCancel={() => setCreating(false)}
      />
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
  section: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusText: { fontSize: 14, fontWeight: '600', color: colors.text },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  listName: { flex: 1, fontSize: 16, color: colors.text },
});
