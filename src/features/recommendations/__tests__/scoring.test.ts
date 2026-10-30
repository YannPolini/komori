import type { AnimeListPage, CatalogClient, MediaFilters } from '../../../services/anilist';
import type { Anime, CatalogDate } from '../../catalog/types';
import { emptyProfile, type ProfileData } from '../../library/types';
import { candidatesFeed, MAX_CANDIDATES } from '../candidates';
import { reasonLabel, reasonText, recommend, scoreAnime } from '../scoring';

const NOW: CatalogDate = { year: 2026, month: 10, day: 29 };

const anime = (id: number, genres: string[], patch: Partial<Anime> = {}): Anime => ({
  id,
  title: `Title ${id}`,
  imageUrl: null,
  synopsis: null,
  genres,
  score: null,
  year: 2020,
  startDate: { year: 2020, month: 1, day: 1 },
  endDate: null,
  episodes: null,
  airingStatus: 'finished',
  ...patch,
});

const profileWith = (patch: Partial<ProfileData> = {}): ProfileData => ({ ...emptyProfile(), ...patch });
const ids = (list: { anime: Anime }[]) => list.map((s) => s.anime.id);

describe('scoring', () => {
  it('adds 3 points per preferred genre and 2 per watched title sharing a genre', () => {
    const watched = [anime(90, ['Drama']), anime(91, ['Drama', 'Comedy']), anime(92, ['Horror'])];
    const s = scoreAnime(anime(1, ['Action', 'Drama', 'Comedy']), ['Action', 'Comedy', 'Romance'], watched);
    expect(s.points).toBe(2 * 3 + 2 * 2);
    expect(s.reason).toEqual({ kind: 'match', genres: ['Action', 'Comedy'], watched: ['Title 90', 'Title 91'] });
  });

  it('sorts by points, then catalog score, then catalog ID', () => {
    const candidates = [
      anime(5, ['Action'], { score: 7 }),
      anime(4, ['Action'], { score: 8 }),
      anime(3, ['Action'], { score: 8 }),
      anime(2, ['Action', 'Drama'], { score: 6 }),
      anime(1, ['Action'], { score: null }),
    ];
    const result = recommend({ candidates, profile: profileWith({ genres: ['Action', 'Drama'] }), watched: [], now: NOW });
    expect(ids(result)).toEqual([2, 3, 4, 5]);
  });

  it('ignores personal ratings', () => {
    const candidates = [anime(1, ['Action'], { score: 9 }), anime(2, ['Action'], { score: 8 })];
    const profile = profileWith({ genres: ['Action'], ratings: { 2: 5, 1: 1 } });
    expect(ids(recommend({ candidates, profile, watched: [], now: NOW }))).toEqual([1, 2]);
  });
});

describe('exclusions', () => {
  it('leaves out tracked titles in any watch status', () => {
    const candidates = [anime(1, ['Action']), anime(2, ['Action']), anime(3, ['Action']), anime(4, ['Action'])];
    const profile = profileWith({ genres: ['Action'], statuses: { 1: 'plan', 2: 'watching', 3: 'watched' } });
    expect(ids(recommend({ candidates, profile, watched: [], now: NOW }))).toEqual([4]);
  });

  it('leaves out unreleased titles, using the airing status when the date is missing', () => {
    const candidates = [
      anime(1, ['Action'], { startDate: { year: 2026, month: 10, day: 30 }, airingStatus: 'upcoming' }),
      anime(2, ['Action'], { startDate: { year: 2026, month: 10, day: 29 }, airingStatus: 'upcoming' }),
      anime(3, ['Action'], { startDate: null, airingStatus: 'upcoming' }),
      anime(4, ['Action'], { startDate: { year: 2026, month: null, day: null }, airingStatus: 'airing' }),
    ];
    const profile = profileWith({ genres: ['Action'] });
    expect(ids(recommend({ candidates, profile, watched: [], now: NOW }))).toEqual([2, 4]);
  });
});

describe('popular fallback', () => {
  it('fills the remaining slots with popular titles in candidate order', () => {
    const candidates = [anime(10, ['Comedy']), anime(11, ['Sports']), anime(12, ['Action']), anime(13, ['Mecha'])];
    const result = recommend({ candidates, profile: profileWith({ genres: ['Action'] }), watched: [], now: NOW });
    expect(ids(result)).toEqual([12, 10, 11, 13]);
    expect(result.map((s) => s.reason.kind)).toEqual(['match', 'popular', 'popular', 'popular']);
  });

  it('suggests popular titles without preferences or history', () => {
    const candidates = [1, 2, 3, 4, 5].map((id) => anime(id, ['Drama']));
    expect(ids(recommend({ candidates, profile: profileWith(), watched: [], now: NOW }))).toEqual([1, 2, 3, 4]);
  });

  it('returns nothing when no suitable titles remain', () => {
    const candidates = [anime(1, ['Drama'])];
    expect(recommend({ candidates, profile: profileWith({ statuses: { 1: 'plan' } }), watched: [], now: NOW })).toEqual([]);
  });
});

describe('reasons', () => {
  it('names matching genres and watched titles', () => {
    const reason = { kind: 'match' as const, genres: ['Action'], watched: ['Cowboy Bebop', 'Mushishi'] };
    expect(reasonText(reason)).toBe('Matches Action · like Cowboy Bebop +1');
    expect(reasonText({ kind: 'match', genres: ['Action', 'Drama', 'Slice of Life'], watched: [] })).toBe('Matches Action +2');
    expect(reasonLabel(reason)).toBe(
      'Suggested because it matches your genres Action and it shares genres with Cowboy Bebop and Mushishi, which you watched',
    );
    expect(reasonText({ kind: 'match', genres: [], watched: ['Mushishi'] })).toBe('Like Mushishi');
    expect(reasonText({ kind: 'popular' })).toBe('Popular right now');
  });
});

describe('candidates', () => {
  it('loads popular titles and up to three preferred genres, at most 100', async () => {
    const calls: [MediaFilters, number, number | undefined][] = [];
    let next = 1;
    const searchAnime = jest.fn(async (filters: MediaFilters, page: number, perPage?: number): Promise<AnimeListPage> => {
      calls.push([filters, page, perPage]);
      return { items: Array.from({ length: perPage ?? 12 }, () => anime(next++, [])), hasNextPage: true };
    });
    const client: CatalogClient = { searchAnime, getAnime: jest.fn(), getGenres: jest.fn() };

    const page = await candidatesFeed(['Drama', 'Action', 'Comedy'], client).load(1);
    expect(calls.map(([f, , n]) => [f.genre ?? null, n])).toEqual([
      [null, 25],
      ['Action', 25],
      ['Comedy', 25],
      ['Drama', 25],
    ]);
    expect(page.items).toHaveLength(MAX_CANDIDATES);
    expect(page.next).toBeNull();
  });

  it('lists a title found by several queries once', async () => {
    const shared = anime(1, ['Action']);
    const searchAnime = jest.fn(async () => ({ items: [shared], hasNextPage: false }));
    const client: CatalogClient = { searchAnime, getAnime: jest.fn(), getGenres: jest.fn() };
    expect((await candidatesFeed(['Action'], client).load(1)).items).toEqual([shared]);
  });
});
