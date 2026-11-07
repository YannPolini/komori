import { fetch as fetchNetwork } from '@react-native-community/netinfo';
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { readStoredIdentity, supabase } from './client';

interface Identity {
  id: string;
  email: string;
}

interface AuthState {
  status: 'loading' | 'guest' | 'account' | 'error';
  identity: Identity | null;
  retry: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function fromSession(session: Session): Identity {
  return { id: session.user.id, email: session.user.email ?? '' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'retry'>>({ status: supabase ? 'loading' : 'guest', identity: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let events = 0;
    const guest = () => setState({ status: 'guest', identity: null });
    const accept = (identity: Identity) => setState({ status: 'account', identity });
    setState({ status: 'loading', identity: null });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      // Do not call an Auth API from inside this callback: the SDK still holds its lock.
      if (!active || event === 'INITIAL_SESSION') return;
      if (session) {
        events++;
        accept(fromSession(session));
      } else if (event === 'SIGNED_OUT') {
        events++;
        guest();
      }
    });

    const refreshOnForeground = (status: string) => {
      if (status === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    };
    const appState = Platform.OS === 'web' ? null : AppState.addEventListener('change', refreshOnForeground);
    if (appState) refreshOnForeground(AppState.currentState);

    async function restore() {
      const seen = events;
      try {
        const saved = await readStoredIdentity();
        const network = await fetchNetwork();
        if (!active || events !== seen) return;
        if (saved && (network.isConnected === false || network.isInternetReachable === false)) {
          accept(saved);
          return;
        }
        const { data, error } = await client.auth.getSession();
        if (!active || events !== seen) return;
        if (data.session) {
          accept(fromSession(data.session));
        } else if (saved && error && isAuthRetryableFetchError(error)) {
          accept(saved);
        } else {
          guest();
        }
      } catch {
        if (active && events === seen) setState({ status: 'error', identity: null });
      }
    }

    void restore();
    return () => {
      active = false;
      subscription.unsubscribe();
      appState?.remove();
      if (appState) void client.auth.stopAutoRefresh();
    };
  }, [attempt]);

  return <AuthContext.Provider value={{ ...state, retry: () => setAttempt((n) => n + 1) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
