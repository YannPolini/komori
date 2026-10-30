import type { AniListMedia } from '../anilist';

// Fixed sample responses in the AniList format, shortened to the fields Komori reads.

export const FRIEREN: AniListMedia = {
  id: 154587,
  title: { english: 'Frieren: Beyond Journey’s End', romaji: 'Sousou no Frieren' },
  coverImage: {
    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg',
    extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg',
  },
  description: 'The adventure is over but life goes on for an <i>elf mage</i>.<br><br>\r\n(Source: Crunchyroll)',
  genres: ['Adventure', 'Drama', 'Fantasy'],
  averageScore: 91,
  episodes: 28,
  status: 'FINISHED',
  startDate: { year: 2023, month: 9, day: 29 },
  endDate: { year: 2024, month: 3, day: 22 },
};

// An announced title with almost no information yet.
export const ANNOUNCED: AniListMedia = {
  id: 209939,
  title: { english: null, romaji: 'Sousou no Frieren 3rd Season' },
  coverImage: { large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg', extraLarge: null },
  description: null,
  genres: [],
  averageScore: null,
  episodes: null,
  status: 'NOT_YET_RELEASED',
  startDate: { year: null, month: null, day: null },
  endDate: { year: null, month: null, day: null },
};

export const pageResponse = (media: AniListMedia[], hasNextPage = false) => ({
  data: { Page: { pageInfo: { hasNextPage }, media } },
});
