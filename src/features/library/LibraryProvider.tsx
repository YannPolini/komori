import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { WatchStatus } from '../catalog/types';
import { libraryReducer, type LibraryState } from './reducer';
import type { ProfileRepository } from './repository';
import { validateListName } from './rules';
import type { ProfileData } from './types';
import { randomUUID } from './uuid';

interface LibraryContextValue {
  state: LibraryState;
  retry: () => void;
  setStatus: (animeId: number, status: WatchStatus) => void;
  clearStatus: (animeId: number) => void;
  quickSave: (animeId: number) => void;
  setRating: (animeId: number, rating: number) => void;
  clearRating: (animeId: number) => void;
  togglePreferredGenre: (genre: string) => void;
  // List editing returns an error message for the dialog, or the list on success.
  createList: (name: string) => { id: string } | { error: string };
  renameList: (listId: string, name: string) => { error: string } | null;
  deleteList: (listId: string) => void;
  addToList: (listId: string, animeId: number) => void;
  removeFromList: (listId: string, animeId: number) => void;
  moveToList: (fromId: string, toId: string, animeId: number) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ repository, children }: { repository: ProfileRepository; children: ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, { status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const saved = useRef<ProfileData | null>(null);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'load' });
    repository.load().then(
      (profile) => {
        if (!active) return;
        saved.current = profile;
        dispatch({ type: 'loaded', profile });
      },
      () => active && dispatch({ type: 'loadFailed' }),
    );
    return () => {
      active = false;
    };
  }, [repository, attempt]);

  // Saves after every change, but not the profile that was just loaded.
  useEffect(() => {
    if (state.status !== 'ready' || state.profile === saved.current) return;
    saved.current = state.profile;
    repository.save(state.profile).catch((e) => console.warn('Profile could not be saved', e));
  }, [repository, state]);

  const profile = state.status === 'ready' ? state.profile : null;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      state,
      retry,
      setStatus: (animeId, status) => dispatch({ type: 'setStatus', animeId, status }),
      clearStatus: (animeId) => dispatch({ type: 'clearStatus', animeId }),
      quickSave: (animeId) => dispatch({ type: 'quickSave', animeId }),
      setRating: (animeId, rating) => dispatch({ type: 'setRating', animeId, rating }),
      clearRating: (animeId) => dispatch({ type: 'clearRating', animeId }),
      togglePreferredGenre: (genre) => dispatch({ type: 'togglePreferredGenre', genre }),
      createList: (name) => {
        const valid = validateListName(name, profile?.customLists ?? []);
        if (!valid.ok) return { error: valid.error };
        const id = randomUUID();
        dispatch({ type: 'createList', id, name: valid.name });
        return { id };
      },
      renameList: (listId, name) => {
        const valid = validateListName(name, profile?.customLists ?? [], listId);
        if (!valid.ok) return { error: valid.error };
        dispatch({ type: 'renameList', listId, name: valid.name });
        return null;
      },
      deleteList: (listId) => dispatch({ type: 'deleteList', listId }),
      addToList: (listId, animeId) => dispatch({ type: 'addToList', listId, animeId }),
      removeFromList: (listId, animeId) => dispatch({ type: 'removeFromList', listId, animeId }),
      moveToList: (fromId, toId, animeId) => dispatch({ type: 'moveToList', fromId, toId, animeId }),
    }),
    [state, profile, retry],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}
