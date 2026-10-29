import { jikan, PAGE_SIZE, type JikanClient, type ListFilters } from '../../services/jikan';
import { compareDates, isoDate, isRecentRelease, RELEASE_WINDOW_DAYS, addDays } from './dates';
import type { Anime, CatalogDate, CatalogPage, CatalogSort } from './types';

// A paged list of titles. The key identifies its loaded pages in the cache, `first`
// is the cursor of page one.
export interface Feed<Cursor> {
  key: string;
  first: Cursor;
  load(cursor: Cursor): Promise<CatalogPage<Cursor>>;
}

const SORT_FILTERS: Record<CatalogSort, ListFilters> = {
  popularity: { order_by: 'members', sort: 'desc' },
  score: { order_by: 'score', sort: 'desc' },
  title: { order_by: 'title', sort: 'asc' },
};

export interface SearchParams {
  query: string;
  genreId: number | null;
  sort: CatalogSort;
}

export function searchFeed({ query, genreId, sort }: SearchParams, client: JikanClient = jikan): Feed<number> {
  const filters = { q: query.trim(), genres: genreId, ...SORT_FILTERS[sort] };
  return {
    key: `search:${JSON.stringify(filters)}`,
    first: 1,
    load: async (page) => {
      const result = await client.searchAnime(filters, page);
      return { items: result.items, next: result.hasNextPage ? page + 1 : null };
    },
  };
}

interface Source {
  page: number;
  buffer: Anime[];
  done: boolean;
}

export type ReleasesCursor = Source[];

// New releases merge currently airing and finished titles that premiered in the last
// 30 days, newest first. A single date query would also return every upcoming title
// with a known date ahead of them.
export function newReleasesFeed(now: CatalogDate, client: JikanClient = jikan): Feed<ReleasesCursor> {
  const since = isoDate(addDays(now, -RELEASE_WINDOW_DAYS));
  const filters: ListFilters[] = ['airing', 'complete'].map((status) => ({
    status,
    start_date: since,
    order_by: 'start_date',
    sort: 'desc',
  }));
  const newestFirst = (a: Anime, b: Anime) => compareDates(b.startDate!, a.startDate!) || a.id - b.id;

  return {
    key: `releases:${isoDate(now)}`,
    first: filters.map(() => ({ page: 1, buffer: [], done: false })),
    load: async (cursor) => {
      const sources = cursor.map((s) => ({ ...s, buffer: [...s.buffer] }));
      const items: Anime[] = [];
      while (items.length < PAGE_SIZE) {
        // Every unfinished source needs a buffered title, or the order could be wrong.
        for (const [i, source] of sources.entries()) {
          while (!source.buffer.length && !source.done) {
            const result = await client.searchAnime(filters[i], source.page);
            source.buffer = result.items.filter((a) => isRecentRelease(a, now));
            source.page += 1;
            source.done = !result.hasNextPage;
          }
        }
        const heads = sources.filter((s) => s.buffer.length);
        if (!heads.length) break;
        const newest = heads.reduce((a, b) => (newestFirst(a.buffer[0], b.buffer[0]) <= 0 ? a : b));
        items.push(newest.buffer.shift()!);
      }
      const more = sources.some((s) => s.buffer.length || !s.done);
      return { items, next: more ? sources : null };
    },
  };
}

export interface UpcomingCursor {
  dated: boolean;
  page: number;
}

// Upcoming lists future premieres nearest first, then titles without a known date.
// Sorting by start date alone would put the undated titles first.
export function upcomingFeed(now: CatalogDate, client: JikanClient = jikan): Feed<UpcomingCursor> {
  const base = { status: 'upcoming', order_by: 'start_date', sort: 'asc' };
  const isFuture = (a: Anime) => a.startDate != null && compareDates(a.startDate, now) >= 0;

  return {
    key: `upcoming:${isoDate(now)}`,
    first: { dated: true, page: 1 },
    load: async ({ dated, page }) => {
      if (dated) {
        const result = await client.searchAnime({ ...base, start_date: isoDate(now) }, page);
        return {
          items: result.items.filter(isFuture),
          next: result.hasNextPage ? { dated, page: page + 1 } : { dated: false, page: 1 },
        };
      }
      // Undated titles come first in this query. Dated ones were listed above, so the
      // feed ends at the first future date.
      const result = await client.searchAnime(base, page);
      const reachedDated = result.items.findIndex(isFuture);
      const items = reachedDated < 0 ? result.items : result.items.slice(0, reachedDated);
      return { items, next: reachedDated < 0 && result.hasNextPage ? { dated, page: page + 1 } : null };
    },
  };
}
