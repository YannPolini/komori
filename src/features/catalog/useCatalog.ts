import { useCallback, useEffect, useState } from 'react';
import { MOCK_ANIME } from '../../mock/anime';
import type { Anime } from './types';

// Mock loader with a short delay so screens show their loading state. Replaced by
// the Jikan client in the catalog issue. EXPO_PUBLIC_MOCK_CATALOG=error makes the
// first request fail, to check the error state and Retry.
let failNext = process.env.EXPO_PUBLIC_MOCK_CATALOG === 'error';

function fetchCatalog(): Promise<Anime[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (failNext) {
        failNext = false;
        reject(new Error('Mock catalog request failed'));
      } else {
        resolve(MOCK_ANIME);
      }
    }, 600);
  });
}

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; anime: Anime[] };

export function useCatalog(): CatalogState {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ anime: Anime[] } | { error: true } | null>(null);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setResult(null);
    fetchCatalog().then(
      (anime) => active && setResult({ anime }),
      () => active && setResult({ error: true }),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (!result) return { status: 'loading' };
  if ('error' in result) return { status: 'error', retry };
  return { status: 'ready', anime: result.anime };
}
