import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { anilist, CatalogError } from '../../services/anilist';
import { useOffline } from '../../services/connectivity';
import { cacheFeed, cacheGenres, cacheTitles, isStale, readFeed, readGenres, readTitle } from './cache';
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
const staleFeeds = new Set<string>();

function rememberLive(items: Anime[]) {
  rememberAnime(items);
  cacheTitles(items);
}

// Feeds that filter after loading can return an empty page while more titles follow.
// Those pages are skipped, so a preview is never empty too early.
async function loadFilledPage<C>(feed: Feed<C>, cursor: C) {
  let page = await feed.load(cursor);
  for (let skipped = 0; !page.items.length && page.next !== null && skipped < 3; skipped++) {
    page = await feed.load(page.next);
  }
  return page;
}

function loadNextPage<C>(feed: Feed<C>, offline: boolean, onCached: () => void): Promise<void> {
  const running = runningFeeds.get(feed.key);
  if (running) return running;
  const promise = (async () => {
      let loaded = loadedFeeds.get(feed.key);
      if (!loaded) {
        const cached = await readFeed(feed.key);
        if (cached) {
          loaded = cached.value;
          loadedFeeds.set(feed.key, loaded);
          rememberAnime(loaded.items);
          onCached();
          if (isStale(cached.updatedAt)) staleFeeds.add(feed.key);
          if (!staleFeeds.has(feed.key) || offline) return;
        }
      }
      if (offline) {
        if (!loaded) throw new Error('Internet is needed to load this feed');
        return;
      }
      const refresh = staleFeeds.has(feed.key);
      if (loaded?.next === null && !refresh) return;
      const page = await loadFilledPage(feed, loaded && !refresh ? (loaded.next as C) : feed.first);
      rememberLive(page.items);
      // Provider pages can overlap when titles share a sort value.
      const items = refresh ? [] : (loaded?.items ?? []);
      const seen = new Set(items.map((a) => a.id));
      const next = { items: [...items, ...page.items.filter((a) => !seen.has(a.id))], next: page.next };
      loadedFeeds.set(feed.key, next);
      staleFeeds.delete(feed.key);
      cacheFeed(feed.key, next);
  })().finally(() => runningFeeds.delete(feed.key));
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
  offline: boolean;
}

export function useFeed<C>(feed: Feed<C>): FeedState {
  const { key } = feed;
  const offline = useOffline();
  const latest = useRef({ feed, offline });
  latest.current = { feed, offline };
  const [request, setRequest] = useState({ key, loading: false, failed: false });
  const [, render] = useReducer((n: number) => n + 1, 0);

  const load = useCallback(() => {
    const { feed: current, offline: disconnected } = latest.current;
    setRequest({ key: current.key, loading: true, failed: false });
    // Answers for a feed the screen has left are cached but do not change its state.
    const settle = (failed: boolean) =>
      setRequest((r) => (r.key === current.key ? { key: current.key, loading: false, failed } : r));
    loadNextPage(current, disconnected, render).then(
      () => settle(false),
      () => settle(true),
    );
  }, []);

  useEffect(() => {
    if (!loadedFeeds.has(key) || (!offline && staleFeeds.has(key))) load();
  }, [key, load, offline]);

  const loaded = loadedFeeds.get(key);
  const { loading, failed } = request.key === key ? request : { loading: false, failed: false };
  return {
    status: loaded ? 'ready' : failed ? 'error' : 'loading',
    items: loaded?.items ?? [],
    hasMore: !offline && loaded != null && (loaded.next !== null || staleFeeds.has(key)),
    loadingMore: loaded != null && loading,
    loadMoreFailed: loaded != null && failed,
    loadMore: load,
    retry: load,
    offline,
  };
}

export type AnimeState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; retry: () => void; offline: boolean }
  | { status: 'ready'; anime: Anime };

// Details use the entry loaded with the search results when there is one.
export function useAnime(id: number): AnimeState {
  const offline = useOffline();
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [result, setResult] = useState<{ id: number; error?: 'notFound' | 'failed' } | null>(null);
  const cached = findAnime(id);

  useEffect(() => {
    if (!Number.isInteger(id)) return;
    let active = true;
    setResult(null);
    const hydrate = async () => {
      const disk = await readTitle(id);
      if (!active) return;
      if (disk && !findAnime(id)) {
        rememberAnime([disk.value]);
        render();
      }
      if (offline) {
        if (!findAnime(id)) setResult({ id, error: 'failed' });
        return;
      }
      if (disk && !isStale(disk.updatedAt) && attempt === 0) return;
      await anilist.getAnime(id).then(
      (anime) => {
        rememberLive([anime]);
        if (active) setResult({ id });
      },
      (e) => active && setResult({ id, error: e instanceof CatalogError && e.kind === 'notFound' ? 'notFound' : 'failed' }),
      );
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [id, attempt, offline]);

  if (cached) return { status: 'ready', anime: cached };
  if (!Number.isInteger(id) || (result?.id === id && result.error === 'notFound')) return { status: 'notFound' };
  if (result?.id === id && result.error) return { status: 'error', retry, offline };
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
  const offline = useOffline();
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  const [, update] = useReducer((n: number) => n + 1, 0);
  const [state, setState] = useState({ loading: false, failed: false });
  const missingKey = ids.filter((id) => !findAnime(id)).join(',');

  useEffect(() => {
    if (!missingKey) return;
    let active = true;
    setState({ loading: true, failed: false });
    const missing = missingKey.split(',').map(Number);
    const hydrate = async () => {
      const cached = await Promise.all(missing.map(readTitle));
      if (!active) return;
      for (const title of cached) {
        if (title && !findAnime(title.value.id)) rememberAnime([title.value]);
      }
      update();
      const uncached = missing.filter((id) => !findAnime(id));
      const requests: Promise<void>[] = [];
      for (let i = 0; !offline && i < uncached.length; i += ENTRY_BATCH) {
        const batch = uncached.slice(i, i + ENTRY_BATCH);
        requests.push(
          anilist.searchAnime({ id_in: batch, sort: ['ID'] }, 1, ENTRY_BATCH).then((page) => rememberLive(page.items)),
        );
      }
      await Promise.allSettled(requests);
      if (!active) return;
      const failed = missing.some((id) => !findAnime(id));
      update();
      setState({ loading: false, failed });
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [attempt, missingKey, offline]);

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
  const offline = useOffline();
  const [attempt, retry] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState(false);
  const [, update] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (genres) return;
    let active = true;
    setFailed(false);
    const hydrate = async () => {
      const disk = await readGenres();
      if (!active) return;
      if (disk) {
        genres = disk.value;
        update();
      }
      if (offline) {
        if (!disk) setFailed(true);
        return;
      }
      if (disk && !isStale(disk.updatedAt)) return;
      await anilist.getGenres().then(
      (result) => {
        genres = result;
        cacheGenres(result);
        if (active) update();
      },
      () => active && setFailed(true),
      );
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [attempt, offline]);

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
