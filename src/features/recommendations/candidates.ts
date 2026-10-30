import { anilist, type CatalogClient } from '../../services/anilist';
import type { Feed } from '../catalog/feeds';
import type { Anime } from '../catalog/types';

export const MAX_CANDIDATES = 100;
const GENRE_CANDIDATES = 25;
const POPULAR_CANDIDATES = 50;

const POPULAR: string[] = ['POPULARITY_DESC'];

// Up to 100 candidates: the most popular titles, then the most popular titles of each
// preferred genre. The feed is a single page, so useFeed loads and caches it once per
// genre selection. Popular titles come first, so the order also serves the fallback.
export function candidatesFeed(genres: string[], client: CatalogClient = anilist): Feed<number> {
  const sorted = [...genres].sort();
  return {
    key: `candidates:${JSON.stringify(sorted)}`,
    first: 1,
    load: async () => {
      const popularCount = Math.min(POPULAR_CANDIDATES, MAX_CANDIDATES - GENRE_CANDIDATES * sorted.length);
      const popular = await client.searchAnime({ sort: POPULAR }, 1, popularCount);
      const byGenre: Anime[][] = [];
      for (const genre of sorted) {
        byGenre.push((await client.searchAnime({ genre, sort: POPULAR }, 1, GENRE_CANDIDATES)).items);
      }
      const seen = new Set<number>();
      const items = [popular.items, ...byGenre]
        .flat()
        .filter((a) => !seen.has(a.id) && seen.add(a.id))
        .slice(0, MAX_CANDIDATES);
      return { items, next: null };
    },
  };
}
