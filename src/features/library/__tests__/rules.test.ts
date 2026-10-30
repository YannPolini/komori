import { libraryReducer } from '../reducer';
import { createMemoryRepository } from '../repository';
import {
  addToList,
  canRate,
  clearRating,
  clearStatus,
  counts,
  createList,
  deleteList,
  listAnimeIds,
  moveToList,
  quickSave,
  removeFromList,
  renameList,
  setRating,
  setStatus,
  togglePreferredGenre,
  validateListName,
} from '../rules';
import type { Anime } from '../../catalog/types';
import { emptyProfile, type ProfileData } from '../types';
import { randomUUID } from '../uuid';

const profileWith = (patch: Partial<ProfileData> = {}): ProfileData => ({ ...emptyProfile(), ...patch });

const created = (profile: ProfileData, name: string, id: string) => {
  const result = createList(profile, name, id);
  if (!result.ok) throw new Error(result.error);
  return result.profile;
};

describe('watch status', () => {
  it('keeps exactly one status per title', () => {
    let p = setStatus(profileWith(), 1, 'plan');
    p = setStatus(p, 1, 'watching');
    expect(p.statuses).toEqual({ 1: 'watching' });
    expect(listAnimeIds(p, 'plan')).toEqual([]);
    expect(listAnimeIds(p, 'watching')).toEqual([1]);
  });

  it('moves the title between built-in lists and updates counts', () => {
    let p = setStatus(profileWith(), 1, 'plan');
    p = setStatus(p, 2, 'plan');
    expect(counts(p)).toMatchObject({ plan: 2, watching: 0, watched: 0 });
    p = setStatus(p, 2, 'watched');
    expect(counts(p)).toMatchObject({ plan: 1, watching: 0, watched: 1 });
  });

  it('quick-save adds an untracked title to Plan to watch', () => {
    expect(quickSave(profileWith(), 7).statuses).toEqual({ 7: 'plan' });
  });

  it('quick-save leaves a tracked title unchanged', () => {
    const p = profileWith({ statuses: { 7: 'watched' } });
    expect(quickSave(p, 7)).toBe(p);
  });

  it('removing a status keeps ratings and custom lists', () => {
    const p = profileWith({
      statuses: { 1: 'watched', 2: 'plan' },
      ratings: { 1: 4 },
      customLists: [{ id: 'a', name: 'Favourites', animeIds: [1] }],
    });
    const next = clearStatus(p, 1);
    expect(next.statuses).toEqual({ 2: 'plan' });
    expect(next.ratings).toBe(p.ratings);
    expect(next.customLists).toBe(p.customLists);
  });
});

describe('list name validation', () => {
  it('trims names', () => {
    expect(validateListName('  Cozy  ', [])).toEqual({ ok: true, name: 'Cozy' });
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateListName('', []).ok).toBe(false);
    expect(validateListName('   ', []).ok).toBe(false);
  });

  it('allows 40 characters after trimming and rejects 41', () => {
    expect(validateListName(` ${'a'.repeat(40)} `, []).ok).toBe(true);
    expect(validateListName('a'.repeat(41), []).ok).toBe(false);
  });

  it('rejects duplicates case-insensitively', () => {
    const lists = [{ id: 'a', name: 'Cozy evenings', animeIds: [] }];
    expect(validateListName('COZY EVENINGS', lists).ok).toBe(false);
    expect(validateListName(' cozy evenings ', lists).ok).toBe(false);
  });

  it('rejects built-in list names', () => {
    expect(validateListName('plan to watch', []).ok).toBe(false);
    expect(validateListName('Watching', []).ok).toBe(false);
    expect(validateListName('WATCHED', []).ok).toBe(false);
  });

  it('lets a renamed list keep its own name with different casing', () => {
    const p = created(profileWith(), 'Cozy', 'a');
    const result = renameList(p, 'a', 'COZY');
    expect(result.ok && result.profile.customLists[0].name).toBe('COZY');
  });

  it('rejects renaming to another list name', () => {
    const p = created(created(profileWith(), 'Cozy', 'a'), 'Rewatch', 'b');
    expect(renameList(p, 'b', 'cozy').ok).toBe(false);
  });
});

