import type { RecordStore } from '../../../storage/records';
import { createLocalProfileRepository } from '../../library/localRepository';
import { emptyProfile, type ProfileData } from '../../library/types';
import { syncProfile, type CloudProfile, type CloudProfiles } from '../sync';

function device() {
  const rows = new Map<string, unknown>();
  const store: RecordStore = {
    async get<T>(scope: string, key: string) {
      return rows.has(scope + key) ? { value: structuredClone(rows.get(scope + key)) as T, updatedAt: 0 } : null;
    },
    put: async (scope, key, value) => { rows.set(scope + key, structuredClone(value)); },
    remove: async (scope, key) => { rows.delete(scope + key); },
    prune: async () => {},
  };
  return createLocalProfileRepository(store, 'signed-in-user', () => undefined, () => {});
}

const named = (name: string): ProfileData => ({ ...emptyProfile(), displayName: name });

function server() {
  let row: CloudProfile | null = null;
  const remote: CloudProfiles = {
    read: async () => row,
    save: async (expected, profile) => {
      if ((row?.revision ?? 0) !== expected) return null;
      row = { revision: expected + 1, profile };
      return row.revision;
    },
  };
  return remote;
}

test('two devices keep conflicting edits until the user picks a copy', async () => {
  const first = device();
  const second = device();
  const remote = server();
  await first.save(named('First saved profile'));
  expect(await syncProfile(first, remote)).toEqual({ status: 'up-to-date' });
  await syncProfile(second, remote);
  expect((await second.load()).displayName).toBe('First saved profile');

  await first.save(named('First device edit'));
  await second.save(named('Second device edit'));
  await syncProfile(first, remote);
  const conflict = await syncProfile(second, remote);
  expect(conflict.status).toBe('conflict');
  if (conflict.status !== 'conflict') throw new Error('Missing conflict');
  expect((await second.load()).displayName).toBe('Second device edit');
  expect((await remote.read())?.profile.displayName).toBe('First device edit');

  // Another write after the prompt makes Keep this device conflict again.
  await first.save(named('Newer cloud edit'));
  await syncProfile(first, remote);
  const updated = await syncProfile(second, remote, { use: 'device', seen: conflict.cloud });
  expect(updated.status).toBe('conflict');
  if (updated.status !== 'conflict') throw new Error('Missing newer conflict');
  await syncProfile(second, remote, { use: 'cloud', seen: updated.cloud });
  expect((await second.load()).displayName).toBe('Newer cloud edit');
  expect((await second.readRecord())?.pendingSync).toBe(false);
});

test('a new edit made during an upload stays pending and uploads on the new revision', async () => {
  const local = device();
  const remote = server();
  await local.save(named('First edit'));
  const duringUpload: CloudProfiles = {
    read: remote.read,
    save: async (expected, profile) => {
      await local.save(named('Second edit'));
      return remote.save(expected, profile);
    },
  };
  expect(await syncProfile(local, duringUpload)).toEqual({ status: 'pending' });
  expect(await local.readRecord()).toMatchObject({ pendingSync: true, cloudRevision: 1 });
  expect((await local.load()).displayName).toBe('Second edit');
  expect(await syncProfile(local, remote)).toEqual({ status: 'up-to-date' });
  expect(await remote.read()).toMatchObject({ revision: 2, profile: { displayName: 'Second edit' } });
});

test('a failed upload preserves the pending edit and can be retried', async () => {
  const local = device();
  const remote = server();
  await local.save(named('Saved offline'));
  await expect(syncProfile(local, { ...remote, save: async () => { throw new Error('No network'); } })).rejects.toThrow('No network');
  expect(await local.readRecord()).toMatchObject({ pendingSync: true, cloudRevision: 0 });
  expect((await local.load()).displayName).toBe('Saved offline');
  await syncProfile(local, remote);
  expect((await local.readRecord())?.pendingSync).toBe(false);
});
