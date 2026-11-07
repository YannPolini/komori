import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  const profile = library.state.status === 'ready' ? library.state.profile : null;
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<'plain' | 'pending' | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const watchedIds = profile ? listAnimeIds(profile, 'watched') : [];
  const watched = useAnimeEntries(watchedIds.slice(0, 6));

  useEffect(() => setName(profile?.displayName ?? ''), [profile?.displayName]);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    void library.repository.readRecord().then((record) => {
      if (active) setPending(record?.pendingSync ?? false);
    }, () => {});
    return () => { active = false; };
  }, [profile, library.repository]);

  async function saveName() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (await library.setDisplayName(name)) setMessage('Display name saved.');
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

  async function signOut() {
    if (working.current) return;
    working.current = true;
    setConfirmation(null);
    setBusy(true);
    let signedOut = false;
    try {
      await library.flushWrites();
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
          <AccountInput label="Display name" value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" editable={!busy} />
          <Button label="Save display name" onPress={() => void saveName()} disabled={busy || name.trim() === profile.displayName} />
          <Text style={styles.meta}>
            {count.plan} planned · {count.watching} watching · {count.watched} watched
          </Text>
          <Text style={styles.meta}>{pending ? 'Pending sync' : 'Profile saved on this device'}</Text>

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
      <Button label="Sign out" variant="outline" onPress={() => void confirmSignOut()} disabled={busy} />
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
          if (key === 'sync') {
            setConfirmation(null);
            setMessage('Sync isn’t available yet. Your changes are still saved on this device.');
          } else void signOut();
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
