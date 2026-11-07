import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { WatchStatus } from '../catalog/types';
import { libraryReducer, type LibraryAction, type LibraryState } from './reducer';
import type { LocalProfileRepository } from './localRepository';
import { validateListName } from './rules';
import type { ProfileData } from './types';
import { randomUUID } from './uuid';

interface LibraryContextValue {
  state: LibraryState;
  repository: LocalProfileRepository;
  retry: () => void;
  saveError: boolean;
  dismissSaveError: () => void;
  flushWrites: () => Promise<void>;
  setDisplayName: (name: string) => Promise<boolean>;
  setStatus: (animeId: number, status: WatchStatus) => void;
  clearStatus: (animeId: number) => void;
  quickSave: (animeId: number) => void;
  setRating: (animeId: number, rating: number) => void;
  clearRating: (animeId: number) => void;
  togglePreferredGenre: (genre: string) => void;
  createList: (name: string, animeId?: number) => Promise<{ id: string } | { error: string }>;
  renameList: (listId: string, name: string) => Promise<{ error: string } | null>;
  deleteList: (listId: string) => void;
  addToList: (listId: string, animeId: number) => void;
  removeFromList: (listId: string, animeId: number) => void;
  moveToList: (fromId: string, toId: string, animeId: number) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function reduce(profile: ProfileData, ...actions: LibraryAction[]) {
  let next: LibraryState = { status: 'ready', profile };
  for (const action of actions) next = libraryReducer(next, action);
  return next.status === 'ready' ? next.profile : profile;
}

export function LibraryProvider({ repository, children }: { repository: LocalProfileRepository; children: ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, { status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const saved = useRef<ProfileData | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const scope = useRef<object | null>(null);

  useEffect(() => {
    const current = {};
    scope.current = current;
    saved.current = null;
    dispatch({ type: 'load' });
    repository.load().then(
      (profile) => {
        if (scope.current !== current) return;
        saved.current = profile;
        dispatch({ type: 'loaded', profile });
      },
      () => scope.current === current && dispatch({ type: 'loadFailed' }),
    );
    return () => { scope.current = null; };
  }, [repository, attempt]);

  const edit = useCallback(<T,>(apply: (profile: ProfileData) => { profile: ProfileData; result: T }): Promise<T> => {
    const current = scope.current;
    const next = queue.current.then(async () => {
      if (!current || scope.current !== current || !saved.current) throw new Error('Profile unavailable');
      const change = apply(saved.current);
      if (change.profile === saved.current) return change.result;
      try {
        await repository.save(change.profile);
      } catch (error) {
        if (scope.current === current) setSaveError(true);
        throw error;
      }
      if (scope.current === current) {
        saved.current = change.profile;
        dispatch({ type: 'loaded', profile: change.profile });
      }
      return change.result;
    });
    // Failed writes leave the last saved profile visible and do not block later edits.
    queue.current = next.catch(() => {});
    return next;
  }, [repository]);

  const change = useCallback((action: LibraryAction) =>
    edit((profile) => ({ profile: reduce(profile, action), result: true })).catch(() => false), [edit]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<LibraryContextValue>(() => ({
    state,
    repository,
    retry,
    saveError,
    dismissSaveError: () => setSaveError(false),
    flushWrites: async () => { await queue.current; },
    setDisplayName: (name) => change({ type: 'setDisplayName', name }),
    setStatus: (animeId, status) => void change({ type: 'setStatus', animeId, status }),
    clearStatus: (animeId) => void change({ type: 'clearStatus', animeId }),
    quickSave: (animeId) => void change({ type: 'quickSave', animeId }),
    setRating: (animeId, rating) => void change({ type: 'setRating', animeId, rating }),
    clearRating: (animeId) => void change({ type: 'clearRating', animeId }),
    togglePreferredGenre: (genre) => void change({ type: 'togglePreferredGenre', genre }),
    createList: (name, animeId) => edit<{ id: string } | { error: string }>((profile) => {
      const valid = validateListName(name, profile.customLists);
      if (!valid.ok) return { profile, result: { error: valid.error } };
      const id = randomUUID();
      const created = reduce(profile, { type: 'createList', id, name: valid.name });
      const next = animeId == null ? created : reduce(created, { type: 'addToList', listId: id, animeId });
      return { profile: next, result: { id } };
    }).catch(() => ({ error: 'The list could not be saved. Try again.' })),
    renameList: (listId, name) => edit<{ error: string } | null>((profile) => {
      const valid = validateListName(name, profile.customLists, listId);
      if (!valid.ok) return { profile, result: { error: valid.error } };
      return { profile: reduce(profile, { type: 'renameList', listId, name: valid.name }), result: null };
    }).catch(() => ({ error: 'The list could not be renamed. Try again.' })),
    deleteList: (listId) => void change({ type: 'deleteList', listId }),
    addToList: (listId, animeId) => void change({ type: 'addToList', listId, animeId }),
    removeFromList: (listId, animeId) => void change({ type: 'removeFromList', listId, animeId }),
    moveToList: (fromId, toId, animeId) => void change({ type: 'moveToList', fromId, toId, animeId }),
  }), [state, repository, saveError, retry, edit, change]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}
