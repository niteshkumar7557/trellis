# The Trellis codebase: a tour for someone new

> **Read this first.** It explains the whole codebase at the level you need to find your
> way: what each folder is for, how a request flows, how the main features work, and where
> to make common changes. It doesn't repeat the deep docs; each section ends with where to
> go for the details. Checked against the code on **17 Nov 2026**, and on 21 Nov for the graph database's
> removal (production runs the merge of `chore/drop-graph-database`, released 21 Nov 2026).

## Contents

1. What Trellis is, in one minute
2. The repository at a glance
3. How it runs: the big picture
4. Six ideas you need before reading any code
5. `shared/`: the domain code both apps run
6. The frontend (`frontend/`)
7. The backend (`backend/`)
8. The data: Postgres and the content files
9. Sign-in, in brief
10. The helper and the AI, in brief
11. Two requests traced end to end
12. Tests, in brief
13. Running it locally
14. Releasing, operating and the admin scripts
15. Conventions and rules
16. Where to make common changes
17. Known gaps
18. Glossary

---

## 1. What Trellis is, in one minute

Trellis is a study platform built around a **map**: a knowledge graph of a subject (React
Native, Redis or MongoDB), with the topics and what each one depends on. A student picks a
goal, says what they already know, and the map shows **what to study next**, **what they
can skip**, and, when they're stuck, **the earlier topic that is probably why**.

**Trellis never teaches.** For any topic it assembles a prompt (from what the student
knows, what they told Trellis, and fixed instructions) that the student takes to **their
own AI** (ChatGPT, Claude, …). A side-panel chat, **the helper**, lets them report how
studying went in plain words; it proposes updates to the map, and nothing is saved until
they press Save.

It's an end-of-semester university project (backend course, due 21 Nov 2026), and it's
live at https://trellis.niteshkumar.xyz for real users.

The product is described fully in `docs/design.md`.

## 2. The repository at a glance

```
trellis/
├── CLAUDE.md                 the owner's rules for coding sessions + "where things stand"
├── README.md                 public overview, how to run it
├── docs/                     every design doc (start at docs/README.md)
├── shared/                   domain code that BOTH apps run (imported as @shared/*)
│   ├── types.ts              every data shape: the contract between frontend and backend
│   ├── data/                 the content: one reviewed file per subject, the sample student
│   ├── graph.ts              derived logic: statuses, next topic, skip, stuck suspects, …
│   ├── helper.ts             the helper's rules: read a message, reply, after a save
│   ├── parse.ts              keyword matching for the rule-based reader
│   └── prompt.ts             the three-part prompt builder
├── frontend/                 Next.js 16 app (React 19): every screen
│   ├── app/                  routes (App Router)
│   ├── components/           map, chat, landing page, brand, UI pieces
│   └── lib/                  api.ts (the API client), store.tsx (client state), usage.ts, theme, gsap
├── backend/                  Express 5 API (TypeScript, ESM)
│   ├── src/
│   │   ├── index.ts, app.ts  start-up; the middleware and routes in order
│   │   ├── config/           the one place that reads process.env
│   │   ├── routes/           URL → middleware → handler, one file per area
│   │   ├── controllers/      the handlers, one file per area
│   │   ├── repos/            every SQL statement, one file per area (graph.repo.ts reads shared/data)
│   │   ├── middlewares/      auth, validation, errors, rate limits
│   │   ├── ai/               the Bedrock call, the model reader, the money rules
│   │   ├── db/               pools, migrations, seeds, admin scripts
│   │   ├── utils/            tokens, Google, HttpError, health, …
│   │   └── types/            adds req.userId to Express
│   ├── test/                 Vitest unit tests; test/integration/ uses the real Postgres
│   └── tools/subject.ts      `npm run subject`: print a subject as Trellis works it out
├── desktop/                  the Mac app (Electron): the live site in a locked-down window (docs/desktop.md)
│   ├── src/main/             the main process: window, menu, tray, updates, deep links, sign-in
│   ├── src/preload/          the small bridge the page may use
│   └── test/                 Vitest (pure logic), Playwright (the real app)
├── deploy/                   production: docker-compose.yml, Caddyfile, release/deploy/backup scripts
├── docker-compose.dev.yml    the development database: Postgres (:5050)
└── team-tasks/, notes.txt    the owner's private notes (git-ignored)
```

