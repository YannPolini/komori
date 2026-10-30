import { anilist, type CatalogClient, type MediaFilters } from '../../services/anilist';
import { addDays, compareDates, fuzzyDate, isRecentRelease, RELEASE_WINDOW_DAYS } from './dates';
import type { Anime, CatalogDate, CatalogPage, CatalogSort } from './types';

// A paged list of titles. The key identifies its loaded pages in the cache, `first`
// is the cursor of page one.
export interface Feed<Cursor> {
  key: string;
  first: Cursor;
  load(cursor: Cursor): Promise<CatalogPage<Cursor>>;
}

// AniList sorts titles by their romaji title; many titles have no English one.
const SORT_ORDER: Record<CatalogSort, string[]> = {
  popularity: ['POPULARITY_DESC'],
  score: ['SCORE_DESC', 'POPULARITY_DESC'],
  title: ['TITLE_ROMAJI'],
};

export interface SearchParams {
  query: string;
  genre: string | null;
  sort: CatalogSort;
}

const pagedFeed = (key: string, filters: MediaFilters, client: CatalogClient, keep?: (a: Anime) => boolean): Feed<number> => ({
  key,
  first: 1,
  load: async (page) => {
    const result = await client.searchAnime(filters, page);
    return { items: keep ? result.items.filter(keep) : result.items, next: result.hasNextPage ? page + 1 : null };
  },
});

export function searchFeed({ query, genre, sort }: SearchParams, client: CatalogClient = anilist): Feed<number> {
  const filters: MediaFilters = { search: query.trim(), genre, sort: SORT_ORDER[sort] };
  return pagedFeed(`search:${JSON.stringify(filters)}`, filters, client);
}

// Titles that premiered in the last 30 days through today, newest first. AniList date
// bounds are exclusive, and titles with only a month or year are filtered out after loading.
export function newReleasesFeed(now: CatalogDate, client: CatalogClient = anilist): Feed<number> {
  const filters: MediaFilters = {
    sort: ['START_DATE_DESC', 'ID'],
    startDate_greater: fuzzyDate(addDays(now, -RELEASE_WINDOW_DAYS - 1)),
    startDate_lesser: fuzzyDate(addDays(now, 1)),
  };
  return pagedFeed(`releases:${fuzzyDate(now)}`, filters, client, (a) => isRecentRelease(a, now));
}

export interface UpcomingCursor {
  dated: boolean;
  page: number;
}

// Upcoming lists future premieres nearest first, then titles without a known date.
// Sorting by start date alone would put the undated titles first.
export function upcomingFeed(now: CatalogDate, client: CatalogClient = anilist): Feed<UpcomingCursor> {
  const base: MediaFilters = { status: 'NOT_YET_RELEASED', sort: ['START_DATE', 'ID'] };
  const isFuture = (a: Anime) => a.startDate != null && compareDates(a.startDate, now) >= 0;

  return {
    key: `upcoming:${fuzzyDate(now)}`,
    first: { dated: true, page: 1 },
    load: async ({ dated, page }) => {
      if (dated) {
        const result = await client.searchAnime({ ...base, startDate_greater: fuzzyDate(addDays(now, -1)) }, page);
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
