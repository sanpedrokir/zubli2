# Zubli Reconnect

> _Some friendships deserve a second hello._

Zubli Reconnect helps people reconnect with childhood friends, former classmates, neighbours and colleagues they lost touch with, especially from the 1960s to the 1990s. It is private by default and built around consent: you see **possible** connections, never confirmed identities, and nobody can message you until you accept their introduction.

**Stack:** Next.js 16 (App Router, JavaScript, Cache Components) · React 19 · Tailwind CSS 4 · Neon PostgreSQL · Clerk · Zod

---

## Contents

1. [Features](#features)
2. [Privacy & safety design](#privacy--safety-design)
3. [Project structure](#project-structure)
4. [Install on Windows](#install-on-windows)
5. [Local testing](#local-testing)
6. [Push to GitHub](#push-to-github)
7. [Deploy to Vercel](#deploy-to-vercel)
8. [Environment variables](#environment-variables)
9. [Database schema](#database-schema)
10. [Untested external integrations](#untested-external-integrations)
11. [Troubleshooting](#troubleshooting)

---

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Sign-up and sign-in** with Clerk. Each user has a private account. Onboarding takes three steps: your name, privacy choices, and where to start. | `/sign-in`, `/sign-up`, `/onboarding` |
| 2 | **Find a Lost Friend.** A detailed memory form: full/partial name, nickname, country, city, neighbourhood, hangouts, school, workplace, occupation, year last seen, age that year, gender, height, shared activities and personal memories. **Only a short description is required.** Save, edit and delete. | `/memories`, `/memories/new`, `/memories/[id]/edit` |
| 3 | **My Historical Profile.** Schools, places, workplaces, nicknames and former names, with years. One **Discoverable** switch for the whole profile, plus an **include/exclude** toggle on every entry. You can hide your name in suggestions, turn birth-year matching on or off, block people, and delete all your data. | `/profile` |
| 4 | **AI-assisted matching.** Fuzzy similarity scoring (token overlap, character bigrams, Soundex, abbreviation expansion, year-range overlap and age fit) compares your clues with the profiles of people who opted in. Results are shown as *Strong / Possible / Faint possibility* and explained using **your own clues**. | `/memories/[id]` |
| 5 | **Reconnection requests.** Request an introduction with a note. The recipient is notified and can accept, decline, block or report. Messaging opens only after they accept. Either person can close the conversation. | `/requests`, `/connections/[id]` |
| 6 | **Memory-inspired illustration** (optional). A server-side image API paints a nostalgic scene from your description and era. Every image is labelled *AI-generated · not a real likeness*. Images are private to you and never used for identification. | `/memories/[id]` |
| 7 | **Public web discovery.** Search links for Google, Bing and DuckDuckGo, built from your clues. Nothing is fetched until you click a link. | `/memories/[id]` |
| 8 | **Dashboard.** Stats, introductions waiting for you, potential matches, accepted connections, sent requests, and saved memories with edit and delete. | `/dashboard` |

## Privacy & safety design

- **Server-only data access.** `lib/db.js` imports `server-only`, so the build fails if database code is bundled for the browser. `DATABASE_URL` and `CLERK_SECRET_KEY` are never exposed to the client (they have no `NEXT_PUBLIC_` prefix).
- **Authentication in depth.** `proxy.js` (Clerk middleware) protects every non-public route. Each page and Server Action checks the session again (`requireUser` / `getActionUser`). Every query is scoped by the owner's id.
- **No internal ids in the browser.** A suggestion is referenced by an opaque `ref` UUID, and a block by a hash. Clerk user ids never leave the server.
- **Opt-in matching.** Only profiles with `discoverable = true`, entries with `include_in_matching = true`, and onboarded, non-suspended, non-blocked users are compared. When someone changes their profile, cached suggestions pointing at them are deleted straight away. Suggestions are also filtered live each time they are read.
- **No disclosure of others' data.** Match reasons quote the *searcher's* clues ("School resembles your clue 'St Mary's'"), never the candidate's stored values. Before acceptance, a person appears as "A Zubli member" unless they chose to show their name. Contact details are never stored in the app's database or shown to anyone.
- **Matching runs on your own server.** Profile data is not sent to third-party AI services.
- **Consent-first contact.** An introduction needs an existing suggestion you own. Duplicate or open requests are blocked by a unique index. After a decline there is a 90-day cool-down. You can have at most 20 pending requests. First introductions can't contain links or financial terms.
- **Block and report.** Blocking closes pending requests and conversations and removes suggestions in both directions. When 3 different people report the same account, it is suspended automatically. Suspended users drop out of matching and can't send introductions or messages.
- **Rate limits.** Fixed-window counters live in Postgres, so they work across serverless instances (`lib/rate-limit.js`). Examples: 10 introductions per day, 60 messages per hour, 5 illustrations per day per user, plus an optional site-wide daily illustration cap. Server Action bodies are limited to 200 KB.
- **Validation.** Every input goes through Zod schemas (`lib/validation.js`): length limits, year ranges, enums, control-character stripping, and UUID checks before any query runs.
- **Illustrations.** Prompts leave out names and physical descriptions. People are drawn small, from behind or at a distance. Images are stored as private `bytea` and served only to their owner (`/api/illustrations/[id]`, `Cache-Control: private`).
- **Security headers.** `nosniff`, `X-Frame-Options: DENY`, a strict referrer policy and a permissions policy (`next.config.mjs`).

## Project structure

```
app/
  actions/            Server Actions (memories, profile, requests, illustrations)
  api/illustrations/  Owner-only image route
  dashboard/ memories/ profile/ requests/ connections/ onboarding/
  sign-in/ sign-up/ safety/   Public and auth pages
  layout.js page.js globals.css error.js not-found.js
components/           UI (forms, cards, header, nav, studio…)
lib/
  db.js               Neon client (server-only)
  auth.js             Data-access-layer auth helpers
  matching.js         Similarity engine (pure functions)
  search-links.js     Public search link builder
  illustration.js     Image API client and prompt builder
  rate-limit.js validation.js action-utils.js
  data/               Queries with ownership checks
db/schema.sql         Tables and indexes (idempotent)
scripts/migrate.mjs   Applies the schema to Neon
proxy.js              Clerk route protection (Next 16 renamed "middleware" to "proxy")
tests/                node:test suites (unit and PostgreSQL integration)
```

## Install on Windows

### 1. Prerequisites

1. **Node.js 20.12 or newer** (22 LTS or 24 recommended). Download it from <https://nodejs.org> and keep the default options.
2. **Git for Windows**: <https://git-scm.com/download/win>.
3. Free accounts at **Neon** (<https://neon.tech>) and **Clerk** (<https://clerk.com>).
4. Optional: an **OpenAI API key** (or another OpenAI-compatible image provider) for illustrations.

Open **PowerShell** and check the versions:

```powershell
node -v
npm -v
git --version
```

### 2. Get the code and install dependencies

```powershell
cd C:\path\to\projects
git clone https://github.com/<you>/zubli-reconnect.git
cd zubli-reconnect
npm install
```

### 3. Create the Neon database

1. In the Neon console, click **New Project** and choose the region nearest your users.
2. Open **Connection Details** and select the **Pooled connection** string (it contains `-pooler`).

### 4. Create the Clerk application

1. In the Clerk dashboard, click **Create application** and choose your sign-in methods (for example email and Google).
2. Open **API Keys** and copy the *Publishable key* and the *Secret key*.

### 5. Configure environment variables

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Paste in `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Leave `IMAGE_API_KEY` empty unless you want illustrations.

### 6. Create the tables

```powershell
npm run db:migrate
```

You should see `Database schema is up to date.` It is safe to run again whenever you like.

### 7. Run the app

```powershell
npm run dev
```

Open <http://localhost:3000>, click **Join free**, and complete onboarding.

> **PowerShell script-policy error?** If `npm` fails with *"running scripts is disabled on this system"*, run this once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## Local testing

| Command | What it does |
|---------|--------------|
| `npm run lint` | ESLint with the Next.js core-web-vitals rules |
| `npm test` | 26 tests: matching engine, validation, search links, the migration runner, and a full data-flow integration test |
| `npm run build` | Production build (also checks Cache Components / Suspense rules) |
| `npm run check` | All three in sequence |

`npm test` **does not need Neon or Clerk.** It runs the real `db/schema.sql` and every data-layer query against [PGlite](https://pglite.dev) (PostgreSQL compiled to WASM) through a test-only module hook (`tests/support/`). The integration test covers:

- owner-only access to memories, suggestions and illustrations
- non-discoverable people and excluded entries are never matched
- suggestions contain no user ids, private values or contact details
- messaging is impossible before acceptance, and outsiders can't accept or read conversations
- blocking closes conversations and removes suggestions in both directions; unblocking restores them
- three different reporters suspend an account automatically
- rate limits, and cascade deletion of all of a user's data

### Manual end-to-end test (two people)

1. Start `npm run dev` and sign up as **User A** in a normal browser window.
2. In a private/incognito window, sign up as **User B**. During onboarding tick **Make me discoverable**. Then on **My history** add a school (for example *St Mary's High*, 1976–1982) and a place (for example *Berea, Durban*).
3. As **User A**, go to **Find a lost friend**. Enter the school *St Mary's*, the city *Durban* and the year last seen *1979*, then save. User B appears as **A Zubli member** under *Possible connections*.
4. Click **Request an introduction**, write a note, tick the confirmation box and send it.
5. As **User B**, the bell shows 1. Open **Introductions** and choose **Accept & say hello**. The private conversation opens.
6. Try **Block** and **Report** from either side, and **Delete** on memories and entries.

## Push to GitHub

```powershell
git add .
git commit -m "Zubli Reconnect"
# Create an empty repository on github.com first (no README), then:
git remote add origin https://github.com/<you>/zubli-reconnect.git
git branch -M main
git push -u origin main
```

`.env.local` is git-ignored. Only `.env.example`, which holds placeholders, is committed. Check with `git status` before you push.

## Deploy to Vercel

1. Go to <https://vercel.com/new> and **import** your GitHub repository. Vercel detects Next.js automatically.
2. Under **Environment Variables**, add every variable from `.env.example` with real values: `DATABASE_URL`, the Clerk keys, the four `NEXT_PUBLIC_CLERK_*` URLs, and optionally the `IMAGE_*` variables.
   - *Tip:* Vercel's **Neon integration** (Storage → Connect Database → Neon) can set `DATABASE_URL` for you.
3. Click **Deploy**.
4. Run the migration against the production database once, from your PC:
   ```powershell
   $env:DATABASE_URL="postgresql://...production pooled url..."
   npm run db:migrate
   Remove-Item Env:DATABASE_URL
   ```
5. **Clerk production instance:** before real users arrive, open your Clerk dashboard, create a **Production** instance and add your domain. Then replace the `pk_test_` / `sk_test_` keys in Vercel with the `pk_live_` / `sk_live_` keys and redeploy.
6. Optional: in Clerk, under **Account Portal / User profile**, allow users to delete their own account. The in-app **Delete my data** button removes everything stored in Neon. Deleting the Clerk account removes the sign-in identity.

Illustration generation can take 20–60 seconds. Hobby plans allow it, but if you see timeouts, set `IMAGE_QUALITY=low`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Neon pooled connection string (server-only) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key (safe for the browser) |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key (server-only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | ✅ | `/sign-in`, `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `_SIGN_UP_…` | ✅ | `/dashboard`, `/onboarding` |
| `IMAGE_API_KEY` | ➖ | Enables illustrations. Leave empty to disable the feature |
| `IMAGE_API_BASE_URL` | ➖ | OpenAI-compatible endpoint (default `https://api.openai.com/v1`) |
| `IMAGE_MODEL` | ➖ | Default `gpt-image-1` |
| `IMAGE_QUALITY` | ➖ | `low` / `medium` / `high` |
| `ILLUSTRATION_GLOBAL_DAILY_LIMIT` | ➖ | Site-wide daily cap on illustrations |

## Database schema

The schema is in `db/schema.sql`. It is idempotent and uses `CREATE … IF NOT EXISTS`. Tables:

| Table | Purpose | Notable indexes |
|-------|---------|-----------------|
| `users` | Clerk id, display name, onboarding, suspension | PK |
| `memories` | Lost-friend searches (private) | `(owner_id, updated_at DESC)` |
| `profiles` | Discoverability and privacy settings | partial index `WHERE discoverable` |
| `profile_entries` | Schools, places, workplaces, nicknames, former names | `(user_id, kind)`, `(kind, lower(value)) WHERE include_in_matching` |
| `match_suggestions` | Cached scores and reasons, opaque `ref` | PK `(memory_id, candidate_user_id)`, unique `ref`, `(candidate_user_id)` |
| `connection_requests` | Introductions and their status | recipient/sender + status, **unique open pair** |
| `messages` | Messages after acceptance | `(request_id, created_at)` |
| `blocks`, `reports` | Safety | unique open report per pair |
| `notifications` | In-app alerts | partial `WHERE read_at IS NULL` |
| `illustrations` | Private AI images (`bytea`) | `(memory_id, created_at DESC)` |
| `rate_limits` | Fixed-window counters | PK `(key, window_start)` |

All foreign keys use `ON DELETE CASCADE`, so **Delete my data** removes everything for that user.

## Untested external integrations

These parts were written against the providers' documented APIs but **were not run against live services** while this project was built:

- **Neon (live).** All SQL was tested on real PostgreSQL through PGlite, but not over Neon's HTTP driver against a live Neon database. The driver calls used are `neon()`, tagged templates, `sql.query()` and `sql.transaction()`. Run `npm run db:migrate` and the two-person manual test above to confirm.
- **Clerk (live sign-in).** The build and route protection were checked with a placeholder key: protected routes redirect to sign-in and public pages render. A real sign-up/sign-in round trip needs your keys.
- **Image generation.** `lib/illustration.js` calls `POST /images/generations` with `model`, `prompt`, `size`, `quality`, `output_format: "webp"` and `output_compression`, and reads `data[0].b64_json` (or `url`). Other OpenAI-compatible providers may not support every parameter. Adjust the request body if your provider rejects them.
- **Public search links** open the search engines' normal result pages. Their URL formats could change.

### Scaling notes

Matching scores up to 3,000 of the most recently updated discoverable profiles per refresh, in memory. For larger communities, add `pg_trgm` trigram indexes on `profile_entries.value` and pre-filter candidates in SQL before scoring. If you want image storage outside Postgres, swap `illustrations.image` for object storage such as Vercel Blob.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL is not configured` | Create `.env.local` from `.env.example` and restart `npm run dev`. |
| `relation "users" does not exist` | Run `npm run db:migrate`. |
| Clerk redirects to an `accounts.dev` page | Set the `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` variables. |
| "Illustrations are turned off" | Set `IMAGE_API_KEY` and restart. |
| No suggestions appear | The other person must be **discoverable**, have entries marked *Used in matching*, and share at least one school, workplace, neighbourhood, nickname or name clue with your memory. |
