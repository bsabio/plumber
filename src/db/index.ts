/**
 * Drizzle ORM client backed by Neon Postgres via the `@neondatabase/serverless`
 * HTTP driver. The HTTP driver is fully serverless-friendly (works on both
 * Node and Edge runtimes) and does not require a connection pool.
 *
 * Schema migrations are managed by `drizzle-kit` — see `drizzle.config.ts`
 * and the SQL files under `./drizzle/`. Apply them with `npm run db:migrate`
 * (which runs `tsx src/db/migrate.ts`) before booting the app against a
 * fresh database.
 *
 * If `DATABASE_URL` is missing in development we log a warning and export a
 * stub `db` that throws on first use. That keeps `next dev` bootable for
 * purely-frontend work; in production a missing URL is a hard error at
 * module load.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function buildStubDb(): DrizzleDb {
  const message =
    '[db] DATABASE_URL is not set. Configure a Neon Postgres connection ' +
    'string before making any database calls (see README.md).';
  const handler: ProxyHandler<object> = {
    get() {
      throw new Error(message);
    },
    apply() {
      throw new Error(message);
    },
  };
  return new Proxy({}, handler) as DrizzleDb;
}

let db: DrizzleDb;

if (!DATABASE_URL) {
  if (isProduction) {
    throw new Error(
      '[db] DATABASE_URL is required in production. Set it to your Neon ' +
        'Postgres connection string in the deployment environment.',
    );
  }
  console.warn(
    '[db] DATABASE_URL not set — exporting a stub client. Any DB call will ' +
      'throw until you populate `.env` (see `.env.example`).',
  );
  db = buildStubDb();
} else {
  const sql = neon(DATABASE_URL);
  db = drizzle(sql, { schema });
}

export { db, schema };
export default db;
