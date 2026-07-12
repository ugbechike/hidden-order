# Hidden Order

Hidden Order is a mobile-first deduction game built with Next.js, TypeScript, Tailwind CSS, Supabase Postgres, Vitest, and Playwright.

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app runs without Supabase credentials using a local in-memory store for development and tests. Add Supabase keys to enable the production data path:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Supabase

Apply migrations from `supabase/migrations`. The initial migration creates profiles, stages, progress, daily puzzles, sessions, guesses, indexes, RLS policies, and seeds all 40 V1 stages.

The browser never reads solution columns. Game start, guess validation, attempt counts, completion time, stars, and leaderboard writes are handled by Next.js route handlers with the service role key.

If the deployed app says it cannot find `public.game_sessions` in the schema cache, the Supabase environment variables are connected but this migration has not been applied yet. Open the Supabase SQL editor for the project, paste `supabase/migrations/20260711120000_initial_schema.sql`, run it, then refresh the app.

## Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
```

## Deployment

Deploy to Vercel with the environment variables from `.env.example`. Supabase anonymous auth must be enabled for production play.

In Supabase, enable anonymous sign-ins under Authentication settings before testing the deployed app. If anonymous auth is off, the app cannot create a valid player UUID for saved sessions and progress.
