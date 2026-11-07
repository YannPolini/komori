import type { Anime } from '../catalog/types';
import type { RecordStore } from '../../storage/records';
import type { ProfileRepository } from './repository';
import { emptyProfile, SCHEMA_VERSION, type ProfileData } from './types';

export interface LocalProfile {
  profile: ProfileData;
  savedTitles: Anime[];
  pendingSync: boolean;
  editVersion: number;
  cloudRevision: number;
}

export interface LocalProfileRepository extends ProfileRepository {
  readRecord(): Promise<LocalProfile | null>;
  acknowledgeCloud(editVersion: number, revision: number): Promise<boolean>;
  acceptCloud(profile: ProfileData, revision: number, expectedEdit: number): Promise<boolean>;
  clear(): Promise<void>;
}

export function createLocalProfileRepository(
  store: RecordStore,
  owner: string,
  lookup: (id: number) => Anime | undefined,
  restoreTitles: (titles: Anime[]) => void,
): LocalProfileRepository {
  let queue: Promise<unknown> = Promise.resolve();
  let retired = false;
  function serial<T>(run: () => Promise<T>): Promise<T> {
    const next = queue.then(run, run);
    queue = next;
    return next;
  }

  async function read() {
    const stored = (await store.get<LocalProfile>('profile', owner))?.value ?? null;
    if (stored && stored.profile.schemaVersion !== SCHEMA_VERSION) {
      throw new Error('Unsupported local profile format');
    }
    return stored ? { ...stored, editVersion: stored.editVersion ?? 0, cloudRevision: stored.cloudRevision ?? 0 } : null;
  }

  async function write(profile: ProfileData, previous: LocalProfile | null, pendingSync: boolean, cloudRevision: number) {
    const saved = new Map(previous?.savedTitles.map((title) => [title.id, title]));
    const ids = new Set([
      ...Object.keys(profile.statuses).map(Number),
      ...Object.keys(profile.ratings).map(Number),
      ...profile.customLists.flatMap((list) => list.animeIds),
    ]);
    const savedTitles = [...ids].flatMap((id) => {
      const title = lookup(id) ?? saved.get(id);
      return title ? [title] : [];
    });
    await store.put<LocalProfile>('profile', owner, {
      profile, savedTitles, pendingSync, cloudRevision, editVersion: (previous?.editVersion ?? 0) + 1,
    });
  }

  return {
    readRecord: () => serial(read),
    load: () => serial(async () => {
      const stored = await read();
      if (stored) restoreTitles(stored.savedTitles);
      return stored?.profile ?? emptyProfile();
    }),
    save: (profile) => serial(async () => {
      if (retired) throw new Error('This profile has been signed out');
      const previous = await read();
      await write(profile, previous, owner !== 'guest', previous?.cloudRevision ?? 0);
    }),
    acknowledgeCloud: (editVersion, revision) => serial(async () => {
      const current = await read();
      if (retired || !current) return false;
      const stillPending = current.editVersion !== editVersion;
      await store.put<LocalProfile>('profile', owner, { ...current, pendingSync: stillPending, cloudRevision: revision });
      return stillPending;
    }),
    acceptCloud: (profile, revision, expectedEdit) => serial(async () => {
      const current = await read();
      if (retired || (current?.editVersion ?? 0) !== expectedEdit) return false;
      await write(profile, current, false, revision);
      return true;
    }),
    clear: () => serial(async () => {
      await store.remove('profile', owner);
      retired = true;
    }),
  };
}
