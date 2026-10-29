import type { AnimeListPage, JikanClient, ListFilters } from '../../../services/jikan';
import { formatDate, isRecentRelease } from '../dates';
import { newReleasesFeed, searchFeed, upcomingFeed, type Feed } from '../feeds';
import type { Anime, CatalogDate } from '../types';

const NOW: CatalogDate = { year: 2026, month: 10, day: 29 };

const anime = (id: number, start: [number, number?, number?] | null = null): Anime => ({
  id,
  title: `Title ${id}`,
  imageUrl: null,
  synopsis: null,
  genres: [],
  score: null,
  year: start?.[0] ?? null,
  startDate: start ? { year: start[0], month: start[1] ?? null, day: start[2] ?? null } : null,
  endDate: null,
  episodes: null,
  airingStatus: 'upcoming',
});

// A fake client that answers each query from its pages, picked by the status filter.
function fakeClient(pages: Record<string, AnimeListPage[]>) {
  const calls: [ListFilters, number][] = [];
  const searchAnime = jest.fn(async (filters: ListFilters, page: number) => {
    calls.push([filters, page]);
    const key = `${filters.status ?? 'all'}${filters.start_date ? '+date' : ''}`;
    return pages[key]?.[page - 1] ?? { items: [], hasNextPage: false };
  });
  const client: JikanClient = { searchAnime, getAnime: jest.fn(), getGenres: jest.fn() };
  return { client, calls };
}

async function loadAll<C>(feed: Feed<C>, maxPages = 10) {
  const pages: number[][] = [];
  let cursor: C | null = feed.first;
  while (cursor !== null && pages.length < maxPages) {
    const page: { items: Anime[]; next: C | null } = await feed.load(cursor);
    pages.push(page.items.map((a) => a.id));
    cursor = page.next;
  }
  return pages;
}

describe('release dates', () => {
  it('counts the last 30 days through today as new releases', () => {
    expect(isRecentRelease(anime(1, [2026, 9, 29]), NOW)).toBe(true);
    expect(isRecentRelease(anime(1, [2026, 10, 29]), NOW)).toBe(true);
    expect(isRecentRelease(anime(1, [2026, 9, 28]), NOW)).toBe(false);
    expect(isRecentRelease(anime(1, [2026, 10, 30]), NOW)).toBe(false);
  });

  it('excludes unknown and partial premiere dates from new releases', () => {
    expect(isRecentRelease(anime(1), NOW)).toBe(false);
    expect(isRecentRelease(anime(1, [2026, 10]), NOW)).toBe(false);
  });

  it('formats full, partial and unknown dates', () => {
    expect(formatDate({ year: 2026, month: 4, day: 3 })).toBe('Apr 3, 2026');
    expect(formatDate({ year: 2026, month: 4, day: null })).toBe('Apr 2026');
    expect(formatDate({ year: 2027, month: null, day: null })).toBe('2027');
    expect(formatDate(null)).toBe('Date unknown');
  });
});

describe('search feed', () => {
  it('maps the sort order and continues while the provider has pages', async () => {
    const { client, calls } = fakeClient({
      all: [
        { items: [anime(1)], hasNextPage: true },
        { items: [anime(2)], hasNextPage: false },
      ],
    });
    const feed = searchFeed({ query: ' frieren ', genreId: 10, sort: 'title' }, client);
    expect(await loadAll(feed)).toEqual([[1], [2]]);
    expect(calls[0]).toEqual([{ q: 'frieren', genres: 10, order_by: 'title', sort: 'asc' }, 1]);
  });

  it('uses a different cache key for each filter', () => {
    const { client } = fakeClient({});
    const keys = new Set([
      searchFeed({ query: '', genreId: null, sort: 'popularity' }, client).key,
      searchFeed({ query: '', genreId: 1, sort: 'popularity' }, client).key,
      searchFeed({ query: '', genreId: null, sort: 'score' }, client).key,
      searchFeed({ query: 'a', genreId: null, sort: 'popularity' }, client).key,
    ]);
    expect(keys.size).toBe(4);
  });
});

describe('new releases feed', () => {
  it('merges airing and finished titles newest first within the window', async () => {
    const { client, calls } = fakeClient({
      'airing+date': [
        { items: [anime(1, [2026, 10, 28]), anime(2, [2026, 10, 5])], hasNextPage: true },
        { items: [anime(3, [2026, 10, 1])], hasNextPage: false },
      ],
      'complete+date': [{ items: [anime(4, [2026, 10, 20]), anime(5, [2026, 10])], hasNextPage: false }],
    });
    const feed = newReleasesFeed(NOW, client);
    expect((await loadAll(feed)).flat()).toEqual([1, 4, 2, 3]);
    expect(calls[0][0]).toMatchObject({ status: 'airing', start_date: '2026-09-29', order_by: 'start_date', sort: 'desc' });
  });

  it('pages 12 titles at a time', async () => {
    const titles = Array.from({ length: 15 }, (_, i) => anime(i + 1, [2026, 10, 28 - i]));
    const { client } = fakeClient({ 'airing+date': [{ items: titles, hasNextPage: false }] });
    const pages = await loadAll(newReleasesFeed(NOW, client));
    expect(pages.map((p) => p.length)).toEqual([12, 3]);
  });
});

describe('upcoming feed', () => {
  it('lists future dates nearest first, then titles without a date', async () => {
    const { client } = fakeClient({
      'upcoming+date': [
        { items: [anime(1, [2026, 11, 2]), anime(2, [2027, 1])], hasNextPage: true },
        { items: [anime(3, [2027])], hasNextPage: false },
      ],
      // Sorted by start date, so undated titles come first and dated ones repeat after them.
      upcoming: [
        { items: [anime(4), anime(5)], hasNextPage: true },
        { items: [anime(6), anime(1, [2026, 11, 2]), anime(2, [2027, 1])], hasNextPage: true },
      ],
    });
    expect(await loadAll(upcomingFeed(NOW, client))).toEqual([[1, 2], [3], [4, 5], [6]]);
  });
});