describe('custom lists', () => {
  it('creates a list with a trimmed name and no titles', () => {
    const p = created(profileWith(), '  Rewatch ', 'a');
    expect(p.customLists).toEqual([{ id: 'a', name: 'Rewatch', animeIds: [] }]);
  });

  it('keeps a title once per list and allows several lists', () => {
    let p = created(created(profileWith(), 'A', 'a'), 'B', 'b');
    p = addToList(p, 'a', 1);
    p = addToList(p, 'a', 1);
    p = addToList(p, 'b', 1);
    expect(listAnimeIds(p, 'a')).toEqual([1]);
    expect(listAnimeIds(p, 'b')).toEqual([1]);
    expect(counts(p)).toMatchObject({ a: 1, b: 1 });
  });

  it('adding and removing titles keeps status and rating', () => {
    const base = created(profileWith({ statuses: { 1: 'watching' }, ratings: { 1: 5 } }), 'A', 'a');
    const added = addToList(base, 'a', 1);
    const removed = removeFromList(added, 'a', 1);
    for (const p of [added, removed]) {
      expect(p.statuses).toBe(base.statuses);
      expect(p.ratings).toBe(base.ratings);
    }
    expect(listAnimeIds(removed, 'a')).toEqual([]);
  });

  it('moves a title to another custom list', () => {
    let p = created(created(profileWith(), 'A', 'a'), 'B', 'b');
    p = moveToList(addToList(p, 'a', 1), 'a', 'b', 1);
    expect(listAnimeIds(p, 'a')).toEqual([]);
    expect(listAnimeIds(p, 'b')).toEqual([1]);
  });

  it('deleting a list removes only the list and its memberships', () => {
    let p = created(created(profileWith({ statuses: { 1: 'plan' }, ratings: { 1: 3 } }), 'A', 'a'), 'B', 'b');
    p = addToList(addToList(p, 'a', 1), 'b', 1);
    const next = deleteList(p, 'a');
    expect(next.customLists.map((l) => l.id)).toEqual(['b']);
    expect(listAnimeIds(next, 'b')).toEqual([1]);
    expect(next.statuses).toBe(p.statuses);
    expect(next.ratings).toBe(p.ratings);
  });
});

describe('library reducer', () => {
  it('ignores changes before the profile is loaded', () => {
    const state = { status: 'loading' } as const;
    expect(libraryReducer(state, { type: 'quickSave', animeId: 1 })).toBe(state);
  });

  it('ignores invalid list names', () => {
    const state = { status: 'ready', profile: profileWith() } as const;
    expect(libraryReducer(state, { type: 'createList', id: 'a', name: 'Watched' })).toBe(state);
  });
});

describe('memory repository', () => {
  it('returns copies of the saved profile', async () => {
    const repo = createMemoryRepository();
    const p = setStatus(profileWith(), 1, 'plan');
    await repo.save(p);
    const loaded = await repo.load();
    expect(loaded).toEqual(p);
    expect(loaded).not.toBe(p);
  });
});

it('creates distinct v4 UUIDs', () => {
  const a = randomUUID();
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(randomUUID()).not.toBe(a);
});

describe('ratings', () => {
  it('sets, changes and clears a rating from 1 to 5', () => {
    let p = setRating(profileWith(), 1, 3);
    expect(p.ratings).toEqual({ 1: 3 });
    p = setRating(p, 1, 5);
    expect(p.ratings).toEqual({ 1: 5 });
    expect(clearRating(p, 1).ratings).toEqual({});
  });

  it('rejects values outside 1 to 5 and fractions', () => {
    const p = profileWith({ ratings: { 1: 2 } });
    for (const value of [0, 6, 2.5, -1, NaN]) expect(setRating(p, 1, value)).toBe(p);
  });

  it('leaves watch status and lists unchanged', () => {
    const p = profileWith({ statuses: { 1: 'watched' }, customLists: [{ id: 'a', name: 'A', animeIds: [1] }] });
    const rated = setRating(p, 1, 4);
    expect(rated.statuses).toBe(p.statuses);
    expect(rated.customLists).toBe(p.customLists);
    expect(clearRating(rated, 1).statuses).toBe(p.statuses);
  });

  it('only allows rating released titles', () => {
    const now = { year: 2026, month: 10, day: 29 };
    const title = (patch: Partial<Anime>): Anime => ({
      id: 1,
      title: 'T',
      imageUrl: null,
      synopsis: null,
      genres: [],
      score: null,
      year: null,
      startDate: null,
      endDate: null,
      episodes: null,
      airingStatus: 'finished',
      ...patch,
    });
    expect(canRate(title({ startDate: { year: 2026, month: 10, day: 29 }, airingStatus: 'upcoming' }), now)).toBe(true);
    expect(canRate(title({ startDate: { year: 2026, month: 10, day: 30 }, airingStatus: 'airing' }), now)).toBe(false);
    expect(canRate(title({ startDate: null, airingStatus: 'upcoming' }), now)).toBe(false);
    expect(canRate(title({ startDate: { year: 2027, month: null, day: null }, airingStatus: 'upcoming' }), now)).toBe(false);
    expect(canRate(title({ startDate: null, airingStatus: 'airing' }), now)).toBe(true);
  });
});

describe('preferred genres', () => {
  it('adds and removes genres, at most three', () => {
    let p = profileWith();
    for (const g of ['Action', 'Drama', 'Comedy']) p = togglePreferredGenre(p, g);
    expect(togglePreferredGenre(p, 'Romance')).toBe(p);
    p = togglePreferredGenre(p, 'Drama');
    expect(p.genres).toEqual(['Action', 'Comedy']);
    expect(togglePreferredGenre(p, 'Romance').genres).toEqual(['Action', 'Comedy', 'Romance']);
  });
});
