import type { Anime, CatalogDate, Genre } from '../features/catalog/types';

// Client for Jikan v4, an unofficial read-only MyAnimeList API: https://docs.api.jikan.moe
// Requests run one at a time with at least one second between them. A rate limit
// response pauses the queue and is retried a limited number of times.

const BASE_URL = 'https://api.jikan.moe/v4';
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

interface JikanDateParts {
  day: number | null;
  month: number | null;
  year: number | null;
}

// Only the fields Komori uses. Jikan marks most of them as nullable.
export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images?: { jpg?: { image_url?: string | null; large_image_url?: string | null } };
  synopsis?: string | null;
  genres?: { mal_id: number; name: string }[];
  score?: number | null;
  year?: number | null;
  episodes?: number | null;
  status?: string | null;
  aired?: { prop?: { from?: JikanDateParts; to?: JikanDateParts } };
}

interface JikanList {
  data: JikanAnime[];
  pagination?: { has_next_page?: boolean };
}

interface JikanGenre {
  mal_id: number;
  name: string;
  count?: number;
}

// MyAnimeList serves this image when a title has no cover.
const MISSING_IMAGE = /\/images\/qm_50\.gif|apple-touch-icon/;

const toDate = (parts: JikanDateParts | undefined): CatalogDate | null =>
  parts?.year ? { year: parts.year, month: parts.month ?? null, day: parts.month ? (parts.day ?? null) : null } : null;

const cleanSynopsis = (text: string | null | undefined) => {
  const cleaned = text?.replace(/\s*\[Written by MAL Rewrite\]\s*$/, '').trim();
  return cleaned ? cleaned : null;
};

export function toAnime(raw: JikanAnime): Anime {
  const image = raw.images?.jpg?.large_image_url || raw.images?.jpg?.image_url || null;
  const startDate = toDate(raw.aired?.prop?.from);
  return {
    id: raw.mal_id,
    title: raw.title_english?.trim() || raw.title,
    imageUrl: image && !MISSING_IMAGE.test(image) ? image : null,
    synopsis: cleanSynopsis(raw.synopsis),
    genres: (raw.genres ?? []).map((g) => g.name),
    score: raw.score ?? null,
    year: startDate?.year ?? raw.year ?? null,
    startDate,
    endDate: toDate(raw.aired?.prop?.to),
    episodes: raw.episodes ?? null,
    airingStatus:
      raw.status === 'Not yet aired' ? 'upcoming' : raw.status === 'Currently Airing' ? 'airing' : 'finished',
  };
}

export type ListFilters = Record<string, string | number | null | undefined>;

export interface AnimeListPage {
  items: Anime[];
  hasNextPage: boolean;
}

export interface JikanClient {
  searchAnime(filters: ListFilters, page: number): Promise<AnimeListPage>;
  getAnime(id: number): Promise<Anime>;
  getGenres(): Promise<Genre[]>;
}

export interface JikanClientOptions {
  fetch?: typeof fetch;
  // Minimum time between two requests, in milliseconds.
  minInterval?: number;
  // Retries after a rate limit response, each waiting twice as long as the one before.
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const queryString = (params: ListFilters) =>
  Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export function createJikanClient({
  fetch: fetchImpl = fetch,
  minInterval = 1000,
  maxRetries = 2,
  retryDelay = 2000,
  timeout = 15000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}: JikanClientOptions = {}): JikanClient {
  let queue: Promise<void> = Promise.resolve();
  let readyAt = 0;
  // Identical requests share one call while it is running.
  const running = new Map<string, Promise<unknown>>();

  // Resolves when it is this request's turn. A rate limit pause moves readyAt forward
  // for everything still waiting.
  const turn = () => {
    queue = queue.then(async () => {
      const wait = readyAt - now();
      if (wait > 0) await sleep(wait);
      readyAt = now() + minInterval;
    });
    return queue;
  };

  const send = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    } catch {
      throw new CatalogError('network', 'The catalog could not be reached.');
    } finally {
      clearTimeout(timer);
    }
  };

  const request = async <T>(path: string): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      await turn();
      const response = await send(BASE_URL + path);
      if (response.status === 429) {
        if (attempt >= maxRetries) throw new CatalogError('rateLimit', 'The catalog is busy. Try again in a moment.');
        readyAt = Math.max(readyAt, now() + retryDelay * 2 ** attempt);
        continue;
      }
      if (response.status === 404) throw new CatalogError('notFound', 'This title could not be found.');
      if (!response.ok) throw new CatalogError('server', `The catalog answered with status ${response.status}.`);
      try {
        return (await response.json()) as T;
      } catch {
        throw new CatalogError('server', 'The catalog sent an unreadable answer.');
      }
    }
  };

  const get = <T>(path: string): Promise<T> => {
    const existing = running.get(path);
    if (existing) return existing as Promise<T>;
    const promise = request<T>(path).finally(() => running.delete(path));
    running.set(path, promise);
    return promise;
  };

  return {
    searchAnime: async (filters, page) => {
      const result = await get<JikanList>(`/anime?${queryString({ ...filters, sfw: 'true', limit: PAGE_SIZE, page })}`);
      return { items: (result.data ?? []).map(toAnime), hasNextPage: !!result.pagination?.has_next_page };
    },
    getAnime: async (id) => toAnime((await get<{ data: JikanAnime }>(`/anime/${id}`)).data),
    getGenres: async () =>
      (await get<{ data: JikanGenre[] }>('/genres/anime?filter=genres')).data
        .map((g) => ({ id: g.mal_id, name: g.name, count: g.count ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export const jikan = createJikanClient();
