import type { RecordStore, StoredRecord } from './records';

const prefix = (scope: string) => `komori:${scope}:`;
// Keep the existing web preview usable without SQLite's browser WASM setup.
export const records: RecordStore = {
  async get<T>(scope: string, key: string) {
    const value = localStorage.getItem(prefix(scope) + key);
    return value == null ? null : JSON.parse(value) as StoredRecord<T>;
  },
  async put(scope, key, value) {
    localStorage.setItem(prefix(scope) + key, JSON.stringify({ value, updatedAt: Date.now() }));
  },
  async remove(scope, key) {
    localStorage.removeItem(prefix(scope) + key);
  },
  async prune(scope, before, limit) {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix(scope)));
    const rows = keys.map((key) => ({
      key, updatedAt: (JSON.parse(localStorage.getItem(key)!) as StoredRecord<unknown>).updatedAt,
    })).sort((a, b) => b.updatedAt - a.updatedAt);
    rows.forEach(({ key, updatedAt }, index) => {
      if (updatedAt < before || index >= limit) localStorage.removeItem(key);
    });
  },
};
