/**
 * Runtime migration runner. Reads SQL files from `./drizzle/` and applies them
 * to the Neon database pointed at by `DATABASE_URL`. Designed to be invoked
 * via `npm run db:migrate` and to also work as a one-shot script in any Node
 * environment (CI, Vercel build hook, etc.).
 *
 * The `drizzle-orm/neon-http/migrator` keeps a journal table so calling this
 * repeatedly is safe — only new migrations are applied.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      '[db:migrate] DATABASE_URL is not set. Add it to your `.env` (see ' +
        'README.md for instructions on creating a Neon project).',
    );
    process.exit(1);
  }

  console.log('[db:migrate] applying migrations from ./drizzle …');
  const sql = neon(url);
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('[db:migrate] ✅ migrations applied');
  } catch (err) {
    console.error('[db:migrate] ❌ migration failed:', err);
    process.exit(1);
  }
}

main();
