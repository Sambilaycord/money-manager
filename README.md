# money-manager

Personal money manager and tracker, with a website and a mobile app that share one account and one database.

## Stack

| Part | Tech | Location |
| --- | --- | --- |
| Website | Next.js (App Router, TypeScript, Tailwind) | `apps/web` |
| Mobile app | Expo / React Native (TypeScript, Expo Router) | `apps/mobile` |
| Shared code | Types and money helpers used by both apps | `packages/shared` |
| Backend | Supabase (auth + Postgres), shared by web and mobile | — |

The monorepo uses pnpm workspaces and Turborepo.

## Getting started

Requirements: Node 20+, pnpm (`npm i -g pnpm`), and the Expo Go app on your phone for mobile testing.

```bash
pnpm install
```

### Environment variables

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key from **Project Settings → API**.
3. Create `apps/web/.env.local` with the `NEXT_PUBLIC_*` values and `apps/mobile/.env` with the `EXPO_PUBLIC_*` values (see `.env.example`).

### Run

```bash
pnpm dev:web      # website at http://localhost:3100
pnpm dev:mobile   # Expo dev server; scan the QR code with Expo Go
pnpm dev          # both at once
```
