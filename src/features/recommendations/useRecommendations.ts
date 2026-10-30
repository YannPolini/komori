import { useMemo } from 'react';
import { today } from '../catalog/dates';
import { useAnimeEntries, useFeed } from '../catalog/useCatalog';
import { useLibrary } from '../library/LibraryProvider';
import { listAnimeIds } from '../library/rules';
import { emptyProfile } from '../library/types';
import { candidatesFeed } from './candidates';
import { recommend, type Suggestion } from './scoring';

export type RecommendationsState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; suggestions: Suggestion[] };

// Suggestions for Home. They update when preferred genres or watch statuses change.
export function useRecommendations(): RecommendationsState {
  const library = useLibrary();
  const profile = library.state.status === 'ready' ? library.state.profile : null;
  const genresKey = JSON.stringify(profile?.genres ?? []);
  const feed = useMemo(() => candidatesFeed(JSON.parse(genresKey)), [genresKey]);
  const candidates = useFeed(feed);
  // Watched titles that are not loaded yet are scored once they arrive.
  const watched = useAnimeEntries(profile ? listAnimeIds(profile, 'watched') : []);

  if (library.state.status === 'loading' || candidates.status === 'loading') return { status: 'loading' };
  if (library.state.status === 'error') return { status: 'error', retry: library.retry };
  if (candidates.status === 'error') return { status: 'error', retry: candidates.retry };
  // Cheap enough to score on every render: at most 100 candidates.
  const suggestions = recommend({
    candidates: candidates.items,
    profile: profile ?? emptyProfile(),
    watched: watched.anime,
    now: today(),
  });
  return { status: 'ready', suggestions };
}
