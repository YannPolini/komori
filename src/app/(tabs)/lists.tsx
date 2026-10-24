import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ListNameDialog } from '../../components/ListNameDialog';
import { ScreenState } from '../../components/ScreenState';
import { SearchField } from '../../components/SearchField';
import { WATCH_STATUS_LABEL } from '../../features/catalog/types';
import { useLibrary } from '../../features/library/LibraryProvider';
import { counts, WATCH_STATUSES } from '../../features/library/rules';
import type { CustomList } from '../../features/library/types';
import { colors, radius, shadow, spacing, statusColors } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_ICON: Record<string, IconName> = {
  plan: 'bookmark-outline',
  watching: 'play-circle-outline',
  watched: 'checkmark-circle-outline',
};

interface Row {
  id: string;
  name: string;
  count: number;
  custom?: CustomList;
}

const titles = (n: number) => `${n} ${n === 1 ? 'title' : 'titles'}`;

export default function Lists() {
  const library = useLibrary();
  const [query, setQuery] = useState('');
  // null: closed, 'new': create dialog, otherwise the list being edited.
  const [editing, setEditing] = useState<CustomList | 'new' | null>(null);

  if (library.state.status === 'loading') return <ScreenState kind="loading" />;
  if (library.state.status === 'error') {
    return <ScreenState kind="error" message="Your lists could not be loaded." onRetry={library.retry} />;
  }

  const profile = library.state.profile;
  const count = counts(profile);
  const rows: Row[] = [
    ...WATCH_STATUSES.map((s) => ({ id: s, name: WATCH_STATUS_LABEL[s], count: count[s] })),
    ...profile.customLists.map((l) => ({ id: l.id, name: l.name, count: count[l.id], custom: l })),
  ].filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()));

  const submit = (name: string) => {
    if (editing === 'new') {
      const result = library.createList(name);
      if ('error' in result) return result.error;
    } else if (editing) {
      const result = library.renameList(editing.id, name);
      if (result) return result.error;
    }
    setEditing(null);
    return null;
  };

  const confirmDelete = (list: CustomList) =>
    Alert.alert(
      `Delete "${list.name}"?`,
      'The list is removed. Its titles keep their watch status and ratings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            library.deleteList(list.id);
            setEditing(null);
          },
        },
      ],
    );

  return (
    <View style={{ flex: 1 }}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search lists" />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Button label="New list" variant="outline" onPress={() => setEditing('new')} />}
        ListEmptyComponent={<ScreenState kind="empty" message="No lists match your search." />}
        renderItem={({ item }) => {
          const tint = item.custom ? undefined : statusColors[item.id as keyof typeof statusColors];
          return (
            <View style={styles.row}>
              <Pressable
                style={styles.main}
                onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.custom ? 'custom list' : 'built-in list'}, ${titles(item.count)}`}
              >
                <View style={[styles.icon, tint && { backgroundColor: tint.background }]}>
                  <Ionicons
                    name={item.custom ? 'list-outline' : STATUS_ICON[item.id]}
                    size={22}
                    color={tint ? tint.text : colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.sub}>{item.custom ? 'Custom list' : 'Built-in'}</Text>
                </View>
                <Text style={styles.count}>{item.count}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              {item.custom && (
                <Pressable
                  onPress={() => setEditing(item.custom!)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                  style={styles.edit}
                >
                  <Ionicons name="create-outline" size={22} color={colors.text} />
                </Pressable>
              )}
            </View>
          );
        }}
      />
      <ListNameDialog
        visible={editing != null}
        title={editing === 'new' ? 'New list' : 'Edit list'}
        initialName={editing && editing !== 'new' ? editing.name : ''}
        submitLabel={editing === 'new' ? 'Create' : 'Save'}
        onSubmit={submit}
        onCancel={() => setEditing(null)}
        onDelete={editing && editing !== 'new' ? () => confirmDelete(editing) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadow,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  count: { fontSize: 16, fontWeight: '700', color: colors.text },
  edit: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
});
