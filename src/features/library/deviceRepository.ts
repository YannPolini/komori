import { records } from '../../storage/store';
import { findAnime, rememberAnime } from '../catalog/lookup';
import { createLocalProfileRepository } from './localRepository';

export function deviceRepository(owner: string) {
  return createLocalProfileRepository(records, owner, findAnime, (titles) => {
    rememberAnime(titles.filter((title) => !findAnime(title.id)));
  });
}
