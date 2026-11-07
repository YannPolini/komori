import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { OptionSheet } from '../components/OptionSheet';
import { ScreenState } from '../components/ScreenState';
import { AccountInput } from '../features/account/AccountInput';
import { AuthForm } from '../features/account/AuthForm';
import { useAuth } from '../features/account/AuthProvider';
import { authErrorMessage } from '../features/account/errors';
import { signOutOnDevice } from '../features/account/signOut';
import { useAnimeEntries, useGenres } from '../features/catalog/useCatalog';
import { useLibrary } from '../features/library/LibraryProvider';
import { counts, listAnimeIds, MAX_PREFERRED_GENRES } from '../features/library/rules';
import { useCloudSync } from '../features/sync/SyncProvider';
import { useOffline } from '../services/connectivity';
import { colors, spacing } from '../theme';

function GenrePreferences() {
  const genres = useGenres();
  const library = useLibrary();
  if (genres.status === 'loading' || library.state.status === 'loading') return <ScreenState kind="loading" />;
  if (library.state.status === 'error') {
    return <ScreenState kind="error" message="Your profile could not be loaded." onRetry={library.retry} />;
  }
  const selected = library.state.profile.genres;
  if (genres.status === 'error' && !selected.length) {
    return <ScreenState kind="error" message="Genres could not be loaded." onRetry={genres.retry} />;
  }
  const options = genres.status === 'ready' ? genres.genres : selected;
  const full = selected.length >= MAX_PREFERRED_GENRES;
  return (
    <>
      <Text style={styles.meta}>
        {full
          ? `${MAX_PREFERRED_GENRES} of ${MAX_PREFERRED_GENRES} selected. Remove one to pick another.`
          : `Pick up to ${MAX_PREFERRED_GENRES}. Home suggests titles from these genres.`}
      </Text>
      <View style={styles.chips}>
        {options.map((genre) => (
          <Chip key={genre} label={genre} selected={selected.includes(genre)} onPress={() => library.togglePreferredGenre(genre)} />
        ))}
      </View>
    </>
  );
}

