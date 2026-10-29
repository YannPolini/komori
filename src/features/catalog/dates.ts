import type { Anime, CatalogDate } from './types';

export const RELEASE_WINDOW_DAYS = 30;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fromDate = (d: Date): CatalogDate => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });

export const today = (): CatalogDate => fromDate(new Date());

export const addDays = (date: CatalogDate, days: number): CatalogDate =>
  fromDate(new Date(date.year, (date.month ?? 1) - 1, (date.day ?? 1) + days));

// YYYYMMDD, the format of AniList's date filters. Unknown parts are 0.
export const fuzzyDate = (date: CatalogDate) => date.year * 10000 + (date.month ?? 0) * 100 + (date.day ?? 0);

// Partial dates count as the first day of their month or year.
const dateValue = (date: CatalogDate) => date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1);

export const compareDates = (a: CatalogDate, b: CatalogDate) => dateValue(a) - dateValue(b);

// New releases only count known premiere dates from the last 30 days through today.
export function isRecentRelease(anime: Anime, now: CatalogDate): boolean {
  const start = anime.startDate;
  if (!start || start.day == null) return false;
  return compareDates(start, addDays(now, -RELEASE_WINDOW_DAYS)) >= 0 && compareDates(start, now) <= 0;
}

export function formatDate(date: CatalogDate | null): string {
  if (!date) return 'Date unknown';
  if (date.month == null) return String(date.year);
  const month = MONTHS[date.month - 1];
  return date.day == null ? `${month} ${date.year}` : `${month} ${date.day}, ${date.year}`;
}
