import type { Anime } from '../features/catalog/types';

// Mock data, replaced by the Jikan catalog in the catalog issue.
const lorem =
  'A placeholder synopsis for layout purposes. The real description is loaded from the catalog provider once the API is connected.';

const make = (
  id: number,
  title: string,
  genres: string[],
  score: number | null,
  year: number | null,
  airingStatus: Anime['airingStatus'] = 'finished',
): Anime => ({ id, title, imageUrl: null, synopsis: lorem, genres, score, year, airingStatus });

export const MOCK_ANIME: Anime[] = [
  make(1, 'Frieren: Beyond Journey\'s End', ['Adventure', 'Fantasy'], 9.3, 2023),
  make(2, 'Cowboy Bebop', ['Action', 'Sci-Fi'], 8.7, 1998),
  make(3, 'Spirited Away', ['Fantasy', 'Drama'], 8.8, 2001),
  make(4, 'Odd Taxi', ['Mystery', 'Comedy'], 8.6, 2021),
  make(5, 'Mushishi', ['Slice of Life', 'Supernatural'], 8.7, 2005),
  make(6, 'Violet Evergarden', ['Drama', 'Fantasy'], 8.5, 2018),
  make(7, 'Run with the Wind', ['Sports', 'Drama'], 8.2, 2018),
  make(8, 'Dandadan', ['Action', 'Comedy'], 8.5, 2024),
  make(9, 'Upcoming Example', ['Adventure'], null, 2027, 'upcoming'),
  make(10, 'Another Upcoming', ['Fantasy'], null, null, 'upcoming'),
  make(11, 'Planetes', ['Sci-Fi', 'Drama'], 8.2, 2003),
  make(12, 'Barakamon', ['Slice of Life', 'Comedy'], 8.4, 2014),
];

export const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Mystery', 'Sci-Fi', 'Slice of Life', 'Sports'];
