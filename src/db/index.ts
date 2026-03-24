import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import * as schema from './schema';

let DB_PATH: string;
if (process.env.VERCEL) {
  // Vercel serverless environment is read-only except for /tmp
  DB_PATH = path.join('/tmp', 'plumber.db');
} else {
  DB_PATH = path.join(process.cwd(), 'data', 'plumber.db');
}

// Ensure the data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export { sqlite };
export default db;
