import type { SessionStorage } from './sessionStorage';

// The web preview has no device keystore. Keep tokens out of localStorage.
const session = new Map<string, string>();
export const authStorage: SessionStorage = {
  getItem: async (key) => session.get(key) ?? null,
  setItem: async (key, value) => { session.set(key, value); },
  removeItem: async (key) => { session.delete(key); },
};
