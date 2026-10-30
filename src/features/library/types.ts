import type { WatchStatus } from '../catalog/types';

export const SCHEMA_VERSION = 1;

export interface CustomList {
  id: string;
  name: string;
  animeIds: number[];
}

// The user's personal data, shared by all screens and saved through a ProfileRepository.
// Statuses, ratings and custom lists are independent of each other.
export interface ProfileData {
  schemaVersion: number;
  displayName: string;
  // Preferred genres by AniList genre name, at most MAX_PREFERRED_GENRES.
  genres: string[];
  statuses: Record<number, WatchStatus>;
  // Personal ratings from 1 to 5, separate from the catalog score out of 10.
  ratings: Record<number, number>;
  customLists: CustomList[];
}

export const emptyProfile = (): ProfileData => ({
  schemaVersion: SCHEMA_VERSION,
  displayName: '',
  genres: [],
  statuses: {},
  ratings: {},
  customLists: [],
});
