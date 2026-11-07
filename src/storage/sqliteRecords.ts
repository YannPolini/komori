import type { RecordStore } from './records';

type Param = string | number;
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Param[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: Param[]): Promise<T | null>;
}

type Row = { body: string; updated_at: number };

export function createSQLiteRecords(open: () => Promise<Database>): RecordStore {
  let database: Promise<Database> | undefined;
  function ready() {
    database ??= (async () => {
      const db = await open();
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS records (
          scope TEXT NOT NULL,
          key TEXT NOT NULL,
          body TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (scope, key)
        );
        CREATE INDEX IF NOT EXISTS records_by_age ON records(scope, updated_at);
      `);
      return db;
    })().catch((error) => {
      database = undefined;
      throw error;
    });
    return database;
  }

  return {
    async get<T>(scope: string, key: string) {
      const db = await ready();
      const row = await db.getFirstAsync<Row>('SELECT body, updated_at FROM records WHERE scope = ? AND key = ?', scope, key);
      return row ? { value: JSON.parse(row.body) as T, updatedAt: row.updated_at } : null;
    },
    async put(scope, key, value) {
      const db = await ready();
      // The snapshot and its metadata are committed by one atomic SQLite statement.
      await db.runAsync(
        'INSERT INTO records (scope, key, body, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(scope, key) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at',
        scope, key, JSON.stringify(value), Date.now(),
      );
    },
    async remove(scope, key) {
      await (await ready()).runAsync('DELETE FROM records WHERE scope = ? AND key = ?', scope, key);
    },
    async prune(scope, before, limit) {
      await (await ready()).runAsync(
        `DELETE FROM records WHERE scope = ? AND (updated_at < ? OR key IN (
          SELECT key FROM records WHERE scope = ? ORDER BY updated_at DESC, key LIMIT -1 OFFSET ?
        ))`,
        scope, before, scope, limit,
      );
    },
  };
}
