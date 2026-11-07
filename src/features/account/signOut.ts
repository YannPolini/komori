import { readStoredIdentity, supabase } from './client';

export async function signOutOnDevice(clearProfile: () => Promise<void>) {
  if (!supabase) throw new Error('Account service unavailable');
  let cleared: Promise<void> | undefined;
  const clearOnce = () => cleared ??= clearProfile();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    // Local sign-out can clear the session before server revocation finishes.
    // Start removing private data as soon as the SDK reports that it signed out.
    if (event === 'SIGNED_OUT') void clearOnce().catch(() => {});
  });
  try {
    const result = await supabase.auth.signOut({ scope: 'local' });
    if (await readStoredIdentity()) throw result.error ?? new Error('The local session could not be cleared');
    await clearOnce();
  } finally {
    subscription.unsubscribe();
  }
}
