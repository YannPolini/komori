import { isReleased } from '../catalog/dates';
import type { Anime, CatalogDate } from '../catalog/types';
import type { ProfileData } from '../library/types';

// Recommendation rules from US-05 as pure functions. Personal ratings are not used.

export const SUGGESTION_COUNT = 4;
export const GENRE_POINTS = 3;
export const WATCHED_POINTS = 2;

export type SuggestionReason =
  | { kind: 'match'; genres: string[]; watched: string[] }
  | { kind: 'popular' };

export interface Suggestion {
  anime: Anime;
  points: number;
  reason: SuggestionReason;
}

export interface RecommendInput {
  // Candidates in popularity order, most popular first.
  candidates: Anime[];
  profile: ProfileData;
  // Catalog entries of the Watched titles that are loaded.
  watched: Anime[];
  now: CatalogDate;
  count?: number;
}

// Tracked and unreleased titles are never suggested.
export const isEligible = (anime: Anime, profile: ProfileData, now: CatalogDate) =>
  !(anime.id in profile.statuses) && isReleased(anime, now);

// 3 points per preferred genre of the title, 2 points per watched title sharing a genre with it.
export function scoreAnime(anime: Anime, preferred: string[], watched: Anime[]): Suggestion {
  const genres = preferred.filter((g) => anime.genres.includes(g));
  const similar = watched.filter((w) => w.id !== anime.id && w.genres.some((g) => anime.genres.includes(g)));
  return {
    anime,
    points: genres.length * GENRE_POINTS + similar.length * WATCHED_POINTS,
    reason: { kind: 'match', genres, watched: similar.map((w) => w.title) },
  };
}

// Higher points first, ties by catalog score (unscored last), then by catalog ID.
export function compareSuggestions(a: Suggestion, b: Suggestion): number {
  return b.points - a.points || (b.anime.score ?? -1) - (a.anime.score ?? -1) || a.anime.id - b.anime.id;
}

// Matching titles first. Popular titles fill the slots that are left.
export function recommend({ candidates, profile, watched, now, count = SUGGESTION_COUNT }: RecommendInput): Suggestion[] {
  const eligible = candidates.filter((a, i) => isEligible(a, profile, now) && candidates.findIndex((c) => c.id === a.id) === i);
  const matches = eligible
    .map((a) => scoreAnime(a, profile.genres, watched))
    .filter((s) => s.points > 0)
    .sort(compareSuggestions)
    .slice(0, count);
  const chosen = new Set(matches.map((s) => s.anime.id));
  const popular = eligible
    .filter((a) => !chosen.has(a.id))
    .slice(0, count - matches.length)
    .map((anime): Suggestion => ({ anime, points: 0, reason: { kind: 'popular' } }));
  return [...matches, ...popular];
}

const joinNames = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

// The first name and how many more, e.g. "Action +2".
const firstAndCount = (names: string[]) => `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}`;

// Short reason that fits a small card, e.g. "Matches Action +1 · like Cowboy Bebop".
// reasonLabel names everything.
export function reasonText(reason: SuggestionReason): string {
  if (reason.kind === 'popular') return 'Popular right now';
  const parts: string[] = [];
  if (reason.genres.length) parts.push(`Matches ${firstAndCount(reason.genres)}`);
  if (reason.watched.length) parts.push(`${parts.length ? 'like' : 'Like'} ${firstAndCount(reason.watched)}`);
  return parts.join(' · ');
}

// Full sentence for screen readers.
export function reasonLabel(reason: SuggestionReason): string {
  if (reason.kind === 'popular') return 'Suggested because it is popular right now';
  const parts: string[] = [];
  if (reason.genres.length) parts.push(`it matches your genres ${joinNames(reason.genres)}`);
  if (reason.watched.length) parts.push(`it shares genres with ${joinNames(reason.watched)}, which you watched`);
  return `Suggested because ${parts.join(' and ')}`;
}
