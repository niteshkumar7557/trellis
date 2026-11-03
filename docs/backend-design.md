# Trellis — backend design

The backend's system design, the build plan, and **how the team works**. Read this with
`docs/design.md` (the product, the source of truth) and `docs/frontend.md` (the screens and
the data contract the backend serves).

**Status (3 Nov 2026):** designed, not built. The frontend is finished and runs on sample
data with no API calls. The existing backend has only auth and two old chat tables.

---

## 0. How the team works (read this first in every session)

### Who does what

| Who | Role |
|---|---|
| **The owner** (the student who leads the project) | Ideas, product decisions, reviewing and merging. Talks to Claude. Doesn't hand-write the teammates' code. |
| **Three teammates** | Write and commit the backend code. They are busy, know basic JavaScript/TypeScript, SQL and Git, and **do not know this codebase**. Their commits count towards their grade, so the code must be theirs. |
| **Claude** | Plans the backend, keeps these docs current, and writes the teammates' task files. Does not write the teammates' backend code unless the owner asks for scaffolding. |

### The daily loop

1. The owner opens a **fresh** Claude session and asks: *"what's next in the backend?"*
2. Claude reads `CLAUDE.md`, this file (especially §11 **Progress**), `git log` and the
   current backend code, then picks the **next three tasks** from the plan (§10).
3. Claude writes **three task files**, one per teammate:
   `team-tasks/<YYYY-MM-DD>/task-A-<slug>.md`, `task-B-…`, `task-C-…`.
   `team-tasks/` is git-ignored: the owner sends the files to teammates outside GitHub.
4. Each teammate works on their own branch, commits, and opens a pull request.
5. The owner reviews and merges, and does any wiring the tasks said to leave
   (registering routers in `app.ts`, for example).
6. In the next session Claude reads what merged and updates §11 **Progress** before
   planning more.

### The rules for the three task files

- **Independent.** Any one can be done first, or alone. No task waits on another task from
  the same day.
- **No shared files.** Two tasks on the same day never edit the same file. Each task
  creates its own files: its own router file, its own controller, its own migration, with
  the migration **number reserved in the task** (for example, Task A gets `0007_…`, Task B
  gets `0008_…`). Lines that would touch shared files, like registering a router in
  `src/app.ts`, are **left to the owner**, and the task says so in a "Don't touch" list.
- **Self-contained and hand-holding.** A teammate must be able to finish using only the
  task file and the repo. Paste in everything they need: the exact shapes (JSON and
  TypeScript), the SQL, the rules ("status is never stored"), the file paths. Never write
  "see the codebase" or "as discussed".
- **Small.** Two to four focused hours each. Split anything bigger across days.
- **Checkable.** Every task ends with commands and expected output (`curl` with the
  response, a `psql` query, or `npm test`) and a "done when" checklist.

### The task file template

Use these sections, in this order:

```markdown
# Task <A|B|C> · <short title>          (<date>, about <N> hours)

## Why this matters
Two or three sentences: what this unlocks for students, in plain words.

## Before you start
- Pull the latest `backend/v1` and create your branch: `git checkout -b task/<date>-<letter>-<slug>`
- Setup commands (database up, env vars, `npm install`), exactly as typed.

## What you'll build
A short list of the files you create or change, with full paths.

## Step by step
Numbered steps. Each has:
- what to do and why, in one or two lines
- the code, or a skeleton with the parts to fill in clearly marked
- the exact SQL for any migration
- the shapes (request and response JSON, TypeScript types), copied in full

## Check it works
Exact commands, and what you should see.

## Done when
- [ ] checklist items a reviewer can tick

## Commit and open a PR
Branch name, commit message (Conventional Commits, e.g. `feat(api): add claims endpoint`),
PR title, and what to write in the PR description.

## Don't touch
Files owned by other tasks today, and wiring left to the owner.

## If you get stuck
Common errors and their fixes; who to ask.
```

### Git for the team

- Integration branch: **`backend/v1`**, created on 3 Nov 2026 from `main`, which holds the
  finished frontend. Merging into `main` happens only on the owner's say-so.
