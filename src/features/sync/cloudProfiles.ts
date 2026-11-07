import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEMA_VERSION, type ProfileData } from '../library/types';
import type { CloudProfiles } from './sync';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function positiveId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validProfile(value: unknown): value is ProfileData {
  if (!object(value) || value.schemaVersion !== SCHEMA_VERSION ||
      typeof value.displayName !== 'string' || value.displayName.length > 60 ||
      !Array.isArray(value.genres) || value.genres.length > 3 || value.genres.some((genre) => typeof genre !== 'string') ||
      !object(value.statuses) || !object(value.ratings) || !Array.isArray(value.customLists)) return false;
  const id = (key: string) => /^[1-9]\d*$/.test(key) && positiveId(Number(key));
  return Object.entries(value.statuses).every(([key, status]) => id(key) && typeof status === 'string' && ['plan', 'watching', 'watched'].includes(status)) &&
    Object.entries(value.ratings).every(([key, rating]) => id(key) && typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5) &&
    value.customLists.every((list) => object(list) && typeof list.id === 'string' && !!list.id &&
      typeof list.name === 'string' && !!list.name.trim() && [...list.name].length <= 40 &&
      Array.isArray(list.animeIds) && list.animeIds.every(positiveId));
}

export class SyncAuthError extends Error {}

export function cloudProfiles(client: SupabaseClient, owner: string): CloudProfiles {
  function fail(error: { code: string; message: string }, status: number): never {
    if (status === 401 || error.code === '42501') throw new SyncAuthError('Sign in to sync this account');
    throw new Error(error.message);
  }
  return {
    async read() {
      const { data, error, status } = await client.from('komori_profiles').select('revision,profile').eq('user_id', owner).maybeSingle();
      if (error) fail(error, status);
      if (!data) return null;
      if (!positiveId(data.revision) || !validProfile(data.profile)) throw new Error('Unsupported cloud profile');
      return { revision: data.revision as number, profile: data.profile };
    },
    async save(expected, profile) {
      const { data, error, status } = await client.rpc('save_komori_profile', {
        p_owner: owner, p_expected: expected, p_profile: profile,
      });
      if (error) fail(error, status);
      const revision = data?.[0]?.revision;
      if (revision == null) return null;
      if (!positiveId(revision)) throw new Error('Invalid cloud revision');
      return revision;
    },
  };
}
