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
