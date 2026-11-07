import { records } from '../../storage/store';
import type { Anime } from './types';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const DAY = WEEK / 7;

export interface CachedFeed {
  items: Anime[];
  next: unknown;
}

async function recent<T>(scope: string, key: string) {
  try {
    const row = await records.get<T>(scope, key);
    return row && Date.now() - row.updatedAt < WEEK ? row : null;
  } catch {
    // An unavailable public cache must not block live catalog use.
    return null;
  }
}

export const readFeed = (key: string) => recent<CachedFeed>('catalog-feed', key);
export const readTitle = (id: number) => recent<Anime>('catalog-title', String(id));
export const readGenres = () => recent<string[]>('catalog-meta', 'genres');
export const isStale = (updatedAt: number) => Date.now() - updatedAt >= DAY;

let lastPrune = 0;
function pruneCache() {
  if (Date.now() - lastPrune < DAY) return;
  lastPrune = Date.now();
  const before = Date.now() - WEEK;
  void Promise.all([records.prune('catalog-feed', before, 40), records.prune('catalog-title', before, 600)])
    .catch(() => { lastPrune = 0; });
}

export function cacheFeed(key: string, feed: CachedFeed) {
  // Keep the last complete cached slice and its matching cursor.
  if (feed.items.length <= 120) void records.put('catalog-feed', key, feed).then(pruneCache).catch(() => {});
}

export function cacheTitles(titles: Anime[]) {
  for (const title of titles) void records.put('catalog-title', String(title.id), title).catch(() => {});
  pruneCache();
}

export function cacheGenres(genres: string[]) {
  void records.put('catalog-meta', 'genres', genres).catch(() => {});
}
