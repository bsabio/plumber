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

// Initialize schema on the fly if it doesn't exist (especially important for Vercel /tmp db)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'anon',
    phone TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS newsletter_content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    published_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  -- Seed default users so foreign key constraints pass when booking
  INSERT OR IGNORE INTO users (id, name, email, role, phone, created_at) VALUES 
    ('user_anon', 'Guest User', 'guest@example.com', 'anon', '555-0000', datetime('now')),
    ('user_auth', 'Customer John', 'john@example.com', 'authenticated', '555-1234', datetime('now')),
    ('user_admin', 'Admin Operator', 'admin@example.com', 'admin', '555-9999', datetime('now'));
`);

export const db = drizzle(sqlite, { schema });

export { sqlite };
export default db;
