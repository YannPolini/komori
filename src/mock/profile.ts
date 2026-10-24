import { emptyProfile, type ProfileData } from '../features/library/types';

// Demo profile for the in-memory repository, replaced by stored data in the offline storage issue.
export const MOCK_PROFILE: ProfileData = {
  ...emptyProfile(),
  statuses: { 1: 'watching', 3: 'watched', 4: 'plan' },
  customLists: [{ id: '8d3f6c1e-2b7a-4c59-9e0d-5a1b2c3d4e5f', name: 'Cozy evenings', animeIds: [5, 12] }],
};
