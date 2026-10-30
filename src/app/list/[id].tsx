import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { cardMeta } from '../../components/AnimeCard';
import { Button } from '../../components/Button';
import { Cover } from '../../components/Cover';
import { OptionSheet } from '../../components/OptionSheet';
import { RatingStars, ratingLabel } from '../../components/Rating';
import { ScreenState } from '../../components/ScreenState';
import { SearchField } from '../../components/SearchField';
import { StatusBadge } from '../../components/StatusBadge';
import { WATCH_STATUS_LABEL, type Anime } from '../../features/catalog/types';
import { useAnimeEntries } from '../../features/catalog/useCatalog';
import { useLibrary } from '../../features/library/LibraryProvider';
import { isBuiltInList, listAnimeIds, WATCH_STATUSES } from '../../features/library/rules';
import { colors, radius, shadow, spacing } from '../../theme';

export default function ListDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const [query, setQuery] = useState('');
  const [moving, setMoving] = useState<Anime | null>(null);
  const navigation = useNavigation();

  const profile = library.state.status === 'ready' ? library.state.profile : null;
  const builtIn = isBuiltInList(id);
  const name = builtIn ? WATCH_STATUS_LABEL[id] : profile?.customLists.find((l) => l.id === id)?.name;

  // Set in an effect so the header title only updates when the list name changes.
  useLayoutEffect(() => {
    navigation.setOptions({ title: name ?? '' });
  }, [navigation, name]);

  const entries = useAnimeEntries(profile && name != null ? listAnimeIds(profile, id) : []);

  if (library.state.status === 'loading') return <ScreenState kind="loading" />;
  if (library.state.status === 'error') {
    return <ScreenState kind="error" message="This list could not be loaded." onRetry={library.retry} />;
  }

  if (!profile || name == null) return <ScreenState kind="empty" message="This list no longer exists." />;

  // Titles still loading from the catalog are added as they arrive.
  const all = [...entries.anime].sort((a, b) => a.title.localeCompare(b.title));
  const pending = entries.loading ? (
    <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} accessibilityLabel="Loading titles" />
  ) : entries.failed ? (
    <View style={styles.failed}>
      <Text style={styles.meta}>{all.length ? 'Some titles' : 'Titles'} could not be loaded.</Text>
      <Button label="Retry" onPress={entries.retry} />
    </View>
  ) : null;
  const visible = all.filter((a) => a.title.toLowerCase().includes(query.trim().toLowerCase()));

  const moveTargets = builtIn
    ? WATCH_STATUSES.filter((s) => s !== id).map((s) => ({ key: s, label: WATCH_STATUS_LABEL[s] }))
    : profile.customLists.filter((l) => l.id !== id).map((l) => ({ key: l.id, label: l.name }));

  const move = (target: string) => {
    if (!moving) return;
    if (builtIn && isBuiltInList(target)) library.setStatus(moving.id, target);
    else library.moveToList(id, target, moving.id);
    setMoving(null);
  };

  const remove = (anime: Anime) => {
    if (!builtIn) return library.removeFromList(id, anime.id);
    Alert.alert(
      'Remove watch status?',
      `"${anime.title}" is removed from ${name}. Its rating and custom lists stay unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => library.clearStatus(anime.id) },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {all.length > 0 && <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${name}`} />}
      <FlatList
        data={visible}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={pending}
        ListEmptyComponent={
          pending ? null : all.length === 0 ? (
            <ScreenState
              kind="empty"
              message={`${name} has no titles yet.`}
              action={{ label: 'Browse titles', onPress: () => router.navigate('/discover') }}
            />
          ) : (
            <ScreenState kind="empty" message="No titles match your search." />
          )
        }
        renderItem={({ item }) => {
          const status = profile.statuses[item.id];
          const rating = profile.ratings[item.id];
          return (
            <View style={styles.row}>
              <Pressable
                style={styles.main}
                onPress={() => router.push({ pathname: '/anime/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={[item.title, status && WATCH_STATUS_LABEL[status], rating != null && ratingLabel(rating), 'open details']
                  .filter(Boolean)
                  .join(', ')}
              >
                <Cover uri={item.imageUrl} iconSize={20} style={styles.cover} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{cardMeta(item)}</Text>
                    {rating != null && <RatingStars rating={rating} />}
                  </View>
                  {status && <StatusBadge status={status} />}
                </View>
              </Pressable>
              {moveTargets.length > 0 && (
                <Pressable
                  onPress={() => setMoving(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.title}`}
                  style={styles.action}
                >
                  <Ionicons name="swap-horizontal-outline" size={22} color={colors.text} />
                </Pressable>
              )}
              <Pressable
                onPress={() => remove(item)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.title} from ${name}`}
                style={styles.action}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          );
        }}
      />
      <OptionSheet
        visible={moving != null}
        title={moving ? `Move "${moving.title}" to` : ''}
        options={moveTargets}
        onSelect={move}
        onCancel={() => setMoving(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingRight: spacing.xs,
    ...shadow,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm },
  cover: { width: 48, height: 64, borderRadius: radius.sm },
  failed: { gap: spacing.sm, paddingTop: spacing.sm },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
