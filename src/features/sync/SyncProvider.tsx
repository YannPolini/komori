import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useOffline } from '../../services/connectivity';
import { useAuth } from '../account/AuthProvider';
import { supabase } from '../account/client';
import { useLibrary } from '../library/LibraryProvider';
import { cloudProfiles, SyncAuthError } from './cloudProfiles';
import { syncProfile, type CloudProfile } from './sync';

type SyncState =
  | { status: 'unavailable' | 'pending' | 'syncing' | 'up-to-date' | 'failed' | 'sign-in' | 'offline' }
  | { status: 'conflict'; cloud: CloudProfile | null; failed?: boolean };

interface SyncValue {
  state: SyncState;
  syncNow: () => Promise<boolean>;
  resolve: (choice: 'device' | 'cloud') => Promise<boolean>;
}

const SyncContext = createContext<SyncValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { identity } = useAuth();
  const owner = identity?.id;
  const offline = useOffline();
  const library = useLibrary();
  const current = useRef({ library, offline });
  current.current = { library, offline };
  const cloud = useMemo(() => supabase && owner ? cloudProfiles(supabase, owner) : null, [owner]);
  const [state, setState] = useState<SyncState>({ status: 'unavailable' });
  const conflict = useRef<Extract<SyncState, { status: 'conflict' }> | null>(null);
  const flight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback((choice?: 'device' | 'cloud') => {
    if (!cloud || current.current.offline || current.current.library.state.status !== 'ready') return Promise.resolve(false);
    if (flight.current) return flight.current;
    const conflictAtStart = conflict.current;
    if (conflictAtStart ? !choice : !!choice) return Promise.resolve(false);
    setState({ status: 'syncing' });
    const job = (async () => {
      try {
        const lib = current.current.library;
        await lib.flushWrites();
        const result = await syncProfile({
          readRecord: lib.repository.readRecord,
          acknowledgeCloud: lib.repository.acknowledgeCloud,
          acceptCloud: lib.replaceFromCloud,
        }, cloud, choice && conflictAtStart ? { use: choice, seen: conflictAtStart.cloud } : undefined);
        conflict.current = result.status === 'conflict' ? result : null;
        if (mounted.current) setState(result);
        return result.status === 'up-to-date';
      } catch (error) {
        if (mounted.current) setState(conflictAtStart
          ? { ...conflictAtStart, failed: true }
          : { status: error instanceof SyncAuthError ? 'sign-in' : 'failed' });
        return false;
      }
    })().finally(() => { flight.current = null; });
    flight.current = job;
    return job;
  }, [cloud]);

  const profile = library.state.status === 'ready' ? library.state.profile : null;
  const pending = state.status === 'pending';
  useEffect(() => {
    if (!cloud || !profile || offline) return;
    const timer = setTimeout(() => { void run(); }, 400);
    return () => clearTimeout(timer);
  }, [cloud, profile, offline, run, pending]);

  useEffect(() => {
    if (!cloud) return;
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void run();
    });
    return () => subscription.remove();
  }, [cloud, run]);

  const visible = !cloud ? { status: 'unavailable' } as const
    : offline && state.status !== 'conflict' ? { status: 'offline' } as const
    : state.status === 'unavailable' ? { status: 'pending' } as const : state;
  return <SyncContext.Provider value={{ state: visible, syncNow: run, resolve: run }}>{children}</SyncContext.Provider>;
}

export function useCloudSync() {
  const value = useContext(SyncContext);
  if (!value) throw new Error('useCloudSync must be used inside SyncProvider');
  return value;
}
