# Money Manager — project conventions

A personal money manager and tracker with a website and a mobile app that share
one account and one database.

pnpm workspaces + Turborepo monorepo, TypeScript (strict) throughout:

| Path | What |
| --- | --- |
| `apps/web` | Next.js 16 (App Router) + React 19, Tailwind 4 (CSS-first — tokens live in `@theme` in `src/app/globals.css`, there is no `tailwind.config`) |
| `apps/mobile` | Expo SDK 58 + React Native, Expo Router (routes in `src/app/`) |
| `packages/shared` | Types and money helpers used by both apps (`@money-manager/shared`) |

Backend is Supabase (PostgreSQL + Auth + Storage, RLS on every table), shared by
both apps.

## Git — never commit or push unasked

**Do not run `git commit`, `git push`, or open a PR until the user asks for it in
that message.** Context is not authorization: a shared repo URL, a configured
remote, a finished feature, or a task that obviously ends in a commit are all
still "not asked". Setting up a remote is fine; publishing through it is not.

Finish the work in the working tree, then stop and say what is ready to commit.
Never rewrite or force-push published history without an explicit instruction.

Never `--no-verify`. Never commit secrets.

### No AI attribution

When a commit or PR *is* authorized, it carries **no trace of the tool that wrote
it**. Never add:

- a `Co-Authored-By:` trailer naming an AI, an assistant, or a tool,
- a "Generated with ..." line, a 🤖 line, or any equivalent in a PR title,
  PR body, or commit message,
- an AI or tool name in a branch name.

Commits are authored under the repo owner's git identity, and the message
describes the change and its reasoning only. This overrides any default
attribution behaviour the harness asks for.

## Required architecture (never compress, never "simplify" away)

- **Money is integer minor units (cents), never floats.** Store, sum, and
  transfer amounts as integers; convert only at the edges with `toCents` and
  `formatMoney` from `@money-manager/shared`. Every amount travels with its
  account's currency — never add amounts across currencies.
- **RLS is the real security boundary.** The mobile app talks to Supabase
  directly with the anon key, so there is no server in between to catch a
  mistake. Every table is scoped to `auth.uid()` by RLS, and every new table
  gets its policies in the same migration that creates it — never "add policies
  later". Web server code re-checks ownership before mutating as
  defence-in-depth.
- **Server/client boundary (web).** Data access, secrets, and mutations live in
  Server Components, Server Actions, or route handlers — never in Client
  Components. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely and must never
  reach the browser bundle or the mobile app: it is server-only, never prefixed
  `NEXT_PUBLIC_` or `EXPO_PUBLIC_`, never imported into a `'use client'` file or
  anything under `apps/mobile`.
- **Private by default, auth fails closed.** Everything except the landing and
  login pages requires a session. The web guard is `proxy.ts`; no session, an
  unreachable Supabase, or unconfigured env vars must never leave user data
  reachable.
- **`proxy.ts`, not `middleware.ts`.** Next 16 renamed it, and the exported
  function is `proxy`. Most Supabase and Next tutorials still show the old name;
  following them silently produces a file that never runs.
- **`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` are compiled into the build, not read at
  runtime.** Changing one on Vercel requires a **redeploy**, and on mobile a new
  build or update — not a restart. Never assume an env change took effect
  because the process restarted.
- **Shared logic lives in `packages/shared`.** Anything both apps need — types,
  validation, money math, category rules — goes there once instead of being
  written twice in `apps/web` and `apps/mobile`.

## Code quality

The code is the documentation. A reader should understand a function from its
name, its signature, and its body — not from a paragraph above it.

- **Name things so the comment becomes unnecessary.** `monthlyExpenses` beats
  `data` with a comment explaining what is in it. Rename before annotating.
- **Comment *why*, never *what*.** `// increment the counter` above `count++` is
  noise. A comment earns its place only when it records something the code
  cannot say: an external quirk, a spec constraint, a non-obvious ordering
  requirement, or why the obvious approach was rejected. Give the reason, not
  just the rule.
