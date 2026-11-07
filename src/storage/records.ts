export interface StoredRecord<T> {
  value: T;
  updatedAt: number;
}

export interface RecordStore {
  get<T>(scope: string, key: string): Promise<StoredRecord<T> | null>;
  put<T>(scope: string, key: string, value: T): Promise<void>;
  remove(scope: string, key: string): Promise<void>;
  prune(scope: string, before: number, limit: number): Promise<void>;
}
