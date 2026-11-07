import { openDatabaseAsync } from 'expo-sqlite';
import { createSQLiteRecords } from './sqliteRecords';

export const records = createSQLiteRecords(() => openDatabaseAsync('komori.db'));
