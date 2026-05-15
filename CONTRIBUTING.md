# Contributing

Thanks for your interest in improving Pipe Dreams Plumbing!

## Development workflow

1. Fork + clone the repo.
2. Run `npm install`.
3. Create a free [Neon](https://neon.tech) project and copy the connection
   string. Then copy `.env.example` to `.env` and fill in `DATABASE_URL` +
   `AUTH_SECRET`. See [README.md](./README.md) for the full env var list.
4. Apply migrations and seed: `npm run db:migrate && npm run db:seed`.
5. `npm run dev` and start hacking on http://localhost:3000.

## Before opening a PR

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
```

If you touch anything user-facing, also try `npm run build` once locally
(you'll need `DATABASE_URL` and `AUTH_SECRET` set).

## Schema changes

The schema lives in `src/db/schema.ts`. When you change it:

1. `npm run db:generate` — Drizzle Kit will diff and write a new SQL file
   into `./drizzle/`.
2. Commit both the schema change **and** the generated migration. Vercel
   deploys read the migration files from `./drizzle/`.
3. `npm run db:migrate` to apply it locally.

For quick local iteration you can use `npm run db:push` (no migration
file), but never use that against shared/production databases.

## Code style

- We use Prettier with the config in `.prettierrc`. Run `npm run format` before committing.
- Prefer narrow imports over `import * as X`.
- Keep server-side logging through `createLogger(module)` from `src/lib/logger.ts` rather than calling `console.*` directly.

## Tests

New code should come with at least one Vitest test under `src/__tests__/` (or co-located). The existing suites are good templates:

- `mediator.intent.test.ts` — pure-function classifier coverage.
- `mediator.extract.test.ts` — date/time/priority extraction.
- `ai-client.fallback.test.ts` — Gemini client, with the SDK mocked.
- `auth-session.test.ts` — token signing, expiry, and encrypt/decrypt round-trip.
- `mcp-tools.zod.test.ts` — MCP tool input schemas.
- `rate-limit.test.ts` — token-bucket limiter.

Tests should not require a live database. Mock `@/db` with
`vi.mock('@/db', () => ({ db: { ... } }))` — see the existing mediator
tests for an example of the promise-shaped builder stub.

## Deployment

We deploy to Vercel with the official Neon integration handling
`DATABASE_URL`. See the [Deployment section in the README](./README.md#deployment--vercel--neon).

The `drizzle/` migration directory is committed to git so production
deploys carry the SQL files — do not add it back to `.gitignore`.

## Security

- Never log or echo back secrets. Use `pd_user_llm_key` (encrypted HttpOnly cookie) for any user-supplied key material; never `localStorage`.
- Treat `AUTH_SECRET` as the trust root — sessions, OAuth state, and the user LLM-key cookie are all keyed on it.
- Treat `DATABASE_URL` as a secret. Use Vercel's per-environment env vars rather than committing it anywhere.
