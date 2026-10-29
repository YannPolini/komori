import type { JikanAnime } from '../jikan';

// Fixed sample responses in the Jikan v4 format, shortened to the fields Komori reads.

export const FRIEREN: JikanAnime = {
  mal_id: 52991,
  title: 'Sousou no Frieren',
  title_english: "Frieren: Beyond Journey's End",
  images: {
    jpg: {
      image_url: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
      large_image_url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
    },
  },
  synopsis: 'During their decade-long quest to defeat the Demon King, the members of the hero party bond.\n\n[Written by MAL Rewrite]',
  genres: [
    { mal_id: 2, name: 'Adventure' },
    { mal_id: 8, name: 'Drama' },
    { mal_id: 10, name: 'Fantasy' },
  ],
  score: 9.3,
  year: 2023,
  episodes: 28,
  status: 'Finished Airing',
  aired: {
    prop: {
      from: { day: 29, month: 9, year: 2023 },
      to: { day: 22, month: 3, year: 2024 },
    },
  },
};

// An announced title with almost no information yet.
export const ANNOUNCED: JikanAnime = {
  mal_id: 60000,
  title: 'Announced Sequel',
  title_english: null,
  images: { jpg: { image_url: 'https://cdn.myanimelist.net/images/qm_50.gif', large_image_url: null } },
  synopsis: null,
  genres: [],
  score: null,
  year: null,
  episodes: null,
  status: 'Not yet aired',
  aired: { prop: { from: { day: null, month: null, year: null }, to: { day: null, month: null, year: null } } },
};

export const listResponse = (data: JikanAnime[], hasNextPage = false) => ({
  data,
  pagination: { has_next_page: hasNextPage, current_page: 1 },
});
