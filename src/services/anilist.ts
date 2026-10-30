import type { Anime, CatalogDate } from '../features/catalog/types';

// Client for the AniList GraphQL API: https://docs.anilist.co
// Requests run one at a time with at least one second between them. A rate limit
// response pauses the queue and is retried a limited number of times.

const API_URL = 'https://graphql.anilist.co';
export const PAGE_SIZE = 12;

export type CatalogErrorKind = 'network' | 'rateLimit' | 'notFound' | 'server';

export class CatalogError extends Error {
  kind: CatalogErrorKind;

  constructor(kind: CatalogErrorKind, message: string) {
    super(message);
    this.name = 'CatalogError';
    this.kind = kind;
  }
}

interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

// Only the fields Komori uses. AniList marks most of them as nullable.
export interface AniListMedia {
  id: number;
  title: { english?: string | null; romaji?: string | null };
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  description?: string | null;
  genres?: string[] | null;
  averageScore?: number | null;
  episodes?: number | null;
  status?: string | null;
  startDate?: FuzzyDate | null;
  endDate?: FuzzyDate | null;
}

const MEDIA_FIELDS = `
  id
  title { english romaji }
  coverImage { large extraLarge }
  description(asHtml: false)
  genres
  averageScore
  episodes
  status
  startDate { year month day }
  endDate { year month day }
`;