**Why `shared/` exists:** the frontend and backend must give the **same answers** ("what's
next", "can I skip this"). If each had its own copy of the rules, they'd drift. So the rules
live once, in `shared/`, and both apps compile it in: the backend bundles it with tsup, and
the frontend compiles it as source (`experimental.externalDir` in `next.config.ts`).
`shared/` must stay free of React, Next and Node-only APIs.

## 3. How it runs: the big picture

**In production** (all on one AWS EC2 server in Sydney, as Docker Compose services):

```
 student's browser ── https://trellis.niteshkumar.xyz
        │
 CloudFront (an edge near India)    caches pages and scripts; never caches /api/*
        │  HTTPS + a secret header only our distribution knows
 Caddy (the server, Sydney)         gets its own HTTPS certificate; refuses anyone but our CloudFront
   ├── /api/*  → api   (Express, backend/)
   └── the rest → web  (Next.js, frontend/)
                  │
        ┌─────────┼──────────────────────────┐
     Postgres   Amazon Bedrock (GLM 5)       S3 (nightly backups)
     accounts,  called only by the API,      kept 14 days
     records    once per typed message
```

The topic graph has no box: the API reads it from `shared/data`, in memory.

**In development** there's no CloudFront or Caddy. You run Next on :3000 and Express on
:8000; Next's `rewrites()` (`frontend/next.config.ts`) forwards `/api/*` to Express, so the
browser still sees **one origin**, exactly as in production.

**Why one origin matters:** with the pages and the API on the same address there's no CORS
to configure, and the sign-in cookie can be `SameSite=Strict`, which blocks cross-site
request forgery for free.

**Two modes in the browser:**

- **live**: a signed-in student. Their record comes from the API.
- **demo**: a signed-out visitor. A sample student (`shared/data/student.ts`) kept in this
  browser's `localStorage`, with the helper running in the browser on the rules. Demo mode
  never calls the API's record routes or any AI.

Hosting details: `docs/aws.md`. Architecture reasons: `docs/backend-design.md` §2.

## 4. Six ideas you need before reading any code

**1. Topics come in two levels.** A subject has **big topics** (e.g. "Lists"), and each
opens into **subtopics** (e.g. "FlatList"). A topic is a `Topic` in `shared/types.ts`; a big
topic has `parentId: null`. Every topic has a difficulty (easy / medium / hard), a summary,
keywords and common mistakes, and is marked **core** or **optional**.

**2. Topics are linked.** An `Edge` is `needs` (FlatList *needs* Objects and arrays in
state: a prerequisite) or `helps` (a softer link). Links between big topics are **worked
out** from their subtopics' links, never written by hand (`bigNeedsFrom` in
`shared/data/index.ts`). A **goal** ("Build my first app") targets some big topics; what a
goal requires is computed from the links.

**3. Statuses are derived, never stored.** What's stored is what the student *said*:

| Stored | Meaning | Table |
|---|---|---|
| a **claim** | at the start ("the sort"): *I know this*, *shaky*, or *new* | `claims` |
| a **check-in** | later: *got it*, *partly*, or *stuck* on a subtopic | `check_ins` |
| an **experience** | a note: what felt *easy*, what was *hard*, what made it *click* | `experiences` |

From those, `deriveStatuses()` in `shared/graph.ts` computes each topic's status every time:
`new`, `know`, `shaky`, `learning`, `stuck` or `done`. **There's no status column
anywhere.** Same record, same map, in both apps.

**4. Nothing is saved without the student.** The helper chat never writes to the record.
It produces a **proposal** (shown as a confirm card); only the student pressing **Save**
creates check-ins and experiences, and there's **Undo** after. Even the topic panel's
Got it / Partly / Stuck buttons go through the helper.

**5. The AI only reads.** When a student *types* to the helper, one call to **GLM 5 on
Amazon Bedrock** turns the message into a small typed object (a `Reading`: which topic, how
it went, what they said). The reply, the statuses, "next", "skip" and "why stuck" are all
our own code. If the model is off, slow, broken or over budget, a keyword reader produces
the same `Reading` instead ("basic mode").

