import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { anilist, CatalogError } from '../../services/anilist';
import type { Feed } from './feeds';
import { findAnime, rememberAnime } from './lookup';
import type { Anime } from './types';

interface LoadedFeed {
  items: Anime[];
  next: unknown;
}

// Pages loaded in this app session, so going back or retrying never loses results.
const loadedFeeds = new Map<string, LoadedFeed>();
const runningFeeds = new Map<string, Promise<void>>();

// Feeds that filter after loading can return an empty page while more titles follow.
// Those pages are skipped, so a preview is never empty too early.
async function loadFilledPage<C>(feed: Feed<C>, cursor: C) {
  let page = await feed.load(cursor);
  for (let skipped = 0; !page.items.length && page.next !== null && skipped < 3; skipped++) {
    page = await feed.load(page.next);
  }
  return page;
}

function loadNextPage<C>(feed: Feed<C>): Promise<void> {
  const running = runningFeeds.get(feed.key);
  if (running) return running;
  const loaded = loadedFeeds.get(feed.key);
  if (loaded && loaded.next === null) return Promise.resolve();

  const promise = loadFilledPage(feed, loaded ? (loaded.next as C) : feed.first)
    .then((page) => {
      rememberAnime(page.items);
      // Provider pages can overlap when titles share a sort value.
      const items = loaded?.items ?? [];
      const seen = new Set(items.map((a) => a.id));
      loadedFeeds.set(feed.key, { items: [...items, ...page.items.filter((a) => !seen.has(a.id))], next: page.next });
    })
    .finally(() => runningFeeds.delete(feed.key));
  runningFeeds.set(feed.key, promise);
  return promise;
}

export interface FeedState {
  // 'error' only when nothing is loaded yet. Later failures keep the items and set loadMoreFailed.
  status: 'loading' | 'error' | 'ready';
  items: Anime[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  loadMore: () => void;
  retry: () => void;
}

export function useFeed<C>(feed: Feed<C>): FeedState {
  const { key } = feed;
  const latest = useRef(feed);
  latest.current = feed;
  const [request, setRequest] = useState({ key, loading: false, failed: false });

  const load = useCallback(() => {
    const current = latest.current;
    setRequest({ key: current.key, loading: true, failed: false });
    // Answers for a feed the screen has left are cached but do not change its state.
    const settle = (failed: boolean) =>
      setRequest((r) => (r.key === current.key ? { key: current.key, loading: false, failed } : r));
    loadNextPage(current).then(
      () => settle(false),
      () => settle(true),
    );
  }, []);

  useEffect(() => {
    if (!loadedFeeds.has(key)) load();
  }, [key, load]);

  const loaded = loadedFeeds.get(key);
  const { loading, failed } = request.key === key ? request : { loading: false, failed: false };
  return {
    status: loaded ? 'ready' : failed ? 'error' : 'loading',
    items: loaded?.items ?? [],
    hasMore: loaded != null && loaded.next !== null,
    loadingMore: loaded != null && loading,
    loadMoreFailed: loaded != null && failed,
    loadMore: load,
    retry: load,
  };
}

export type AnimeState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; anime: Anime };

// Details use the entry loaded with the search results when there is one.
export function useAnime(id: number): AnimeState {
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  const [result, setResult] = useState<{ id: number; error?: 'notFound' | 'failed' } | null>(null);
  const cached = findAnime(id);

  useEffect(() => {
    if (findAnime(id) || !Number.isInteger(id)) return;
    let active = true;
    setResult(null);
    anilist.getAnime(id).then(
      (anime) => {
        rememberAnime([anime]);
        if (active) setResult({ id });
      },
      (e) => active && setResult({ id, error: e instanceof CatalogError && e.kind === 'notFound' ? 'notFound' : 'failed' }),
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (cached) return { status: 'ready', anime: cached };
  if (!Number.isInteger(id) || (result?.id === id && result.error === 'notFound')) return { status: 'notFound' };
  if (result?.id === id && result.error) return { status: 'error', retry };
  return { status: 'loading' };
}

export interface AnimeEntries {
  anime: Anime[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
}

// AniList's largest page, so a list loads with one request per 50 uncached titles.
const ENTRY_BATCH = 50;

// Resolves the IDs of a personal list, loading entries that are not cached yet.
export function useAnimeEntries(ids: number[]): AnimeEntries {
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  const [, update] = useReducer((n: number) => n + 1, 0);
  const [state, setState] = useState({ loading: false, failed: false });
  const missingKey = ids.filter((id) => !findAnime(id)).join(',');

  useEffect(() => {
    if (!missingKey) return;
    let active = true;
    setState({ loading: true, failed: false });
    const missing = missingKey.split(',').map(Number);
    const requests: Promise<void>[] = [];
    for (let i = 0; i < missing.length; i += ENTRY_BATCH) {
      const batch = missing.slice(i, i + ENTRY_BATCH);
      requests.push(
        anilist.searchAnime({ id_in: batch, sort: ['ID'] }, 1, ENTRY_BATCH).then((page) => rememberAnime(page.items)),
      );
    }
    // Titles the catalog no longer returns, e.g. removed entries, count as failed.
    Promise.allSettled(requests).then((results) => {
      if (!active) return;
      const failed = results.some((r) => r.status === 'rejected') || missing.some((id) => !findAnime(id));
      update();
      setState({ loading: false, failed });
    });
    return () => {
      active = false;
    };
  }, [attempt, missingKey]);

  return {
    anime: ids.map(findAnime).filter((a): a is Anime => a != null),
    loading: missingKey !== '' && state.loading,
    failed: missingKey !== '' && state.failed,
    retry,
  };
}

let genres: string[] | null = null;

export type GenresState = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; genres: string[] };

export function useGenres(): GenresState {
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState(false);
  const [, update] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (genres) return;
    let active = true;
    setFailed(false);
    anilist.getGenres().then(
      (result) => {
        genres = result;
        if (active) update();
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (genres) return { status: 'ready', genres };
  return failed ? { status: 'error', retry } : { status: 'loading' };
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