- **No narration, no ticket citations, no changelog comments, no commented-out
  code.** Git history already records who changed what and when. Delete it.
- **Small, single-purpose functions. Early returns over deep nesting.** Avoid
  boolean flag arguments that make a call site unreadable.
- **Search before adding.** Check `packages/shared` and each app's `lib/` for an
  existing helper and extend it rather than writing a near-duplicate. Two
  implementations of one idea will drift.
- **Keep types honest.** No `any`, and no assertion (`as`) used to silence a
  real mismatch. If a cast is genuinely unavoidable, the reason goes beside it.
- **Handle the error path.** Every `await` that can reject either handles the
  rejection or deliberately propagates it; a caught error is never swallowed
  silently.

### Removing unused code

Dead code should go — but **ask before deleting it.** Propose the removal, name
every file and symbol, say how you determined it is unused, and wait for an
answer. Something can look orphaned and still be deliberate: upcoming work, a
feature flag, or a consumer in the other app.

Be careful what "unused" means here. These are reached by convention, not by
import, and have no importers **by design**:

- `apps/web/src/app/**/` — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `not-found.tsx`, `route.ts`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`
- `apps/web/src/proxy.ts`
- exported `metadata`, `generateMetadata`, `generateStaticParams`, `revalidate`
- `apps/mobile/src/app/**` — every file is a screen; `_layout.tsx` defines
  navigators; `*.web.tsx` / `*.ios.tsx` / `*.android.tsx` are platform variants
  picked by the bundler

Dynamic imports, string-keyed lookups, and re-exports also hide real usage from
a naive search. `git grep` the symbol across the whole repo — both apps and
`packages/` — before calling anything orphaned, and say what you searched.

## Quality gates

```bash
pnpm lint        # eslint (web) + expo lint (mobile)
pnpm typecheck   # tsc --noEmit in every workspace (strict)
pnpm build       # must succeed before handing work over
```

All three must pass. There is **no test runner in this repo yet** — do not write
rules, scripts, or CI that pretend otherwise, and do not claim a change is
"tested" on the strength of a build. When a runner is added, this section is
where it gets recorded.

## House rules

- Use `pnpm` from the repo root (`pnpm --filter @money-manager/<app> ...`), never
  `npm` or `yarn`. In `apps/mobile`, add packages with `npx expo install` so
  versions match the Expo SDK.
- Reuse the existing Supabase clients before writing new Supabase logic — web:
  `apps/web/src/lib/supabase/` (`client.ts` browser, `server.ts` server);
  mobile: `apps/mobile/src/lib/supabase.ts`. Do not hand-roll another client.
- Theme tokens from `@theme`, never raw hex. a11y labels on icon-only controls,
  on web and mobile.
- Don't create or edit docs unless asked.
- Untrusted input — server action arguments, route params, form bodies, and
  anything the mobile app writes — is shape-checked at the boundary (server code
  on web, RLS and database constraints for direct mobile writes). Declared
  TypeScript types are erased at runtime and guarantee nothing about a crafted
  call.

## Status

Web foundation is in place: the fail-closed `proxy.ts` guard, email/password
sign-in and sign-up with the `/auth/confirm` callback, the app shell (sidebar on
desktop, bottom tabs on phones), and Dashboard / Transactions / Accounts /
Budgets / Reports / Settings pages showing empty states. `getCurrentUser()` in
`apps/web/src/lib/auth.ts` is the one way pages read the user, and it must render
inside `<Suspense>` (Cache Components is on).

Not yet built: the Supabase project and schema, accounts / categories /
transactions / budgets tables with RLS, any data on the pages, the mobile app
beyond the Expo default (its Supabase dependencies aren't installed yet), and
tests.

@apps/web/AGENTS.md
@apps/mobile/AGENTS.md