**6. Prompts are assembled, not generated.** `buildPrompt()` in `shared/prompt.ts` fills
templates from the record. No AI is involved, so the same record always gives the same
prompt.

## 5. `shared/`: the domain code both apps run

| File | What's in it | Key exports |
|---|---|---|
| `types.ts` | Every shape: `Subject`, `Topic`, `Edge`, `Goal`, `Claim`, `CheckIn`, `Experience`, `PromptTake`, `Instruction`, `Proposal`, `Card`, `ChatMessage`, `Student`, `AiUsage`, `Status`, `SubjectId` | types only |
| `data/react-native.ts`, `redis.ts`, `mongodb.ts` | One reviewed file per subject: its topics (with difficulty), links, goals and shortcuts. React Native and MongoDB come from official sources; Redis was adapted from roadmap.sh and credits it | the subject file |
| `data/build.ts` | Helpers for writing a subject file | `big()`, `sub()`, `edgesFrom()` |
| `data/index.ts` | The list of subjects (adding one is one line here plus its id in `SubjectId`), the lookups, the worked-out big-topic links, and about 1,500 self-checks (`console.assert`) run on import | `subjects`, `topics`, `edges`, `goals`, `topicById`, `subjectById`, `goalById`, `kids`, `bigOf`, `topicsOf`, `bigTopicsOf`, `subtopicsOf` |
| `data/instructions.ts` | Part 3 of every prompt: fixed instruction lines by layer (`base`, `status`, `topic`). The backend seeds these into Postgres | `instructions` |
| `data/student.ts` | The sample student: their goals, claims, check-ins, notes and conversation. Used by demo mode, the landing page and the golden test | `student`, `sample*` |
| `graph.ts` | Every derived rule | `deriveStatuses`, `statusOf`, `requiredFor`, `nextTopic`, `revealed` (which big topics are open), `importanceOf` (skip or not), `suspectsFor` (why stuck), `pastUnlocks`, `awaitingReport` ("how did it go?"), `unsortedAreas` |
| `helper.ts` | The helper: the `Reading` type, the rule-based reader, the reply logic, the after-save follow-up, suggestion chips, the guide answers about the app | `readByRules`, `readTap`, `replyFor`, `respond`, `afterSave`, `suggestionsFor`, `greeting`, `pendingQuestion`, `HELP_TOPICS` |
| `parse.ts` | Keyword matching for the rules | `findTopic`, `readOutcome`, `reasonIn`, `readKind`, `tidy`, `declines` |
| `prompt.ts` | The prompt builder and the links to ChatGPT and Claude | `buildPrompt`, `experiencesFor`, `chatGptUrl`, `claudeUrl` |

The rules themselves (how a status is chosen, how suspects are ranked) are written out in
`docs/design.md` §6 and §8 and `docs/backend-design.md` §7. Content editing:
`docs/frontend.md` §6 and `docs/subject-blueprint.md`.

## 6. The frontend (`frontend/`)

**Routes** (`frontend/app/`):

| Route | Screen |
|---|---|
| `/` | Landing page (the real map, live, on the sample student) |
| `/login`, `/signup` | Email and password, and "Continue with Google" (`app/(auth)/AuthForm.tsx`) |
| `/reset?token=…` | Set a new password with the admin's one-time link |
| `/auth/done` | Where Google sign-in lands |
| `/start`, `/start/sort` | Pick a subject and goal; sort the big topics into know / shaky / new |
| `/map` | The map, the topic sheet and the helper (home) |
| `/check-ins` | Every update and note; edit or delete |
| `/settings` | Account, theme, AI usage, export, delete everything |

**The pieces to know:**

- **`lib/api.ts`**: the one function every screen uses to call the backend, `api(path,
  options)`. It holds the access token **in memory** (never `localStorage`), and on a 401
  refreshes once and retries. Parallel refreshes share one request.
- **`lib/store.tsx`**: client state. On load it tries one refresh: success → **live** (load
  `GET /api/state`), failure → **demo**. Screens call `act.*` actions and never ask which
  mode they're in; each action does the right thing for the mode.