const SEARCH_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $genre: String, $sort: [MediaSort], $status: MediaStatus,
         $startDate_greater: FuzzyDateInt, $startDate_lesser: FuzzyDateInt, $id_in: [Int]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: ANIME, isAdult: false, search: $search, genre: $genre, sort: $sort, status: $status,
            startDate_greater: $startDate_greater, startDate_lesser: $startDate_lesser, id_in: $id_in) { ${MEDIA_FIELDS} }
    }
  }`;

// Adult titles are left out here too, so a link to one is reported as not found.
const MEDIA_QUERY = `query ($id: Int) { Media(id: $id, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} } }`;

const GENRES_QUERY = 'query { GenreCollection }';

// Adult-only genre, also left out of every list query.
const HIDDEN_GENRES = ['Hentai'];

// AniList serves this image when a title has no cover.
const MISSING_IMAGE = /\/default\.jpg$/;

const toDate = (date: FuzzyDate | null | undefined): CatalogDate | null =>
  date?.year ? { year: date.year, month: date.month ?? null, day: date.month ? (date.day ?? null) : null } : null;

// Descriptions contain line breaks and a few HTML tags even as plain text.
export function cleanDescription(text: string | null | undefined): string | null {
  const cleaned = text
    ?.replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned ? cleaned : null;
}

export function toAnime(media: AniListMedia): Anime {
  const image = media.coverImage?.extraLarge || media.coverImage?.large || null;
  const startDate = toDate(media.startDate);
  return {
    id: media.id,
    title: media.title.english?.trim() || media.title.romaji || 'Untitled',
    imageUrl: image && !MISSING_IMAGE.test(image) ? image : null,
    synopsis: cleanDescription(media.description),
    genres: (media.genres ?? []).filter((g) => !HIDDEN_GENRES.includes(g)),
    // AniList scores are out of 100, the catalog score is shown out of 10.
    score: media.averageScore != null ? media.averageScore / 10 : null,
    year: startDate?.year ?? null,
    startDate,
    endDate: toDate(media.endDate),
    episodes: media.episodes ?? null,
    airingStatus:
      media.status === 'NOT_YET_RELEASED'
        ? 'upcoming'
        : media.status === 'RELEASING' || media.status === 'HIATUS'
          ? 'airing'
          : 'finished',
  };
}

// Variables of the search query. Empty values are left out, so they do not filter.
export interface MediaFilters {
  search?: string;
  genre?: string | null;
  sort: string[];
  status?: string;
  startDate_greater?: number;
  startDate_lesser?: number;
  // Loads these titles in one request, up to one page of them.
  id_in?: number[];
}

export interface AnimeListPage {
  items: Anime[];
  hasNextPage: boolean;
}

export interface CatalogClient {
  // perPage defaults to PAGE_SIZE. AniList allows at most 50.
  searchAnime(filters: MediaFilters, page: number, perPage?: number): Promise<AnimeListPage>;
  getAnime(id: number): Promise<Anime>;
  getGenres(): Promise<string[]>;
}

export interface CatalogClientOptions {
  fetch?: typeof fetch;
  // Minimum time between two requests, in milliseconds.
  minInterval?: number;
  // Retries after a rate limit response, each waiting at least twice as long as the one before.
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const withoutEmpty = (variables: object) =>
  Object.fromEntries(Object.entries(variables).filter(([, v]) => v != null && v !== ''));

export function createAniListClient({
  fetch: fetchImpl = fetch,
  minInterval = 1000,
  maxRetries = 2,
  retryDelay = 2000,
  timeout = 15000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}: CatalogClientOptions = {}): CatalogClient {
  let queue: Promise<unknown> = Promise.resolve();
  let readyAt = 0;
  // Identical requests share one call while it is running.
  const running = new Map<string, Promise<unknown>>();

  // Runs one request at a time, including its retries. A rate limit pause moves readyAt
  // forward, so the next request waits for it too.
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };

  const waitTurn = async () => {
    const wait = readyAt - now();
    if (wait > 0) await sleep(wait);
    readyAt = now() + minInterval;
  };

  // The timeout also covers reading the body, so a stalled answer cannot block the queue.
  const send = async (body: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      let response: Response;
      try {
        response = await fetchImpl(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body,
          signal: controller.signal,
        });
      } catch {
        throw new CatalogError('network', 'The catalog could not be reached.');
      }
      if (!response.ok) return { response, json: null };
      try {
        return { response, json: await response.json() };
      } catch {
        throw new CatalogError('server', 'The catalog sent an unreadable answer.');
      }
    } finally {
      clearTimeout(timer);
    }
  };

  const request = <T>(body: string): Promise<T> =>
    enqueue(async () => {
      for (let attempt = 0; ; attempt++) {
        await waitTurn();
        const { response, json } = await send(body);
        if (response.status === 429) {
          if (attempt >= maxRetries) throw new CatalogError('rateLimit', 'The catalog is busy. Try again in a moment.');
          const retryAfter = Number(response.headers?.get('Retry-After')) * 1000 || 0;
          readyAt = Math.max(readyAt, now() + Math.max(retryAfter, retryDelay * 2 ** attempt));
          continue;
        }
        if (response.status === 404) throw new CatalogError('notFound', 'This title could not be found.');
        if (!response.ok) throw new CatalogError('server', `The catalog answered with status ${response.status}.`);
        const result = json as { data?: T; errors?: unknown[] };
        if (!result?.data || result.errors?.length) {
          throw new CatalogError('server', 'The catalog could not answer the request.');
        }
        return result.data;
      }
    });

  const query = <T>(text: string, variables: object = {}): Promise<T> => {
    const body = JSON.stringify({ query: text, variables: withoutEmpty(variables) });
    const existing = running.get(body);
    if (existing) return existing as Promise<T>;
    const promise = request<T>(body).finally(() => running.delete(body));
    running.set(body, promise);
    return promise;
  };

  type PageData = { Page: { pageInfo: { hasNextPage: boolean }; media: AniListMedia[] } };

  return {
    searchAnime: async (filters, page, perPage = PAGE_SIZE) => {
      const { Page } = await query<PageData>(SEARCH_QUERY, { ...filters, page, perPage });
      return { items: Page.media.map(toAnime), hasNextPage: Page.pageInfo.hasNextPage };
    },
    getAnime: async (id) => {
      const { Media } = await query<{ Media: AniListMedia | null }>(MEDIA_QUERY, { id });
      if (!Media) throw new CatalogError('notFound', 'This title could not be found.');
      return toAnime(Media);
    },
    getGenres: async () =>
      (await query<{ GenreCollection: string[] }>(GENRES_QUERY)).GenreCollection.filter(
        (g) => !HIDDEN_GENRES.includes(g),
      ).sort((a, b) => a.localeCompare(b)),
  };
}

export const anilist = createAniListClient();
