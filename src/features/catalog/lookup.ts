import type { Anime } from './types';

// Catalog entries loaded in this app session, by anime ID. Personal lists only store IDs
// and resolve them here. The offline storage issue keeps these entries in SQLite.
const byId = new Map<number, Anime>();

export const findAnime = (id: number): Anime | undefined => byId.get(id);

export function rememberAnime(anime: Anime[]) {
  for (const a of anime) byId.set(a.id, a);
}
