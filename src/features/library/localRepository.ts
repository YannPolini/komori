import type { Anime } from '../catalog/types';
import type { RecordStore } from '../../storage/records';
import type { ProfileRepository } from './repository';
import { emptyProfile, SCHEMA_VERSION, type ProfileData } from './types';

export interface LocalProfile {
  profile: ProfileData;
  savedTitles: Anime[];
  pendingSync: boolean;
}

export interface LocalProfileRepository extends ProfileRepository {
  readRecord(): Promise<LocalProfile | null>;
  clear(): Promise<void>;
}

export function createLocalProfileRepository(
  store: RecordStore,
  owner: string,
  lookup: (id: number) => Anime | undefined,
  restoreTitles: (titles: Anime[]) => void,
): LocalProfileRepository {
  let queue: Promise<unknown> = Promise.resolve();
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
    return stored;
  }

  return {
    readRecord: () => serial(read),
    load: () => serial(async () => {
      const stored = await read();
      if (stored) restoreTitles(stored.savedTitles);
      return stored?.profile ?? emptyProfile();
    }),
    save: (profile) => serial(async () => {
      const previous = await read();
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
      await store.put<LocalProfile>('profile', owner, { profile, savedTitles, pendingSync: owner !== 'guest' });
    }),
    clear: () => serial(() => store.remove('profile', owner)),
  };
}
