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
  genreIds: number[];
  statuses: Record<number, WatchStatus>;
  ratings: Record<number, number>;
  customLists: CustomList[];
}

export const emptyProfile = (): ProfileData => ({
  schemaVersion: SCHEMA_VERSION,
  displayName: '',
  genreIds: [],
  statuses: {},
  ratings: {},
  customLists: [],
});
