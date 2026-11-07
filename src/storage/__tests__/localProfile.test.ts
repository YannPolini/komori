import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Anime } from '../../features/catalog/types';
import { createLocalProfileRepository } from '../../features/library/localRepository';
import { emptyProfile } from '../../features/library/types';
import { createSQLiteRecords, type Database } from '../sqliteRecords';

function connect(path: string) {
  const sqlite = new DatabaseSync(path);
  const db: Database = {
    execAsync: async (sql) => { sqlite.exec(sql); },
    runAsync: async (sql, ...params) => sqlite.prepare(sql).run(...params),
    getFirstAsync: async <T>(sql: string, ...params: (string | number)[]) =>
      (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
  };
  return { store: createSQLiteRecords(async () => db), close: () => sqlite.close() };
}

const title: Anime = {
  id: 7, title: 'Saved title', imageUrl: null, synopsis: 'Read offline', genres: ['Drama'],
  score: 8, year: 2005, startDate: null, endDate: null, episodes: null, airingStatus: 'finished',
};

test('reopens saved edits and title details, isolates accounts and clears only the signed-out account', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'komori-profile-'));
  const path = join(folder, 'test.db');
  let connection = connect(path);
  try {
    const alice = createLocalProfileRepository(connection.store, 'alice', (id) => id === title.id ? title : undefined, () => {});
    const profile = {
      ...emptyProfile(), displayName: 'Alice', genres: ['Drama'],
      statuses: { 7: 'watched' as const }, ratings: { 7: 5 },
      customLists: [{ id: 'a', name: 'Favorites', animeIds: [7] }],
    };
    await alice.save(profile);
    await connection.store.put('catalog-meta', 'genres', ['Drama']);
    connection.close();
    connection = connect(path);

    const restore = jest.fn();
    const reopened = createLocalProfileRepository(connection.store, 'alice', () => undefined, restore);
    const bob = createLocalProfileRepository(connection.store, 'bob', () => undefined, () => {});
    expect(await reopened.load()).toEqual(profile);
    expect(restore).toHaveBeenCalledWith([title]);
    expect(await reopened.readRecord()).toMatchObject({ pendingSync: true });
    expect(await bob.load()).toEqual(emptyProfile());
    await bob.save({ ...emptyProfile(), displayName: 'Bob' });
    await reopened.clear();
    expect(await reopened.readRecord()).toBeNull();
    expect((await bob.load()).displayName).toBe('Bob');
    expect((await connection.store.get('catalog-meta', 'genres'))?.value).toEqual(['Drama']);
  } finally {
    connection.close();
    for (const file of [path, path + '-wal', path + '-shm']) rmSync(file, { force: true });
    rmdirSync(folder);
  }
});

test('prunes expired and excess browse results without touching personal data', async () => {
  const { store, close } = connect(':memory:');
  const time = jest.spyOn(Date, 'now');
  try {
    time.mockReturnValue(10);
    await store.put('catalog-feed', 'expired', [1]);
    await store.put('profile', 'guest', { important: true });
    time.mockReturnValue(20);
    await store.put('catalog-feed', 'older', [2]);
    time.mockReturnValue(30);
    await store.put('catalog-feed', 'newest', [3]);
    await store.prune('catalog-feed', 15, 1);
    expect(await store.get('catalog-feed', 'expired')).toBeNull();
    expect(await store.get('catalog-feed', 'older')).toBeNull();
    expect((await store.get('catalog-feed', 'newest'))?.value).toEqual([3]);
    expect((await store.get('profile', 'guest'))?.value).toEqual({ important: true });
  } finally {
    time.mockRestore();
    close();
  }
});