- **`components/map/`**: `layout.ts` (dagre layout: boxes, frames, lanes, arrowheads),
  `focus.ts` (what lights up on hover), `MapCanvas.tsx` (pan, zoom, drawing), `Rail.tsx`
  (the topic sheet and the prompt view), `Chat.tsx` (the helper thread and cards),
  `useHelper.ts` (runs the conversation: rules in the browser in demo, the API in live).
- **`components/app/Shell.tsx`**: the sidebar (with the AI usage meter) and top bar;
  `Search.tsx` is the ⌘K search; `Skeleton.tsx` shows grey shapes while the mode loads.
- **`components/landing/`**, **`components/brand/`**, **`components/art/`**: the landing
  page, the logo and icons, the espalier drawing. All SVG.

**Rules the frontend follows** (owner's): no raster images, everything is SVG drawn in
code; colours only from tokens in `app/globals.css` (light and dark); IBM Plex Sans (the
landing page's headings are Fraunces); motion through GSAP from `lib/gsap.ts`, respecting
reduced motion. Checks: `npx tsc --noEmit`, `npx eslint .`, `npm run lint:shared`.

Details: `docs/frontend.md` (every screen, the map's layout rules, the store, the data
contract).

## 7. The backend (`backend/`)

**Layers.** Each area of the API has one file in each of three folders:

```
routes/claims.routes.ts         which URL, which middleware, which handler
controllers/claims.controller.ts  read the request, call repos and shared/, send the reply
repos/claims.repo.ts            the SQL (and only the SQL)
```

**The middleware order** (`src/app.ts`, top to bottom; a request goes down until something
answers):

```
trust proxy (production) → helmet → express.json (100 KB) → cookieParser
→ /api/health → /api/auth → /api/me → /api/goals → /api/claims → /api/opened
→ /api/subject-requests → /api/check-ins → /api/experiences → /api/prompt-takes
→ /api/helper → /api/usage → /api/state + /api/export → /api/subjects → /api/topics
→ /api/instructions → 404 → the error handler
```

Inside a route: `requireAuth` (if signed-in only) → a rate limiter (where there is one) →
`validateBody(zodSchema)` → the handler.

**The API, by area:**

| Area | Routes | Notes |
|---|---|---|
| Accounts | `/api/auth/register`, `login`, `refresh`, `logout`, `reset-password`, `google`, `google/callback`; `/api/me` (GET, PATCH, DELETE) | §9 below |
| The whole record | `GET /api/state` (everything in one call, one snapshot), `GET /api/export` (a JSON download) | |
| The sort and goals | `PUT /api/goals/:subjectId`, `POST /api/claims`, `POST /api/opened`, `POST /api/subject-requests` | |
| Check-ins and notes | `GET/PATCH/DELETE /api/check-ins[/:id]`, `PATCH/DELETE /api/experiences/:id` | There's **no** "create check-in": only saving a proposal creates them |
| Prompts | `POST /api/prompt-takes`, `GET /api/instructions` | |
| The helper | `GET/POST /api/helper/:subjectId/messages`, `POST /api/helper/proposals/:id/save` / `cancel` / `undo` | §10 below |
| AI allowance | `GET /api/usage` | Percentages only |
| Content | `GET /api/subjects`, `/api/subjects/:id/graph`, `/api/topics/:id/path-to/:targetId` | Read from `shared/data` in memory (`src/repos/graph.repo.ts`); the frontend doesn't call them |
| Health | `GET /api/health` | 200 when Postgres is up, 503 when it isn't |

Every route, with bodies and answers: `docs/backend-design.md` §4.

**Patterns used everywhere:**

- **Errors:** throw `new HttpError(status, code, message)`; `error.middleware.ts` turns
  anything thrown into `{ "error": { "code", "message" } }`. Unknown errors become
  `500 internal` with no details (logged for us). Express 5 catches errors in `async`
  handlers by itself.
- **Validation:** `validateBody(schema)` runs zod and replaces `req.body` with the cleaned
  result, so a handler can trust it.
- **Scoping:** every query on a student's data uses the user id **from the access token**
  (`currentUserId(req)`), never from the URL or body. Someone else's row answers 404, not
  403, so the API never confirms it exists.
- **Transactions:** `inTransaction(work)` in `src/db/index.ts` for writes that must all
  happen or none; `readSnapshot(work)` for reads that must agree with each other (`/api/state`).
- **Ids** of topics and goals are plain strings checked against `shared/data`, not
  foreign keys (topics don't live in Postgres).
- **Config:** `src/config/index.ts` is the only file that reads `process.env`; it throws at
  boot on a missing or bad value (`JWT_SECRET` must be 32+ characters). Every variable is in
  `backend/example.env`.
- **Start-up** (`src/index.ts`): Postgres must be reachable or the server stops; with `AI_PROVIDER=bedrock` the Bedrock warm-up starts.

## 8. The data: Postgres and the content files

**Two places, two jobs:**

| Where | Holds | Source of truth? |
|---|---|---|
| `shared/data/*.ts` | The content: subjects, topics, links, goals, prompt instructions | **Yes.** Reviewed like code |
| Postgres | Accounts and every student's record | Yes |

**Postgres tables** (migrations `backend/src/db/migrations/0001` to `0019`; the files are
the truth, and they only move forward: never edit one that has run, add a new one):

| Table | What a row is |
|---|---|
| `users` | An account: name, lower-case email, bcrypt hash (null for Google-only), `google_sub`, `email_verified_at`, `joined_at` |
| `refresh_tokens` | One signed-in browser: the SHA-256 hash of its cookie, sliding expiry |
| `password_resets` | A one-hour, one-use reset link (its hash) |
| `student_goals` | One goal per subject |
| `claims` | What the student said at the sort (history kept; the latest counts) |
| `opened_topics` | Big topics opened early with "Look inside now" |
| `subject_requests` | What visitors typed into "Learning something else?" (keeps no user after deletion) |
| `chat_messages` | The helper conversation, one thread per subject; `read_by` says who read a student message (`model`, `rules`, `tap`) |
| `proposals` | A change the helper offered: `open`, `saved`, `cancelled` or `undone`; at most one open per subject |
| `check_ins` | A status change on a subtopic (created only by a saved proposal) |
| `experiences` | A note: the student's words and a clean line for prompts |
| `prompt_takes` | A prompt was copied or opened in an AI (drives "how did it go?") |
| `prompt_instructions` | Seeded from `shared/data/instructions.ts` |
| `ai_calls` | Every model call, **numbers only** (tokens, cost, latency, error): the money count behind the AI limits |
| `_migrations` | Which migration files have run |

Every student table has `ON DELETE CASCADE` from `users`, so deleting an account deletes the
whole record in one statement. The two exceptions keep a row without its owner on purpose
(`ON DELETE SET NULL`): `ai_calls` (the money was spent) and `subject_requests`.

Details, with every column and why: `docs/backend-design.md` §3. How the API reads the
content: §2 "Where content lives" (there is no graph database since 21 Nov 2026).

## 9. Sign-in, in brief

| Flow | What happens | Code |
|---|---|---|
| Sign up / log in | zod checks and lower-cases the email; bcrypt (cost 12); one `401 invalid_credentials` for every failure (and a dummy hash so timing can't tell either) | `controllers/auth.controller.ts`, `repos/users.repo.ts` |
| A session | Two tokens: an **access token** (JWT, 15 minutes, only the user id, kept in the page's memory and sent as `Authorization: Bearer`) and a **refresh token** (random, 60 days from last use, in an `HttpOnly; SameSite=Strict; Path=/api/auth` cookie; only its SHA-256 hash is stored) | `utils/tokens.ts`, `repos/auth.repo.ts` |
| A protected request | `requireAuth` checks the JWT's signature (no database lookup) and sets `req.userId` | `middlewares/auth.middleware.ts` |
| Staying signed in | On a 401 or a page load the frontend calls `POST /api/auth/refresh`, which checks the cookie's hash and slides its expiry | `frontend/lib/api.ts` |
| Google | Server-side OAuth code flow with a `state` cookie; the ID token is verified; the account is found by Google id, linked by verified email (removing a password nobody proved), or created | `utils/google.ts`, `signInWithGoogle` in `users.repo.ts` |
| Google from the desktop app | Google opens in the student's browser; the callback stores a two-minute one-time code instead of a session, `/auth/desktop` passes it to the app by `trellis://`, and the app swaps it plus its PKCE verifier for a session (`POST /api/auth/desktop/exchange`) | `googleStart`/`googleCallback`/`desktopExchange` in `auth.controller.ts`, `repos/desktop-handoffs.repo.ts`; `docs/desktop.md` §5 |
| Forgotten password | No email yet: the admin runs `npm run reset-link -- email` and replies with a one-hour, one-use link; using it sets the password and signs out every device | `db/reset-link.ts`, `usePasswordReset` |
| Delete the account | `DELETE /api/me` asks for the password again (403, not 401, when wrong) | `controllers/me.controller.ts` |
| Rate limits | 10 per 15 minutes per IP on login, register, reset and delete; 60 on refresh; `trust proxy` = 2 in production so the IP is the visitor's | `middlewares/rate-limit.middleware.ts` |

Every reason and alternative: `docs/backend-design.md` §4 "Auth" and §8 "Security".

## 10. The helper and the AI, in brief

A typed message, `POST /api/helper/:subjectId/messages {text}`
(`controllers/helper.controller.ts`):

1. 30 messages a minute and 100 typed messages a day per student (taps are never limited).
2. Load the record and derive the statuses (`loadContext`).
3. **Read** the message into a `Reading`:
   - `readByModel()` (`src/ai/reader.ts`) → `callForJson()` (`src/ai/bedrock.ts`):
     **reserve** the worst-case cost in `ai_calls` under a Postgres advisory lock (a limit
     reached → no call), **call** GLM 5 on Bedrock (JSON schema, temperature 0, 6-second
     timeout, one attempt), **settle** the real cost. The reply is checked with zod and
     against the map (`checkReading`). Anything wrong → `null`.
   - `null` → `readByRules()` (`shared/helper.ts`), the keyword reader.
4. **Reply** with `replyFor(reading, ctx)` (`shared/helper.ts`), the same code whichever
   reader read it.
5. Store the student's message and the reply (and a proposal for a confirm card) in one
   transaction. Answer with both messages and the account's AI usage as percentages.

A tap (`{pick}`) skips step 3: `readTap()` needs no model.

**Money:** each account has $0.06 a day and $0.25 a week of AI, and the site $0.50 a day
(the cap on the bill). At a limit nothing is refused: the rules answer ("basic mode").
Students see only percentages (`GET /api/usage`); the owner sees dollars with
`npm run ai:spend`.

**What's sent to the model:** the fixed instructions, the subject's topic list, the
pending question, the open topic, and the message. Never a name, email or anyone else's
data. Message text is never logged and never stored in `ai_calls`.

**Saving:** `POST /api/helper/proposals/:id/save` locks the open proposal, re-checks every
field, writes the check-ins and experiences, and stores a follow-up (`afterSave`: the likely
cause and a prompt when stuck, the next topic when done). Cancel and Undo work once each.

Details: `docs/backend-design.md` §5 (the helper, the model call, cost limits) and §6
(prompts); `docs/design.md` §7 and §12; `docs/aws.md` §5 (Bedrock).

## 11. Two requests traced end to end

**A. A signed-in student opens `/map`.**

```
browser loads the page (from CloudFront's cache)
→ lib/store.tsx: refreshAccessToken()  POST /api/auth/refresh  (the cookie goes along)
     backend: refresh() → useRefreshToken(hash) → UPDATE … RETURNING user_id → new JWT
→ store.goLive(): api("/state")  GET /api/state  Authorization: Bearer <JWT>
     backend: requireAuth → state.controller → readSnapshot(): goals, claims, check-ins,
              experiences, opened, prompt takes, latest 50 messages per subject, usage
→ store hydrates (mode "live"); the map page runs shared/graph.ts in the browser:
     deriveStatuses → nextTopic → revealed → layout.ts draws it
```

**B. The student taps "Stuck" on FlatList, then saves.**

```
the topic sheet's Stuck button (app/(app)/map/page.tsx)
→ useHelper.pick("stuck", ["rn-flatlist"], "Stuck: FlatList")
→ POST /api/helper/react-native/messages { pick: {outcome, topicIds, label} }
     backend: readTap() → replyFor(): "Sounds like you're stuck on FlatList. What's confusing about it?"
              stored with asks = {kind: "hard", pending: proposal}
→ student types "the keys"  → POST …/messages {text}
     backend: readByModel() (or the rules) → path "answer", one "hard" experience
              → replyFor(): a confirm card; insertMessage() creates the proposals row
→ student presses Save  → POST /api/helper/proposals/<id>/save {proposal}
     backend: one transaction: lock the proposal, check the topics, insert the check-in
              and the experience, mark it saved, afterSave(): "You may be stuck because of
              Objects and arrays in state…" + a prompt card
→ the store adds the rows; statuses are derived again; FlatList shows as stuck and the
  suspect's frame opens on the map
```

## 12. Tests, in brief

Backend only, with Vitest and supertest:

```bash
cd backend
npm test                  # 323 unit tests in 33 files, no database, ~3 s
npm run test:integration  # 90 tests in 13 files against the dev Postgres, ~20 s
npm run typecheck
```

Unit tests fake the repos with `vi.mock` and drive small Express apps with supertest; the
integration tests use the real app and Postgres, including race tests (20 AI
reservations at once, a double-clicked Save). Bedrock is always faked. A golden test pins
what the sample student is told. GitHub Actions runs every check on every push
(`.github/workflows/ci.yml`), and `deploy/release.sh` won't ship a commit that failed. The
frontend has no test runner. Everything about it: `docs/testing.md`.

## 13. Running locally

```bash
# 1. the database (from the repo root)
docker compose -f docker-compose.dev.yml up -d     # Postgres on :5050

# 2. the backend
cp backend/example.env backend/.env                # then set JWT_SECRET (openssl rand -hex 32)
cd backend && npm install
npm run db-init                                    # migrations + seed (prompt instructions)
npm run dev                                        # http://localhost:8000

# 3. the frontend
cd ../frontend && npm install && npm run dev       # http://localhost:3000
```

- Signed out, you get the demo (the sample student). Sign up to get a live account against
  your local database.
- `AI_PROVIDER=off` (the default) means the rules read every message and no AWS is needed.
  With `AI_PROVIDER=bedrock` on a laptop you need `AWS_PROFILE=trellis` and
  `aws login --profile trellis`, **after the account check in `docs/aws.md` §2**.
- Google sign-in needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `backend/.env` and
  `NEXT_PUBLIC_GOOGLE_SIGNIN=on` in `frontend/.env`; without them the button is hidden.
- Look at the database: `docker exec -it trellis-dev-db psql -U trellis -d trellisdb`.

## 14. Releasing, operating and the admin scripts

| Task | How |
|---|---|
| Release the current commit | `./deploy/release.sh` from the repo root, on a clean committed tree, **never piped** (a pipe hides a failed build). It checks the AWS account, builds both images for arm64, pushes them to ECR, runs `deploy/deploy.sh <tag>` on the server through Session Manager (migrations and the graph seed run as one-shot containers before the API starts), and clears CloudFront's cache. It doesn't run the tests: run them first |
| Roll back | `deploy.sh <previous tag>` on the server (`docs/aws.md` §6) |
| A forgotten password | `docker compose exec api node dist/db/reset-link.js student@example.com` (dev: `npm run reset-link -- …`) |
| What the AI costs | `docker compose exec api node dist/db/ai-spend.js` (dev: `npm run ai:spend`) |
| Logs | `docker compose logs -f api` on the server. There's no per-request log, only start-up lines, warnings and errors |
| Backups | Nightly `pg_dump` to S3 by a systemd timer, kept 14 days; `deploy/restore-test.sh` |
| A subject's curriculum, as Trellis works it out | `npm run subject -- react-native [--goal a,b]` in `backend/` |
| Any AWS command | **First the check in `docs/aws.md` §2.** The AWS tools on the owner's machine were signed in to another account; never act on that one |

## 15. Conventions and rules

- **Comments explain why**, not what the syntax does. Write code a student can read,
  debug and take over (the owner's rule; `CLAUDE.md`).
- **Keep it simple:** one router, controller and repo file per area; no clever
  abstractions.
- **Every decision in the docs has a reason;** when you change one, change the reason and,
  for a product decision, add a row to `docs/design.md` §16.
- **Docs change with the code**, in the same commit.
- **Tests ship with every change.**
- **SQL:** parameterised only, scoped by the token's user id, in `repos/` only.
- **Errors:** `{error:{code,message}}` through `HttpError`; never leak internals.
- **Migrations only move forward.**
- **Frontend:** SVG only, colours from tokens, IBM Plex Sans, GSAP from `lib/gsap.ts`.
- **Git:** work on a branch from `main`; push, merge and deploy only when the owner says so,
  and ask how to merge (squash, merge commit or direct). No AI co-author lines.
- Keep the post-semester distribution plan out of the repository's docs.

## 16. Where to make common changes

| I want to… | Touch |
|---|---|
| Add an API route | `routes/<area>.routes.ts` (+ `requireAuth`, `validateBody`), `controllers/<area>.controller.ts`, `repos/<area>.repo.ts`, mount in `src/app.ts` if it's a new area; a route test with the repo faked and an integration test (`docs/testing.md` §10); the route table in `backend-design.md` §4 |
| Add a column or table | A new file `backend/src/db/migrations/0020_….sql`, then `npm run db:migrate:dev`; the repo; `backend-design.md` §3 |
| Change a shape shared by both apps | `shared/types.ts`, then both apps' type checks |
| Change how statuses, "next", "skip" or suspects work | `shared/graph.ts`; expect `golden.test.ts` and `suspects.test.ts` to tell you what changed; update `design.md` §6/§8 |
| Change what the helper says | `shared/helper.ts` (`replyFor`, `afterSave`); update the snapshot after reading its diff (`npx vitest run test/helper.test.ts -u`) |
| Change what the AI is told, or its schema | `backend/src/ai/reader.ts` (`instructionsFor`, `READING_SCHEMA`, `ModelReading`, `checkReading`); a new schema needs a long first compile on Bedrock (`backend-design.md` §5) |
| Change an AI limit or price | `AI_*` / `READER_PRICE_*` in the env (Parameter Store in production), then a release |
| Change a prompt's wording | `shared/data/instructions.ts` (then `npm run db-init` locally; a release re-seeds) or `shared/prompt.ts` |
| Edit a subject's topics | `shared/data/<subject>.ts`; `npm test` (the data checks and map layout tests) and `npm run subject -- <id>`; a release ships it |
| Add a subject | `docs/subject-blueprint.md`: one file, one line in `shared/data/index.ts`, its id in `SubjectId` |
| Change a screen | `docs/frontend.md` §4 and §5 say which file |

## 17. Known gaps

The current list, kept in one place: `docs/backend-design.md` §11 "Known gaps" (and §12
open questions). In short, on 17 Nov 2026: the AI now costs about $0.003 a message rather
than $0.002, so students reach basic mode sooner; there's no request logging (since 21 Nov,
CI runs the tests on every push); the frontend has no tests; no refresh-token rotation and no email
verification (both written down as choices in §4).

## 18. Glossary

| Word | Meaning |
|---|---|
| **big topic / subtopic** | The map's two levels: a big topic opens into its subtopics |
| **core / optional** | Whether a subtopic is needed for its big topic to count as done |
| **needs / helps** | A prerequisite link / a softer link between topics |
| **goal** | What a student is aiming for in a subject; decides what's required and what's skippable |
| **the sort** | The first step: the student marks each big topic know / shaky / new (**claims**) |
| **check-in** | A got / partly / stuck update on a subtopic |
| **experience** | A note on how a topic went: easy, hard, or what made it click |
| **status** | new, know, shaky, learning, stuck, done: derived, never stored |
| **revealed / opened** | A big topic shown open on the map, because the student reached it or pressed "Look inside now" |
| **suspect** | A prerequisite that may be why a topic is stuck ("may be why") |
| **the helper** | The chat in the map's side panel |
| **Reading** | The small typed object a message is read into, by the model or the rules |
| **proposal / confirm card** | A change the helper offers; nothing is saved until the student presses Save |
| **basic mode** | The rules read the messages because the AI is off, failing or at a limit |
| **prompt take** | The student copied a prompt or opened it in ChatGPT or Claude |
| **live / demo** | Signed in with a real record / signed out on the sample student |
