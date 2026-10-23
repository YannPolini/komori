export type WatchStatus = 'plan' | 'watching' | 'watched';

export const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  plan: 'Plan to watch',
  watching: 'Watching',
  watched: 'Watched',
};

export interface Anime {
  id: number;
  title: string;
  imageUrl: string | null;
  synopsis: string | null;
  genres: string[];
  score: number | null;
  year: number | null;
  airingStatus: 'airing' | 'finished' | 'upcoming';
}