- Teammates branch from `backend/v1` as `task/<date>-<letter>-<slug>` and open PRs back into it.
- Claude commits only docs and its own planning, never a teammate's task, and never pushes.

---

## 1. What the backend must do

Serve the frontend's data contract (`docs/frontend.md` §Data contract) for real students:

1. **Accounts:** sign up, log in, stay logged in, log out, see/export/delete everything.
2. **Content:** the two subject maps (React Native, Redis): big topics, subtopics, links,
   goals, and the prompt instructions. The same for everyone, read-only.
3. **Each student's record:** goals, sort claims, check-ins, experiences, opened big topics,
   helper conversations. Private to them.
4. **The helper:** read a message, route it, propose updates, save only on confirm, and
   word the reply. AI is called here and nowhere else.
5. **Derived facts:** statuses, next topic, skip or not, why stuck, which big topics are
   open. **Computed, never stored**, by the same code the frontend uses.

Out of scope for v1 (design.md §14): reminders, notifications, groups, admin panel, students
adding subjects.

## 2. Architecture

```
 Browser ──► Next.js frontend (frontend/)
                │  REST/JSON, Bearer access token + httpOnly refresh cookie
                ▼
            Express API (backend/, Node 24, TypeScript, ESM)
             ├─ shared/  ← the same domain code the frontend runs:
             │            types, subject data, graph logic, prompt builder, helper rules
             ├─ Postgres  ← accounts and every student's record
             ├─ Neo4j     ← the topic graph (content only; seeded from shared/data)
             └─ OpenRouter
                 ├─ Jev (TypeSafe AI)  → picks the helper's path (cheap, typed)
                 └─ DeepSeek v4.1 flash → reads messages that need language
```

Deployed with Docker Compose (db, neo4j, backend, frontend) behind a Cloudflare Tunnel.

### The shared domain code (decided)

The backend must give the frontend's **same answers**: if they disagree about "next topic"
or "can I skip", the product breaks. So the domain logic lives in one place both import
(moved out of `frontend/lib/` in M0.1, done 3 Nov 2026):

```
shared/
  types.ts          ← every shape (the data contract)
  data/             ← react-native.ts, redis.ts, build.ts, index.ts (with its checks), instructions.ts
  graph.ts          ← statuses, summaries, next, revealed, importance, suspects, past unlocks
  prompt.ts         ← the three-part prompt builder
  parse.ts          ← keyword topic/outcome reading (the fallback reader)
  helper.ts         ← the helper's rules: questions, proposals, replies (the fallback brain)
```

- The frontend imports it through a path alias (`@shared/*` in `frontend/tsconfig.json`);
  Next compiles it as source with `experimental.externalDir`. The frontend Docker image
  builds from the repo root so it can copy `shared/` (`frontend/Dockerfile`,
  `frontend/Dockerfile.dockerignore`). **The backend image will need the same change** in
  M0.2: its compose `context` is `./backend` today, which can't see `shared/`.
- Lint it with `npm run lint:shared` (in `frontend/`); `npx eslint .` there doesn't reach it.
- The backend currently builds with `tsc` (`module: nodenext`), which needs `.js` extensions
  on relative imports. The frontend code has none. **Decision:** build the backend with
  **tsup** (esbuild), which bundles `shared/` and handles extensionless imports; keep `tsx`
  for development. This is milestone M0.
- `shared/` stays free of React, Next and Node-only APIs.

### Where content lives (decided: Neo4j for the topic graph, owner's call, 3 Nov 2026)

- **Source of truth for content:** the reviewed TypeScript files in `shared/data/`. Teammates
  review and edit them in pull requests, and the checks in `shared/data/index.ts` must pass.
- **Neo4j holds the graph**, seeded from those files by `npm run seed:graph`. The seed is
  idempotent (`MERGE`) and deletes nodes that are no longer in the files:

  ```
  (:Subject {id, name, shortName, blurb})
  (:Topic {id, name, summary, minutes, optional, big, keywords, mistakes})-[:OF]->(:Subject)
  (:Topic)-[:IN]->(:Topic)            subtopic in its big topic
  (:Topic)-[:NEEDS]->(:Topic)         from dependent to prerequisite
  (:Topic)-[:HELPS]->(:Topic)
  (:Goal {id, name, blurb})-[:FOR]->(:Subject),  (:Goal)-[:TARGETS]->(:Topic)
  ```
