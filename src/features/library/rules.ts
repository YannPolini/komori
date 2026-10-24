import { WATCH_STATUS_LABEL, type WatchStatus } from '../catalog/types';
import type { CustomList, ProfileData } from './types';

// Library rules as pure functions: each returns a new profile and never touches storage.

export const WATCH_STATUSES: WatchStatus[] = ['plan', 'watching', 'watched'];
export const LIST_NAME_MAX = 40;

export type Validation = { ok: true; name: string } | { ok: false; error: string };
export type Result = { ok: true; profile: ProfileData } | { ok: false; error: string };

export const isBuiltInList = (listId: string): listId is WatchStatus =>
  (WATCH_STATUSES as string[]).includes(listId);

// A title has exactly one status, so setting one replaces the previous status.
export function setStatus(profile: ProfileData, animeId: number, status: WatchStatus): ProfileData {
  if (profile.statuses[animeId] === status) return profile;
  return { ...profile, statuses: { ...profile.statuses, [animeId]: status } };
}

export function clearStatus(profile: ProfileData, animeId: number): ProfileData {
  if (!(animeId in profile.statuses)) return profile;
  const { [animeId]: _removed, ...statuses } = profile.statuses;
  return { ...profile, statuses };
}

// Saves an untracked title to Plan to watch; a tracked title keeps its status.
export function quickSave(profile: ProfileData, animeId: number): ProfileData {
  return profile.statuses[animeId] ? profile : setStatus(profile, animeId, 'plan');
}

// Names are trimmed and must be unique ignoring case, including the built-in list names.
// ignoreId skips the list being renamed, so it can keep its name or change its casing.
export function validateListName(name: string, lists: CustomList[], ignoreId?: string): Validation {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Enter a list name.' };
  if ([...trimmed].length > LIST_NAME_MAX) {
    return { ok: false, error: `List names can have at most ${LIST_NAME_MAX} characters.` };
  }
  const key = trimmed.toLowerCase();
  const taken =
    Object.values(WATCH_STATUS_LABEL).some((label) => label.toLowerCase() === key) ||
    lists.some((l) => l.id !== ignoreId && l.name.toLowerCase() === key);
  if (taken) return { ok: false, error: 'A list with this name already exists.' };
  return { ok: true, name: trimmed };
}

export function createList(profile: ProfileData, name: string, id: string): Result {
  const valid = validateListName(name, profile.customLists);
  if (!valid.ok) return valid;
  const list: CustomList = { id, name: valid.name, animeIds: [] };
  return { ok: true, profile: { ...profile, customLists: [...profile.customLists, list] } };
}

export function renameList(profile: ProfileData, listId: string, name: string): Result {
  if (!profile.customLists.some((l) => l.id === listId)) {
    return { ok: false, error: 'This list no longer exists.' };
  }
  const valid = validateListName(name, profile.customLists, listId);
  if (!valid.ok) return valid;
  return { ok: true, profile: updateList(profile, listId, (l) => ({ ...l, name: valid.name })) };
}

// Removes the list and its memberships only; statuses and ratings stay unchanged.
export function deleteList(profile: ProfileData, listId: string): ProfileData {
  return { ...profile, customLists: profile.customLists.filter((l) => l.id !== listId) };
}

export function addToList(profile: ProfileData, listId: string, animeId: number): ProfileData {
  return updateList(profile, listId, (l) =>
    l.animeIds.includes(animeId) ? l : { ...l, animeIds: [...l.animeIds, animeId] },
  );
}

export function removeFromList(profile: ProfileData, listId: string, animeId: number): ProfileData {
  return updateList(profile, listId, (l) =>
    l.animeIds.includes(animeId) ? { ...l, animeIds: l.animeIds.filter((id) => id !== animeId) } : l,
  );
}

export function moveToList(profile: ProfileData, fromId: string, toId: string, animeId: number): ProfileData {
  if (fromId === toId || !profile.customLists.some((l) => l.id === toId)) return profile;
  return addToList(removeFromList(profile, fromId, animeId), toId, animeId);
}

// Anime IDs in a built-in list (by status) or a custom list (by UUID).
export function listAnimeIds(profile: ProfileData, listId: string): number[] {
  if (isBuiltInList(listId)) {
    return Object.entries(profile.statuses)
      .filter(([, status]) => status === listId)
      .map(([id]) => Number(id));
  }
  return profile.customLists.find((l) => l.id === listId)?.animeIds ?? [];
}

export function counts(profile: ProfileData): Record<string, number> {
  const result: Record<string, number> = { plan: 0, watching: 0, watched: 0 };
  for (const status of Object.values(profile.statuses)) result[status] += 1;
  for (const list of profile.customLists) result[list.id] = list.animeIds.length;
  return result;
}

function updateList(profile: ProfileData, listId: string, update: (l: CustomList) => CustomList): ProfileData {
  let changed = false;
  const customLists = profile.customLists.map((l) => {
    if (l.id !== listId) return l;
    const next = update(l);
    changed = next !== l;
    return next;
  });
  return changed ? { ...profile, customLists } : profile;
}
