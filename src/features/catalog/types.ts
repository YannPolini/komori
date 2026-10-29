export type WatchStatus = 'plan' | 'watching' | 'watched';

export const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  plan: 'Plan to watch',
  watching: 'Watching',
  watched: 'Watched',
};

// A provider date that may only be known to the month or year.
export interface CatalogDate {
  year: number;
  month: number | null;
  day: number | null;
}

export interface Anime {
  id: number;
  title: string;
  imageUrl: string | null;
  synopsis: string | null;
  genres: string[];
  score: number | null;
  year: number | null;
  startDate: CatalogDate | null;
  endDate: CatalogDate | null;
  episodes: number | null;
  airingStatus: 'airing' | 'finished' | 'upcoming';
}

export interface Genre {
  id: number;
  name: string;
  count: number;
}

export type CatalogSort = 'popularity' | 'score' | 'title';

export const CATALOG_SORT_LABEL: Record<CatalogSort, string> = {
  popularity: 'Popular',
  score: 'Top rated',
  title: 'A–Z',
};

// One loaded page of a feed. `next` continues the feed, null means it is complete.
export interface CatalogPage<Cursor> {
  items: Anime[];
  next: Cursor | null;
}