- **At boot the API loads the graph from Neo4j into memory** (about 190 topics and 230
  links), and `shared/graph.ts` computes statuses, next, skip and why-stuck from that
  snapshot. It reloads after a reseed. Per-student data stays in Postgres: statuses are
  derived, never stored in either database.
- **Where Neo4j does real work** (so it's more than storage, and it shows):
  - `GET /api/subjects/:id/graph` reads straight from Neo4j with Cypher.
  - `GET /api/topics/:id/path-to/:targetId`: "what stands between this topic and that one?"
    is a variable-length `NEEDS` path query (`MATCH p = (t:Topic {id:$target})-[:NEEDS*]->(s:Topic {id:$id})`),
    returning the chain in learning order. The helper can later answer "how far am I from
    Publishing?" with it.
  - Neo4j Browser (port 7474) is a good demo screen for the course: the whole subject as a
    live graph.
- **Honest note, kept for the record:** at this size Postgres tables could hold the graph,
  and in-memory derivation means most requests never touch Neo4j. It was kept for the course
  showcase and for v2 (concepts shared across subjects, "learning from everyone"). Keep all
  Cypher behind one `graphRepo` module (`src/repos/graph.repo.ts`), so nothing else in the
  backend knows which database holds the graph.

## 3. Postgres schema

Existing (keep): `users`, `refresh_tokens`, `_migrations` (the migration runner's own table).
Existing (drop, by migration): `conversations`, `messages`, the old chat UI, plus the old seed
data in `src/db/seed.ts`, which seeds those chats.

New tables. Topic and goal ids are the string ids from `shared/data` (e.g. `rn-flatlist`).
They are plain `TEXT` columns, checked in code against the graph, because the topics live
in Neo4j, not Postgres.

```sql
-- 0005: widen names (VARCHAR(20) is too short) and remember when people joined
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(60);
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(254);
ALTER TABLE users ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 0006: the old chat UI's tables
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;

-- 0007: a goal per subject
CREATE TABLE student_goals (
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,                 -- 'react-native' | 'redis'
  goal_id    TEXT NOT NULL,                 -- e.g. 'goal-rn-first-app'
  since      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_id)
);

-- 0008: what the student said at the sort (history kept; the latest per topic counts)
CREATE TABLE claims (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,                   -- usually a big topic
  claim    TEXT NOT NULL CHECK (claim IN ('know','shaky','new')),
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON claims (user_id, topic_id, at DESC);

-- 0009: helper conversations (one thread per subject)
CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('student','helper')),
  text       TEXT NOT NULL,
  cards      JSONB,                         -- Card[] (see frontend.md)
  asks       JSONB,                         -- { kind, pending: Proposal }
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON chat_messages (user_id, subject_id, at);

-- 0010: status changes, always on a subtopic
CREATE TABLE check_ins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id   TEXT NOT NULL,
  outcome    TEXT NOT NULL CHECK (outcome IN ('got','partly','stuck')),
  text       TEXT NOT NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON check_ins (user_id, at);

-- 0011: what the student said about how it went
CREATE TABLE experiences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id   TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('easy','hard','clicked')),
  text       TEXT NOT NULL,                 -- their words
  line       TEXT NOT NULL,                 -- clean one line for prompts
  uses       INT  NOT NULL DEFAULT 0,       -- prompts taken with it; a 'hard' one stops at 2
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON experiences (user_id, topic_id);

-- 0012: big topics opened early with "Look inside now"
CREATE TABLE opened_topics (
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, topic_id)
);

-- 0013: part 3 of every prompt, seeded from shared/data/instructions.ts
CREATE TABLE prompt_instructions (
  id       TEXT PRIMARY KEY,
  scope    TEXT NOT NULL CHECK (scope IN ('base','status','topic')),
  status   TEXT,                            -- for scope 'status'
  topic_id TEXT,                            -- for scope 'topic'
  text     TEXT NOT NULL,                   -- may use {topic} and {gap}
  position INT  NOT NULL DEFAULT 0
);

-- 0014: every AI call, for cost and the Jev-vs-DeepSeek story in the report
CREATE TABLE ai_calls (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  model       TEXT NOT NULL,
  purpose     TEXT NOT NULL,                -- 'route' | 'read'
  input_tokens INT, output_tokens INT, latency_ms INT,
  ok          BOOLEAN NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The numbers above are the plan. When a task creates a migration, it **reserves its number**
in the task file, so two teammates never clash.

`gen_random_uuid()` is built into Postgres 13+ (the project uses Postgres 18).

## 4. API

All JSON. New routes live under **`/api`**; the existing auth stays at `/user/*`. Errors
always look like `{ "error": { "code": "not_found", "message": "…" } }`, with sensible HTTP
statuses (400 validation, 401 auth, 403, 404, 409 conflict, 429 rate limit, 502 AI failure).
Every `/api` route needs the access token (`Authorization: Bearer …`) except `GET /api/subjects`
and `GET /api/subjects/:id/graph`. Request bodies are validated with **zod**.

### Auth (exists; small changes)

| Method | Path | Notes |
|---|---|---|
| POST | `/user/register` | `{name, email, password}` → `{access_token, user}` + refresh cookie |
| POST | `/user/login` | same response |
| POST | `/user/refresh` | refresh cookie → new access token |
| POST | `/user/logout` | clears the cookie and the stored token |
| GET | `/user/me` | **change:** return the frontend's `Student` shape `{id, name, email, joinedAt, goals[]}` |

Later: Google OAuth2 (listed in tech-stack.md), not v1.

### Content (public, cacheable)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/subjects` | `Subject[]` |
| GET | `/api/subjects/:subjectId/graph` | `{ topics: Topic[], edges: Edge[], goals: Goal[] }`. The frontend currently imports these files directly, so it can keep doing that and use this endpoint later. |
| GET | `/api/topics/:topicId/path-to/:targetId` | `Topic[]`: the prerequisite chain from one topic up to another, in learning order (Cypher, §2) |
| GET | `/api/instructions` | `Instruction[]` (so the frontend assembles prompts locally, with no round trip per prompt card) |

### The student's record

| Method | Path | Body → Returns |
|---|---|---|
| GET | `/api/state` | → `{ student, goalIds, claims, checkIns, experiences, opened, messages }`, everything the frontend store holds, in one call |
| PUT | `/api/goals/:subjectId` | `{goalId}` → `{subjectId, goalId, since}` |
| POST | `/api/claims` | `{claims: [{topicId, claim}]}` → `Claim[]` (the sort; later claims win per topic) |
| POST | `/api/opened` | `{topicId}` → `204` |
| GET | `/api/check-ins` | → `CheckIn[]`, newest first |
| PATCH | `/api/check-ins/:id` | `{topicId?, outcome?, text?}` → `CheckIn` |
| DELETE | `/api/check-ins/:id` | → `204` |
| PATCH | `/api/experiences/:id` | `{text, kind?}` → `Experience`; the server re-tidies `line` |
| DELETE | `/api/experiences/:id` | → `204` |
| POST | `/api/experiences/used` | `{ids: string[]}` → `204`, when a prompt is **taken** (Copy, ChatGPT, Claude) |
| GET | `/api/export` | → everything above as one JSON download |
| DELETE | `/api/me` | → `204`. Deletes the account and everything with it. There is no undo. |

There is **no** "create check-in" endpoint. Updates are created only by saving a helper
proposal, so the topic panel's buttons also go through the helper (design.md §7).

### The helper

| Method | Path | Body → Returns |
|---|---|---|
| GET | `/api/helper/:subjectId/messages` | → `ChatMessage[]` |
| POST | `/api/helper/:subjectId/messages` | `{text}` **or** `{pick: {outcome, topicIds, label}}` → `{ messages: [studentMessage, helperReply] }` |
| POST | `/api/helper/messages/:messageId/cards/:index/save` | `{proposal}` (possibly edited) → `{ checkIns, experiences, followUp: ChatMessage }` |
| POST | `/api/helper/messages/:messageId/cards/:index/cancel` | → `{ message }` |
| POST | `/api/helper/messages/:messageId/cards/:index/undo` | → `{ message }` (deletes what that save created) |

Rules the server enforces (mirroring `shared/helper.ts`):
- **Nothing is written from a message.** A message only adds chat rows. Check-ins and
  experiences are created **only** by `save`, in one transaction.
- A new open proposal marks older open ones in the same subject as `cancelled`.
- Only the message's owner can save, cancel or undo it. Undo works once, only on `saved`.
- `topicIds` in a proposal must be subtopics of that subject (checked against the graph).

## 5. The helper pipeline

```
POST /api/helper/:subject/messages {text}
  1. save the student message
  2. load state → derive statuses, next, required, revealed   (shared/graph.ts)
  3. pending question? (the helper message just before this one has `asks`)
  4. route:  Jev → { path, confidence }
       paths: report | answer | next | skip | why_stuck | explain | app_help | other
       confidence < ROUTER_MIN_CONFIDENCE  → treat as `other`
  5. by path:
       next / why_stuck / app_help      → shared/helper.ts replies, no text model
       skip / explain                   → topic by keyword (shared/parse.ts);
                                          none found → DeepSeek picks the topic
       report / answer / other          → DeepSeek reads it (step 6)
  6. DeepSeek (JSON schema output, topic ids limited to this subject):
       { topicIds[], outcome?, reason?, experience?: {kind, text, line}, isQuestion }
  7. shared/helper.ts builds the reply: the one question (with `asks`), or a confirm card
     with the proposal, or a prompt card, or a choice of topics
  8. save the helper message → return both messages
  On any AI failure or timeout (8 s): use shared/helper.ts `respond()`, the rule-based
  brain the frontend runs today. The helper keeps working, just less cleverly.
```

- **The AI never decides** statuses, the next topic, skip or not, or why someone is stuck:
  `shared/graph.ts` does. The AI only routes, picks topics, reads outcomes and writes the
  clean `line`.
- **What is sent to OpenRouter:** the message, the pending question if there is one, and
  the subject's topic ids and names. Never names, emails or other students' data. Design.md
  §11 and §12 promise this, and the Settings page must say it.
- **Models (env):** `OPENROUTER_API_KEY`, `ROUTER_MODEL` (Jev; look up its exact slug on
  openrouter.ai/models), `READER_MODEL` (DeepSeek v4.1 flash; check its slug the same way),
  `ROUTER_MIN_CONFIDENCE=0.7`, `AI_TIMEOUT_MS=8000`. The client goes in
  `backend/src/ai/` (`jev.ts` and `deepseek.ts` exist and are empty).
- **Every call is logged** in `ai_calls` (model, purpose, tokens, latency, ok).
- **Rate limit:** 30 helper messages per student per minute (`express-rate-limit`, in
  memory; Redis only if the backend ever runs as several instances).

### After saving

`save` runs in one transaction: insert the check-ins and experiences, mark the card `saved`
with their ids, then compute the follow-up with `shared/helper.ts afterSave()` (stuck: the
likely cause plus a prompt; partly: the same topic; done: next topic plus "that opened X").
The follow-up is stored as a helper message and returned.

## 6. Prompts

Assembled, never generated (design.md §9): `shared/prompt.ts buildPrompt(topic, statuses,
checkIns, experiences, instructions)`.
- Part 1 **known topics**: template text from statuses.
- Part 2 **experiences**: this topic's own only, newest first, at most 4; a `hard` one is
  left out once its `uses` reaches 2.
- Part 3 **instructions**: from `prompt_instructions`, by layer (status, then topic incl.
  its common mistakes, then base). The base layer always says not to remind the student
  of past mistakes.

The frontend assembles prompts locally with the same function, using `/api/instructions`.
Since M0.1, `buildPrompt` takes the instructions as a parameter; the frontend passes
`shared/data/instructions.ts` until M6 swaps in the API.

## 7. Derived logic (must match the frontend exactly)

All of it lives in `shared/graph.ts`; the rules are in design.md §6 and §8. In short:
- A subtopic's status is its latest check-in (`got` → done, `partly` → learning, `stuck` →
  stuck), else its own claim, else its big topic's claim, else new.
- A big topic's status: done/know when every core subtopic is done or known; stuck if any is
  stuck; learning if any is under way; else its claim.
- A goal needs its target big topics, everything they stand on, their core subtopics, and
  anything those need.
- Next: an in-progress ready subtopic first, else the first ready one on the route.
- Revealed: a big topic opens on a check-in inside it, when next is inside it, when it holds
  a stuck topic's likely cause, or when opened by hand.
- Suspects: prerequisites up to two steps below a stuck topic, weakest first.

**Golden test** (M0.3, `backend/test/golden.test.ts`): with the sample student
(`shared/data/student.ts`) the React Native next topic is **State**, FlatList is stuck, its
first suspect is **State**, and **Redis has no goal**. Both apps import the same `shared/`
files, so one test covers both. `backend/test/data-checks.test.ts` fails if any
`console.assert` in `shared/data/index.ts` fails.

## 8. Cross-cutting

- **Config:** `backend/src/config/index.ts` is the only place that reads `process.env`.
  Add `NEO4J_URL` (e.g. `bolt://localhost:7687`), `NEO4J_USER`, `NEO4J_PASSWORD` and the AI
  variables above.
- **Dev env gotcha:** `backend/example.env` uses port 5432 in `DB_URL`, but
  `docker-compose.dev.yml` maps Postgres to **5050**. Point `DB_URL` at 5050.
- **Errors:** one Express error-handling middleware producing the error shape in §4, plus
  `async` handler wrappers (Express 5 catches rejected promises by itself).
- **Security:** helmet and CORS (exist); bcrypt (exists); refresh token in an httpOnly
  cookie (exists); every query scoped by `user_id` from the token, never from the body;
  parameterised SQL only.
- **Tests:** Vitest plus supertest. Unit tests for `shared/` and integration tests per route
  against a test database. Each task ships its own tests.
- **Code style:** TypeScript `strict`, ESM, small files. The backend drops
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (M0.2), because `shared/`
  fails them with 13 errors and must type-check the same way in both apps. Small files: one router, one
  controller, one repo file per area (`src/routes/claims.routes.ts`,
  `src/controllers/claims.controller.ts`, `src/repos/claims.repo.ts`).
- **Observability (later, M7):** Sentry, UptimeRobot for downtime, Healthchecks for the
  nightly database backup (tech-stack.md).

## 9. Connecting the frontend

`frontend/lib/store.tsx` is the only place to change. Today it is a `useReducer` store
persisted to localStorage (`trellis-demo-v4`). When the API is ready:
- hydrate from `GET /api/state` instead of localStorage;
- turn each action into its request (goal → `PUT /api/goals`, claims → `POST /api/claims`,
  open → `POST /api/opened`, edit/remove → PATCH/DELETE, used → `POST /api/experiences/used`);
- `components/map/useHelper.ts` calls the helper endpoints instead of `shared/helper.ts`;
- `app/(auth)/AuthForm.tsx` calls `/user/register` and `/user/login`, and keeps the access
  token in memory, refreshing on 401;
- keep a "demo mode" flag that uses the sample data, so the landing page demo still works
  without an account.

## 10. The build plan (milestones and tasks)

Each line is roughly one teammate task. Within a milestone, tasks marked with the same
letter group can run on the same day, because they don't share files. Claude splits these
into the daily three.

**M0: Foundations** (do first)
- M0.1 ✅ Create `shared/` by moving `frontend/lib/{types,graph,prompt,parse,helper}.ts` and
  `frontend/lib/data/*`. Add the alias to the frontend; `tsc` and `eslint` must stay clean,
  and the app must look and behave exactly the same. Also make `buildPrompt` take the
  instructions as a parameter (§6). Done by the owner with Claude, 3 Nov 2026.
- M0.2 Backend build: tsup for build, tsx for dev, Vitest set up, zod added, the error
  middleware, and config for the new env vars. The backend reaches `shared/` by a relative
  path or a tsconfig `paths` alias that tsup resolves, and its Docker build moves to the
  repo root as the frontend's did (§2).
- M0.3 Golden test of `shared/graph.ts` (§7).
- M0.4 Migrations 0005 and 0006; replace the old chat seed with an empty seed script.

**M1: Content (Neo4j)**
- M1.1 Neo4j 5 in `docker-compose.dev.yml` (ports 7474/7687, a volume, healthcheck), the
  `neo4j-driver` package, config, and `src/db/neo4j.ts` (driver + `verifyConnectivity` at boot).
- M1.2 `npm run seed:graph`: `MERGE` subjects, topics, `IN`/`NEEDS`/`HELPS`, goals and
  `TARGETS` from `shared/data`; add uniqueness constraints on `Topic.id`, `Goal.id` and
  `Subject.id`; remove stale nodes.
- M1.3 `src/repos/graph.repo.ts`: Cypher reads plus the in-memory snapshot at boot;
  `GET /api/subjects`, `GET /api/subjects/:id/graph`.
- M1.4 Migration 0013, the instructions seed, and `GET /api/instructions`.
- M1.5 `GET /api/topics/:id/path-to/:targetId` (the Cypher path query, §2).

**M2: The student's record**
- M2.1 Migration 0007 plus `PUT /api/goals/:subjectId`; `/user/me` returns `Student`.
- M2.2 Migration 0008 plus `POST /api/claims`.
- M2.3 Migration 0012 plus `POST /api/opened`.
- M2.4 `GET /api/state` (after M2.1–M2.3 and M3).

**M3: Check-ins and experiences**
- M3.1 Migration 0010 plus `GET/PATCH/DELETE /api/check-ins`.
- M3.2 Migration 0011 plus `PATCH/DELETE /api/experiences`, `POST /used`.
- M3.3 `GET /api/export` and `DELETE /api/me`.

**M4: The helper without AI** (works end to end on the rule-based brain)
- M4.1 Migration 0009 plus `GET/POST /api/helper/:subject/messages` using
  `shared/helper.ts respond()`.
- M4.2 save, cancel and undo (one transaction; retire older proposals).

**M5: The helper with AI**
- M5.1 OpenRouter client with timeout, retries and `ai_calls` logging (migration 0014).
- M5.2 Jev routing, with the confidence threshold and fallback.
- M5.3 DeepSeek reader with JSON-schema output and topic ids limited to the subject.
- M5.4 Rate limit plus tests with a mocked OpenRouter.

**M6: Connect the frontend** (owner or Claude: one store file)
- M6.1 Store on the API, plus real auth, loading and error states, and demo mode.

**M7: Deploy**
- M7.1 Production compose with Neo4j, env files and the Cloudflare Tunnel.
- M7.2 Nightly Postgres backup, Healthchecks ping, Sentry, UptimeRobot.

## 11. Progress

Update this table at the start of each planning session from `git log` and merged PRs.

| Task | Status | Who | Merged in |
|---|---|---|---|
| M0.1 Move the domain code into `shared/` | done | owner, with Claude | `backend/v1`, 3 Nov 2026 |
| M0.2 tsup, Vitest, zod, error handler, Docker from the root | assigned (Task A, 3 Nov) | — | — |
| M0.3 Golden test + data checks test | assigned (Task B, 3 Nov) | — | — |
| M0.4 Migrations 0005–0006, empty seed, Neo4j + AI config | assigned (Task C, 3 Nov) | — | — |
| everything else | not started | — | — |

**Owner wiring for the 3 Nov tasks:**
- ✅ Done 3 Nov: removed the `/conversations` route from `src/app.ts` and deleted the old chat
  code (its route, controller, `src/ai/index.ts`, and the chat types). Task C then drops
  its tables.
- After Task A merges: in `src/app.ts`, register `app.use(notFound); app.use(errorHandler);`
  after all routes (`import { errorHandler, notFound } from "./middlewares/error.middleware.js";`).

## 12. Open questions for the owner

- The exact OpenRouter slugs for Jev and DeepSeek v4.1 flash (check on openrouter.ai).
