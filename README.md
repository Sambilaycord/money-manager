# Opis

*Cultivate your abundance.*

Opis is a personal money manager with a website and a mobile app that share one account and one database. It is named for the Roman goddess of plenty.

## Features

- **Dashboard**: what is free to spend, plus net worth, income, and spending for the month. A money picture shows what is set aside, budgeted, and owed.
- **Accounts**: bank, savings, card, e-wallet, cash, and investment accounts in any currency. Each account shows its balance, what is set aside, and what is free to use.
- **Transactions**: income, expenses, and transfers, with search, filters, date ranges, and pagination.
- **Budgets**: monthly or yearly limits per category, optionally for a range of months.
- **Utang**: money owed to you and money you owe, with partial payments, due dates, and a settled history. Lending or repaying through an account moves that account's balance.
- **Wishlist**: things to buy or save for, with an optional shop link. Buying an item records the purchase as a transaction.
- **Set-asides**: money held in an account for a wishlist item or a debt.
- **Reports**: cash flow, spending by category, a savings trend, and comparisons with the previous period.
- **Multiple currencies**: amounts are stored and summed per currency. Totals across currencies are converted to your default currency with daily exchange rates.
- **Calculator**: a floating calculator with a currency converter on every signed-in page.
- **Settings**: profile, avatar, password, signed-in devices, and light, dark, or system theme.

## Stack

| Part | Tech | Location |
| --- | --- | --- |
| Website | Next.js 16 (App Router), React 19, Tailwind CSS 4 | `apps/web` |
| Mobile app | Expo / React Native, Expo Router | `apps/mobile` |
| Shared code | Types, validation, and money math used by both apps | `packages/shared` |
| Backend | Supabase (Postgres, Auth, Storage) with row-level security on every table | `supabase` |

The monorepo uses pnpm workspaces and Turborepo, with TypeScript in strict mode throughout.

## Getting started

You need:

- Node 20+
- pnpm (`npm i -g pnpm`)
- Docker, to run Supabase locally
- the Expo Go app on your phone, for mobile testing

```bash
pnpm install
```

### Local Supabase

```bash
npx supabase start          # starts Postgres, Auth, and Studio in Docker and applies the migrations
npx supabase status         # prints the local API URL and anon key
```

Studio runs at http://localhost:54323. Sign-up confirmation emails go to the local mail viewer at http://localhost:54324.

To pick up new migrations later, run `npx supabase migration up --local`.

### Environment variables

Copy the values from `npx supabase status`, or from **Project Settings → API** for a hosted project:

- `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

See `.env.example`. Set `NEXT_PUBLIC_SITE_URL` in production so canonical links and share previews use your domain; on Vercel, the production domain is used if it is missing.

`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are compiled into the build. Changing one needs a redeploy (web) or a new build or update (mobile), not just a restart.

### Run

```bash
pnpm dev:web      # website at http://localhost:3100
pnpm dev:mobile   # Expo dev server; scan the QR code with Expo Go
pnpm dev          # both at once
```

### Sample data

`supabase/dev/dummy-budgets.sql` adds sample budgets to a local account. Sign up first, then follow the instructions at the top of the file. It is for local databases only.

### Google sign-in (optional)

"Continue with Google" appears only when the Supabase project has the Google provider turned on. To enable it locally:

1. Create an OAuth client in Google Cloud Console with the redirect URI `http://127.0.0.1:54321/auth/v1/callback`.
2. Put its ID and secret in `supabase/.env` as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`. Never commit this file.
3. Set `enabled = true` under `[auth.external.google]` in `supabase/config.toml`, then restart Supabase.

## Checks

```bash
pnpm lint        # ESLint (web) and Expo lint (mobile)
pnpm typecheck   # tsc in every workspace
pnpm test        # Vitest in packages/shared
pnpm build
```

Tests cover the shared validation and money logic in `packages/shared`. There are no UI or end-to-end tests yet.
