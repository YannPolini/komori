import { MOCK_ANIME } from '../../mock/anime';
import type { Anime } from './types';

// Resolves the anime IDs stored in personal lists. Backed by the mock data for now;
// the catalog issue replaces it with cached catalog entries.
const byId = new Map(MOCK_ANIME.map((a) => [a.id, a]));

export const findAnime = (id: number): Anime | undefined => byId.get(id);
