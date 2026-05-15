# Pipe Dreams Plumbing — MCP Demo

A full-stack Next.js application demonstrating a Model Context Protocol (MCP) integration. It serves as a mock customer portal for "Pipe Dreams Plumbing", where an AI assistant can manage support tickets, schedule appointments, query users, and retrieve newsletter content using a serverless Neon Postgres database.

## Tech stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router) on React 19
- **Database**: [Neon](https://neon.tech) (serverless Postgres) via `@neondatabase/serverless`
- **ORM / migrations**: [Drizzle ORM](https://orm.drizzle.team/) + `drizzle-kit`
- **Validation**: Zod (request body validation, MCP tool inputs, env)
- **Styling**: Tailwind CSS v4 + Shadcn UI primitives
- **AI integration**: `@modelcontextprotocol/sdk` and `@google/generative-ai`
- **Testing**: Vitest + `@vitest/coverage-v8`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Neon project

1. Sign up at [neon.tech](https://neon.tech) (free tier is plenty for this demo).
2. Create a new project. Pick any region close to you.
3. In the project dashboard, copy the **pooled connection string** (the one
   that ends in `?sslmode=require`). It looks like:

   ```
   postgres://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```env
# Required in production. Min 32 chars. Used to sign session cookies and to
# encrypt the user-supplied Gemini key cookie. Generate one with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SECRET=replace-me-with-something-long-and-random-please-32-chars

# Required in production. Paste your Neon connection string.
DATABASE_URL=postgres://USER:PASSWORD@HOST/DB?sslmode=require

# Optional — server-wide Gemini key. Individual users can also configure
# their own key via the Admin → "Gemini Key" tab; that key is stored
# encrypted in an HttpOnly cookie and is never echoed back to the client.
GOOGLE_GENERATIVE_AI_API_KEY=

# Optional — Google OAuth for "Continue with Google".
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

In development the app will still boot if `AUTH_SECRET` or `DATABASE_URL` is
missing — the DB client becomes a stub that throws on first use, which is
convenient for purely-frontend work. In production, both are hard errors at
boot.

### 4. Apply migrations + seed the database

```bash
npm run db:migrate   # applies ./drizzle/*.sql to Neon
npm run db:seed      # truncates + repopulates seed rows (idempotent)
```

Both scripts read `DATABASE_URL` from `.env`. `db:seed` runs migrations
first, so the very first run does both with a single command.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Scripts

| Script                | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Next.js dev server                                     |
| `npm run build`       | Production build (requires `AUTH_SECRET` + `DATABASE_URL`) |
| `npm start`           | Run the production build                               |
| `npm run lint`        | ESLint                                                 |
| `npm run typecheck`   | `tsc --noEmit`                                         |
| `npm run format`      | Prettier write                                         |
| `npm test`            | Vitest run                                             |
| `npm run test:watch`  | Vitest watch mode                                      |
| `npm run db:generate` | Generate a new SQL migration from `src/db/schema.ts`   |
| `npm run db:migrate`  | Apply pending migrations to the database               |
| `npm run db:push`     | Push schema directly (skips the migrations folder; dev only) |
| `npm run db:seed`     | Migrate + repopulate users / tickets / appointments / newsletter |

## Available MCP tools

The AI assistant in this project has access to several backend tools defined in `src/mcp-server/`:

- `query_tickets`: List and filter support tickets.
- `get_ticket_detail`: Get detailed information about a specific ticket.
- `create_ticket`: Create a new support ticket.
- `query_appointments`: List scheduled appointments.
- `schedule_appointment`: Book a new appointment.
- `get_newsletter`: Fetch newsletter content / tips / FAQs.
- `manage_users`: List users (admin).
- `get_newsletter_advice`: RAG-style newsletter lookup.
- `create_service_ticket`: Detailed Zod-validated ticket creation.
- `check_plumber_availability`: Availability lookup with slot map.
- `generate_business_metrics` (admin): Recharts-ready ticket/appointment metrics.
- `summarize_ticket_problems` (admin): Group open tickets by issue type.
- `suggest_ticket_response` (admin): Draft a customer-facing response.
- `update_ticket_status`: Move a ticket through `open → in_progress → resolved → closed`.
- `assign_technician` (admin): Assign a technician to a ticket.

## Project structure

- `src/app` — Next.js App Router routes (UI + `app/api/*` route handlers).
- `src/components` — Reusable UI components (including Shadcn UI primitives).
- `src/db` — Drizzle ORM schema, Neon client, migration runner, seed script.
- `src/mcp-server` — MCP tool definitions, including Zod-validated handlers.
- `src/lib` — Shared utilities: env loader, logger, rate limiter, AI client, mediator, auth helpers.
- `src/context` — React Context providers (chat state).
- `src/__tests__` — Vitest suites covering the mediator, auth-session, AI client fallback, MCP tool schemas, and the rate limiter.
- `drizzle/` — Generated SQL migration files. Committed so deploys carry them.

## Deployment — Vercel + Neon

The recommended path is the official
[Vercel ↔ Neon integration](https://vercel.com/integrations/neon):

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Install the Neon integration from the Vercel Marketplace and link the
   project — this auto-populates `DATABASE_URL` on every environment
   (production / preview / development) and rotates credentials for you.
4. Add the remaining env vars in the Vercel dashboard:
   - `AUTH_SECRET` (required, min 32 chars)
   - `GOOGLE_GENERATIVE_AI_API_KEY` (optional)
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (only if using Google OAuth)
5. Apply migrations against the production database. Easiest way is to run
   it locally with the production `DATABASE_URL` exported:

   ```bash
   DATABASE_URL='<production neon url>' npm run db:migrate
   DATABASE_URL='<production neon url>' npm run db:seed   # optional
   ```

   Alternatively, wire `npm run db:migrate` into your Vercel build command
   (e.g. `npm run db:migrate && next build`) once your migrations stabilise.

### Google OAuth callback

If you're using `Continue with Google`, register the deployed callback in
the Google Cloud Console under **APIs & Services → Credentials → OAuth 2.0
Client → Authorized redirect URIs**:

```
https://<your-domain>/api/auth/google/callback
```

The dev callback (`http://localhost:3000/api/auth/google/callback`) needs to
be there too if you OAuth from `next dev`.

### Rate limiting

`src/lib/rate-limit.ts` ships with a tiny in-memory token bucket (20 req /
IP / minute on `/api/chat`). It is **process-local** and does not survive
restarts or scale across instances. On Vercel each lambda gets its own
counter, so the effective limit is roughly `20 × <active instances>`. For
real multi-instance rate limiting swap it for an Upstash/Redis-backed
limiter — `@upstash/ratelimit` is a drop-in. See the TODO at the top of
`src/lib/rate-limit.ts`.

### Required env vars in production

- `AUTH_SECRET` (min 32 chars) — required.
- `DATABASE_URL` — required.
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — required only if you want Google OAuth.
- `GOOGLE_GENERATIVE_AI_API_KEY` — optional; users can also bring their own key from the Admin tab.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).