function SignedInAccount({ email }: { email: string }) {
  const library = useLibrary();
  const sync = useCloudSync();
  const offline = useOffline();
  const profile = library.state.status === 'ready' ? library.state.profile : null;
  const [draftName, setDraftName] = useState<string | null>(null);
  const name = draftName ?? profile?.displayName ?? '';
  const [confirmation, setConfirmation] = useState<'plain' | 'pending' | null>(null);
  const [conflictChoice, setConflictChoice] = useState<'device' | 'cloud' | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const watchedIds = profile ? listAnimeIds(profile, 'watched') : [];
  const watched = useAnimeEntries(watchedIds.slice(0, 6));

  async function saveName() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (await library.setDisplayName(name)) {
        setDraftName(null);
        setMessage('Display name saved.');
      }
      else setError('Your display name could not be saved.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function confirmSignOut() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await library.flushWrites();
      const record = await library.repository.readRecord();
      setConfirmation(record?.pendingSync ? 'pending' : 'plain');
    } catch {
      setError('Could not check your saved changes. Try again before signing out.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function signOut(syncFirst = false) {
    if (working.current) return;
    working.current = true;
    setConfirmation(null);
    setBusy(true);
    setError('');
    let signedOut = false;
    try {
      await library.flushWrites();
      if (syncFirst) {
        const synced = await sync.syncNow();
        if (!synced || (await library.repository.readRecord())?.pendingSync) {
          setError('Could not sync all your changes. You are still signed in.');
          return;
        }
      }
      await signOutOnDevice(async () => {
        signedOut = true;
        await library.repository.clear();
      });
    } catch (reason) {
      if (signedOut) {
        Alert.alert('Could not clear account data', 'You are signed out, but the local account copy could not be cleared.', [
          { text: 'Close', style: 'cancel' },
          { text: 'Retry cleanup', onPress: () => void library.repository.clear().catch(() => Alert.alert('Cleanup still failed')) },
        ]);
      } else {
        setError(authErrorMessage(reason, 'Could not sign out. Try again.'));
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const count = profile ? counts(profile) : null;
  const syncLabels = {
    unavailable: 'Profile saved on this device',
    pending: 'Pending sync',
    syncing: 'Syncing…',
    'up-to-date': 'Up to date',
    failed: 'Sync failed. Your saved changes are still on this device.',
    'sign-in': 'Sign in again to sync your saved changes.',
    offline: 'Offline. Changes are saved on this device.',
    conflict: 'This device and the cloud have different changes.',
  };
  return (
    <>
      <View style={styles.identity}>
        <Ionicons name="person-circle-outline" size={58} color={colors.primary} />
        <Text style={styles.title}>{profile?.displayName || 'Your account'}</Text>
        <Text style={styles.meta}>{email}</Text>
      </View>
      {library.state.status === 'loading' && <ScreenState kind="loading" />}
      {library.state.status === 'error' && (
        <ScreenState kind="error" message="Your profile could not be loaded." onRetry={library.retry} />
      )}
      {profile && count && (
        <>
          <AccountInput label="Display name" value={name} onChangeText={setDraftName} maxLength={60} autoCapitalize="words" editable={!busy} />
          <Button label="Save display name" onPress={() => void saveName()} disabled={busy || name.trim() === profile.displayName} />
          <Text style={styles.meta}>
            {count.plan} planned · {count.watching} watching · {count.watched} watched
          </Text>
          <Text style={styles.meta} accessibilityLiveRegion="polite">{syncLabels[sync.state.status]}</Text>
          {sync.state.status === 'conflict' && (
            <>
              {sync.state.failed && <Text style={styles.error}>Could not resolve the conflict. Try again.</Text>}
              {offline && <Text style={styles.meta}>Connect to the internet to resolve the conflict.</Text>}
              <Button label="Keep this device" variant="outline" disabled={offline || busy} onPress={() => setConflictChoice('device')} />
              <Button label="Use cloud" variant="outline" disabled={offline || busy} onPress={() => setConflictChoice('cloud')} />
            </>
          )}
          {(sync.state.status === 'failed' || sync.state.status === 'sign-in' || sync.state.status === 'pending') &&
            <Button label="Retry sync" variant="outline" disabled={offline || busy} onPress={() => void sync.syncNow()} />}

          <Text style={styles.section} accessibilityRole="header">Watched history</Text>
          {!watchedIds.length && <Text style={styles.meta}>No watched titles yet.</Text>}
          {watched.anime.map((anime) => (
            <Pressable key={anime.id} accessibilityRole="link" style={styles.watched}
              onPress={() => router.push({ pathname: '/anime/[id]', params: { id: String(anime.id) } })}>
              <Text style={styles.watchedText}>{anime.title}</Text>
            </Pressable>
          ))}
          {watchedIds.length > 0 && (
            <Button label="See all watched titles" variant="outline"
              onPress={() => router.push({ pathname: '/list/[id]', params: { id: 'watched' } })} />
          )}
        </>
      )}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.meta}>{message}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button label="Sign out" variant="outline" onPress={() => void confirmSignOut()} disabled={busy || sync.state.status === 'syncing'} />
      <OptionSheet
        visible={confirmation != null}
        title={confirmation === 'pending'
          ? 'You have changes that haven’t synced.'
          : 'Sign out and remove your account data from this device?'}
        options={confirmation === 'pending'
          ? [{ key: 'sync', label: 'Sync first' }, { key: 'discard', label: 'Discard local changes and sign out' }]
          : [{ key: 'discard', label: 'Sign out' }]}
        onCancel={() => setConfirmation(null)}
        onSelect={(key) => {
          void signOut(key === 'sync');
        }}
      />
      <OptionSheet
        visible={conflictChoice !== null}
        title={conflictChoice === 'device'
          ? 'Replace the cloud copy with this device’s changes?'
          : 'Discard this device’s changes and use the cloud copy?'}
        options={[{ key: 'confirm', label: 'Confirm' }]}
        onCancel={() => setConflictChoice(null)}
        onSelect={() => {
          if (conflictChoice) void sync.resolve(conflictChoice);
          setConflictChoice(null);
        }}
      />
    </>
  );
}

export default function Account() {
  const { identity } = useAuth();
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {identity ? <SignedInAccount email={identity.email} /> : (
        <>
          <View style={styles.identity}>
            <Ionicons name="person-circle-outline" size={58} color={colors.primary} />
            <Text style={styles.title}>You are not signed in</Text>
          </View>
          <AuthForm />
        </>
      )}
      <Text style={styles.section} accessibilityRole="header">Favorite genres</Text>
      <GenrePreferences />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  identity: { alignItems: 'center', gap: spacing.xs },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  meta: { fontSize: 14, color: colors.textMuted },
  error: { fontSize: 15, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  watched: { minHeight: 44, justifyContent: 'center' },
  watchedText: { color: colors.primaryDark, fontSize: 16 },
});
