import type { WatchStatus } from '../catalog/types';
import * as rules from './rules';
import type { ProfileData } from './types';

export type LibraryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profile: ProfileData };

export type LibraryAction =
  | { type: 'load' }
  | { type: 'loaded'; profile: ProfileData }
  | { type: 'loadFailed' }
  | { type: 'setStatus'; animeId: number; status: WatchStatus }
  | { type: 'clearStatus'; animeId: number }
  | { type: 'quickSave'; animeId: number }
  | { type: 'createList'; id: string; name: string }
  | { type: 'renameList'; listId: string; name: string }
  | { type: 'deleteList'; listId: string }
  | { type: 'addToList'; listId: string; animeId: number }
  | { type: 'removeFromList'; listId: string; animeId: number }
  | { type: 'moveToList'; fromId: string; toId: string; animeId: number };

// Invalid list names leave the state unchanged; screens validate first to show the error.
function apply(profile: ProfileData, action: LibraryAction): ProfileData {
  switch (action.type) {
    case 'setStatus':
      return rules.setStatus(profile, action.animeId, action.status);
    case 'clearStatus':
      return rules.clearStatus(profile, action.animeId);
    case 'quickSave':
      return rules.quickSave(profile, action.animeId);
    case 'createList': {
      const result = rules.createList(profile, action.name, action.id);
      return result.ok ? result.profile : profile;
    }
    case 'renameList': {
      const result = rules.renameList(profile, action.listId, action.name);
      return result.ok ? result.profile : profile;
    }
    case 'deleteList':
      return rules.deleteList(profile, action.listId);
    case 'addToList':
      return rules.addToList(profile, action.listId, action.animeId);
    case 'removeFromList':
      return rules.removeFromList(profile, action.listId, action.animeId);
    case 'moveToList':
      return rules.moveToList(profile, action.fromId, action.toId, action.animeId);
    default:
      return profile;
  }
}

export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  if (action.type === 'load') return { status: 'loading' };
  if (action.type === 'loaded') return { status: 'ready', profile: action.profile };
  if (action.type === 'loadFailed') return { status: 'error' };
  if (state.status !== 'ready') return state;
  const profile = apply(state.profile, action);
  return profile === state.profile ? state : { status: 'ready', profile };
}
