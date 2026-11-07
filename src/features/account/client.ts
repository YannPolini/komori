import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

function readConfig() {
  const endpoint = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!endpoint || !publishableKey?.startsWith('sb_publishable_')) return null;
  try {
    const url = new URL(endpoint);
    const local = __DEV__ && url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash) return null;
    const project = url.host.replace(/[^a-zA-Z0-9._-]/g, '_');
    return { endpoint: url.toString(), publishableKey, project };
  } catch {
    return null;
  }
}

const config = readConfig();
const storageKey = config ? 'komori.auth.' + config.project + '.session' : 'komori.auth.session';

export const accountOwner = (id: string) => (config?.project ?? 'unconfigured') + ':' + id;

// The SDK already stores the verified session securely. Read its identity on an
// offline restart without needing a second record that could survive sign-out.
export async function readStoredIdentity() {
  const raw = await authStorage.getItem(storageKey);
  if (!raw) return null;
  const session = JSON.parse(raw) as { access_token?: unknown; refresh_token?: unknown; user?: { id?: unknown; email?: unknown } };
  if (typeof session?.access_token !== 'string' || typeof session.refresh_token !== 'string' ||
      typeof session.user?.id !== 'string' || !session.user.id) return null;
  return { id: session.user.id, email: typeof session.user.email === 'string' ? session.user.email : '' };
}

export const supabase = config ? createClient(config.endpoint, config.publishableKey, {
  auth: {
    storage: authStorage,
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) : null;
