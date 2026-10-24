import { emptyProfile, type ProfileData } from './types';

// Storage boundary for the profile. Screens only use the library context, never a repository.
export interface ProfileRepository {
  load(): Promise<ProfileData>;
  save(profile: ProfileData): Promise<void>;
}

// Copies through JSON so callers never share objects with the store, like a real database.
const copy = (profile: ProfileData): ProfileData => JSON.parse(JSON.stringify(profile));

// Keeps the profile for the current app session only. The SQLite repository from the
// offline storage issue implements the same interface.
export function createMemoryRepository(initial: ProfileData = emptyProfile()): ProfileRepository {
  let stored = copy(initial);
  return {
    load: async () => copy(stored),
    save: async (profile) => {
      stored = copy(profile);
    },
  };
}
