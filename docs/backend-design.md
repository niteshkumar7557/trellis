# Trellis: backend design

How the backend is built and why: architecture, data model, API, auth, the helper, error
handling, and the build plan. Every choice comes with its reason and the alternatives we
turned down, so you can change it later knowing what you are trading.

Read it with `docs/design.md` (the product, the source of truth), `docs/aws.md` (where it
runs) and `docs/frontend.md` (the screens and the data contract).

**Status (14 Nov 2026):** M0 to M6 and MS are done and on `main` (M5 squashed in on
14 Nov). **The helper reads typed messages with GLM 5 on Bedrock in Sydney**, tried
against the real service (§5 "The first real call"). M7 (deploy) is next, planned for
15 Nov (§10, §11). **Open before M7:** Bedrock moved to Sydney "close to the hosting"; is
the server going to Sydney too? `docs/aws.md` still plans Mumbai.

**AWS on this machine:** the `trellis` profile exists (`aws login --profile trellis`,
account `631603562964`, checked 14 Nov 2026). Run the check in `docs/aws.md` §2 before
any AWS step anyway: the sign-in expires, and the default profile is still another
account's.

**Google sign-in is live in development:** the owner set up the OAuth client (published,
"In production"), with its id and secret in `backend/.env` and
`NEXT_PUBLIC_GOOGLE_SIGNIN=on` in `frontend/.env` (14 Nov 2026).
**The deadline is 21 Nov 2026**: the build is planned for 13 to 15 Nov (re-planned on
13 Nov from 13 to 17 Nov), then testing with real users.

**Contents:** 0 Workflow and rules · 1 What the backend does · 2 Architecture · 3 Data
model · 4 API and auth · 5 The helper · 6 Prompts · 7 Derived logic · 8 Cross-cutting ·
9 Connecting the frontend · 10 Build plan · 11 Progress · 12 Open questions

---

## 0. Workflow and rules

### Workflow

1. Read `CLAUDE.md`, this file (especially §11 **Progress**) and `git log`, and bring §11
   up to date.
2. Take the next tasks from §10, in order, and build each with its tests:
   `npm run typecheck`, `npm test` and `npm run test:integration` stay green against the
   real databases. Update the docs that change.
3. Each milestone is built on its own branch from `main` (`backend/m2`, `backend/m3`, …).
   When it's done it merges into `main` with a **merge commit, never a squash**, so every
   commit keeps its author in the history, and the branch is deleted. Push and merge only
   when the owner says so. (The owner chose a squash for M4 on 14 Nov 2026; that was a
   one-off unless the owner changes this rule.)
4. Never create two branch names that differ only by case (a `Backend/m2` next to
   `backend/m2` corrupts remote-tracking refs in every clone on macOS and Windows).

### Rules for every coding session

The owner is a student who will read, write and debug this code himself. So:

1. **Write code as if a student will maintain it.** Comments explain **why** the code is
   there and why it is done this way. They do not describe what the syntax does.
   - Good: `// Hashed, so a leaked database cannot be used to log in as anyone.`
   - Bad: `// hash the token`
2. **Keep the structure simple enough to debug by hand.** One router, one controller and
   one repo file per area. No clever abstractions, no code generation, no framework the
   owner has not already used. If a simpler shape does the job, use it and say what it
   gives up.
3. **Every decision in the docs has a reason.** When you change a decision, change the
   reason too, and add a row to design.md §16 if it is a product decision.
4. **The owner must be able to take over at any point.** After each task, the docs, the
   progress table (§11) and the tests describe the true state. Never leave work that only
   the session that wrote it can finish.
5. **Tests ship with every task.** A task without tests is not done.
6. **Before any AWS action, check which AWS account is active** (`docs/aws.md` §2). Never
   act on any account except the Trellis one.

---

## 1. What the backend must do

Serve the frontend's data contract (`docs/frontend.md` §12) for real students:

1. **Accounts:** sign up, log in (password or Google), stay logged in, log out, reset a
   password, see, export and delete everything.
2. **Content:** the two subject maps (React Native, Redis): big topics, subtopics, links,
   goals, and the prompt instructions. The same for everyone, read-only.
3. **Each student's record:** goals, sort claims, check-ins, experiences, prompts taken,
   opened big topics, helper conversations. Private to them.
4. **The helper:** read a message, propose updates, save only on confirm, and build the
   reply. AI is called here and nowhere else.
5. **Derived facts:** statuses, next topic, skip or not, why stuck, which big topics are
   open. **Computed, never stored**, by the same code the frontend uses.

Out of scope for v1 (design.md §14): reminders, emails, groups, an admin panel, students
adding subjects.

## 2. Architecture

```
                 trellis.niteshkumar.xyz  (HTTPS)
                          │
                    ┌─────▼─────┐
                    │   Caddy   │   gets and renews the HTTPS certificate by itself
                    └──┬─────┬──┘
              /api/*   │     │   everything else
            ┌──────────▼─┐ ┌─▼──────────┐
            │ Express API│ │  Next.js   │
            │ (backend/) │ │ (frontend/)│
            └┬────┬────┬─┘ └────────────┘
             │    │    │
     ┌───────▼┐ ┌─▼────┴┐      ┌──────────────────────────┐
     │Postgres│ │ Neo4j │      │ Amazon Bedrock (GLM 5)   │
     │ record │ │ graph │      │ called by the API only   │
     └────────┘ └───────┘      └──────────────────────────┘

  All five boxes are containers on ONE server (Docker Compose). Bedrock is an AWS service
  the API calls over the network. shared/ is compiled into both the API and the frontend.
```

### One origin

The browser talks to a single address. Caddy sends `/api/*` to the API and everything
else to Next.

- **Why:** with one origin there is no CORS to configure, and the sign-in cookie can be
  `SameSite=Strict`, which blocks cross-site request forgery without extra code.
- **Alternative:** the API on its own subdomain (`api.trellis…`). Rejected: it needs CORS
  with credentials and a looser cookie, for no gain at this size.
- **Alternative:** let Next forward `/api` to the backend in production too (its
  `rewrites()`). Rejected: one more hop, the API would go down whenever Next does, and the
  API would see Next's address instead of the visitor's, which breaks rate limiting.
- **In development** there is no Caddy. Next's `rewrites()` in `frontend/next.config.ts`
  forwards `/api/*` to the backend, so the browser still sees one origin. That rewrite
  must keep the `/api` prefix (today it strips it; fix in M6.1).

**Every backend route starts with `/api`** (auth included, at `/api/auth/*`; moved from
`/user/*` in M2.1, before anything called it).

### The shared domain code

The backend must give the frontend's **same answers**: if they disagree about "next topic"
or "can I skip", the product breaks. So the domain logic lives in one place both import:

```
shared/
  types.ts          ← every shape (the data contract)
  data/             ← react-native.ts, redis.ts, build.ts, index.ts (with its checks), instructions.ts
  graph.ts          ← statuses, summaries, next, revealed, importance, suspects, past unlocks
  prompt.ts         ← the three-part prompt builder
  parse.ts          ← keyword topic/outcome reading (the rule-based reader)
  helper.ts         ← the helper's rules: questions, proposals, replies
```

- Both apps import it as `@shared/*`. The backend bundles it with **tsup** at build time
  (`tsc` only type-checks); the frontend compiles it as source (`experimental.externalDir`).
  Both Docker images build from the repo root so they can copy `shared/`.
- `shared/` stays free of React, Next and Node-only APIs.
- Lint it with `npm run lint:shared` (in `frontend/`).
- **Why not an npm package or a monorepo tool:** two apps and one folder do not need one.
  A path alias is the least machinery that works.

### Where content lives

- **Source of truth:** the reviewed TypeScript files in `shared/data/`. Changes are
  reviewed like code, and the checks in `shared/data/index.ts` must pass.
- **Neo4j holds a copy of the graph**, seeded from those files by `npm run seed:graph`.
  The seed is idempotent (`MERGE`) and deletes nodes that are no longer in the files:

  ```
  (:Subject {id, name, shortName, blurb, position})
  (:Topic {id, name, summary, minutes, optional, big, keywords, mistakes, position})-[:OF]->(:Subject)
  (:Topic)-[:IN]->(:Topic)                 subtopic in its big topic
  (:Topic)-[:NEEDS {position}]->(:Topic)   from dependent to prerequisite
  (:Topic)-[:HELPS {position}]->(:Topic)
  (:Goal {id, name, blurb, position})-[:FOR]->(:Subject)
  (:Goal)-[:TARGETS {position}]->(:Topic)
  position: where it sits in the file. A database keeps no order; the map depends on it.
  ```
- **Where Neo4j does real work:**
  - `GET /api/subjects` and `GET /api/subjects/:id/graph` read from it with Cypher.
  - `GET /api/topics/:id/path-to/:targetId` is a variable-length `NEEDS` path query.
  - Neo4j Browser (port 7474, dev only) shows the whole subject as a live graph.

### Neo4j is not allowed to take the site down (changed 12 Nov 2026)

**Built in M2.6.** Before it, the API refused to start unless Neo4j was up and matched
the files. Now:

- The API starts whether or not Neo4j is reachable. It logs the problem and carries on.
- The three Neo4j endpoints above answer `503 graph_unavailable` while it is down, or
  while its contents do not match the files ("drift").
- Everything else works, because it never needed Neo4j: `shared/graph.ts` computes from
  the files in `shared/data`.
- A topic id is checked against `shared/data` (`topicById`), not against the Neo4j
  snapshot.
- `GET /api/health` reports both databases, and only Postgres decides whether it is healthy.
- **How the API knows** (`src/middlewares/graph.middleware.ts`): `checkGraph()` in
  `graph.repo.ts` answers `ok`, `down` or `drift`. The answer is remembered for 30 seconds,
  so a Neo4j that comes back, or gets reseeded, is noticed without a restart. A Neo4j query
  that fails mid-request with `ServiceUnavailable` also answers 503 (not 500) and forgets
  the remembered state. The driver gives up after 3 seconds instead of its default 30.

**Why:** nothing a student sees depends on Neo4j, so an outage there should cost two
endpoints, not the whole product. It also removes the deploy trap where a content change
needs "seed, then restart" in exactly the right order.

**Alternatives:** keep it required at start (rejected: an outage for no user benefit);
remove Neo4j from production (rejected by the owner: it is kept for the course and for
v2 ideas such as concepts shared across subjects).

**Honest note, kept for the record:** at this size Postgres tables could hold the graph.
Keep all Cypher in `src/repos/` (`graph.repo.ts`, `paths.repo.ts`) and
`src/db/graph-seed.ts`, so nothing else in the backend knows which database holds it.

### The AI

One model, **GLM 5 on Amazon Bedrock** (model id `zai.glm-5`, region `ap-southeast-2`, Sydney). It is
called once per typed helper message and nowhere else. Details in §5.

## 3. Data model (Postgres)

**Principles**

- **Store what the student said; compute the rest.** There is no status column anywhere.
- **Every student row has `user_id` and `ON DELETE CASCADE`**, so deleting the account
  deletes everything in one statement, and no query can forget whose row it is.
- **Topic and goal ids are plain `TEXT`** (e.g. `rn-flatlist`), checked in code against
  `shared/data`. They cannot be foreign keys, because topics do not live in Postgres.
- **The server sets every timestamp.** A client's clock is never trusted.
- **Migrations only move forward.** Never edit a migration that has run anywhere; add a
  new one. The runner (`src/db/migrate.ts`) applies every `.sql` file not yet recorded in
  `_migrations`, in filename order, each in its own transaction.

**What exists today:** every table below (`ai_calls` is migration 0018, M5.1), plus
`prompt_instructions` and `_migrations`. Migrations 0001 to 0017 exist.

The SQL below is the plan. Once a migration file exists, the file is the truth.

### Accounts

```sql
-- 0007_auth.sql
-- Google-only accounts have no password, so the column must allow NULL.
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
-- Google's permanent id for the account. One column, because there is one provider.
ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE;
-- NULL until something proves the person owns the address (Google today, an emailed
-- code later). Sign-in rules depend on it (§4).
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
-- Emails are compared in lower case everywhere.
UPDATE users SET email = lower(email);

-- Refresh tokens were stored as plain text. From now on only a SHA-256 hash is stored,
-- so a copy of the database cannot be used to log in as anyone. Old rows cannot be
-- converted, so everyone logs in once more.
DELETE FROM refresh_tokens;
ALTER TABLE refresh_tokens RENAME COLUMN token TO token_hash;
ALTER TABLE refresh_tokens ALTER COLUMN expires_at TYPE TIMESTAMPTZ;
ALTER TABLE refresh_tokens ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- One-time reset links. Made by the admin script today; by an emailed code later.
CREATE TABLE password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,          -- the link holds the token; we keep its hash
  expires_at TIMESTAMPTZ NOT NULL,          -- one hour after it is made
  used_at    TIMESTAMPTZ,                   -- set once; a used link never works again
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- **Why a `google_sub` column and not an identities table:** a separate table is the
  general answer for many sign-in providers. With one provider it is an extra join and an
  extra file to understand. Move to a table when a second provider arrives.
- **Why hash refresh and reset tokens but not with bcrypt:** they are long random strings,
  not human passwords, so a fast hash (SHA-256) is safe and lets us look a token up by its
  hash in one indexed query.

### The student's record

```sql
-- 0008_student_goals.sql: one goal per subject
CREATE TABLE student_goals (
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,                 -- 'react-native' | 'redis'
  goal_id    TEXT NOT NULL,                 -- e.g. 'goal-rn-first-app'
  since      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_id)
);

-- 0009_claims.sql: what the student said at the sort. History is kept; the latest per
-- topic counts.
CREATE TABLE claims (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,                   -- usually a big topic
  claim    TEXT NOT NULL CHECK (claim IN ('know','shaky','new')),
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON claims (user_id, topic_id, at DESC);

-- 0010_opened_topics.sql: big topics opened early with "Look inside now"
CREATE TABLE opened_topics (
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, topic_id)
);

-- 0011_subject_requests.sql: what people typed into "Learning something else?"
CREATE TABLE subject_requests (
  id      BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,   -- the request outlives the account, without the name
  text    VARCHAR(120) NOT NULL,
  at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### The helper: messages and proposals

```sql
-- 0012_chat_messages.sql: one thread per subject
CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('student','helper')),
  text       TEXT NOT NULL,
  cards      JSONB,     -- what the reply shows: prompt, choose, suggest, or {type:'confirm', proposalId}
  asks       JSONB,     -- { kind, pending }: a question whose answer the helper is waiting for
  read_by    TEXT CHECK (read_by IN ('tap','model','rules')),   -- student rows: who read it. For debugging
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON chat_messages (user_id, subject_id, at);

-- 0014_proposals.sql: a change the helper offers. NOTHING is written to the record until
-- its state becomes 'saved'.
CREATE TABLE proposals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,  -- the helper message showing the card
  state      TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','saved','cancelled','undone')),
  payload    JSONB NOT NULL,                -- the Proposal: { updates, experiences, said }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);
-- The database itself guarantees at most one open proposal per student and subject.
CREATE UNIQUE INDEX proposals_one_open ON proposals (user_id, subject_id) WHERE state = 'open';
```

**Why proposals get their own table (changed 12 Nov 2026).** The earlier plan kept each
proposal inside the message's `cards` JSON and addressed it by card position. That made
the most important write in the system hard to do safely:

- Two Save requests (a double click, a retry after a slow reply) could both pass and
  create the check-ins twice.
- "A new proposal cancels the older open one" meant searching inside JSON.

With a table, Save is one guarded statement:

```sql
UPDATE proposals SET state = 'saved', payload = $3, decided_at = NOW()
WHERE id = $1 AND user_id = $2 AND state = 'open'
RETURNING *;
-- No row back? It was already saved, cancelled or never theirs: answer 409, write nothing.
```

Cancel and Undo are the same shape (`'open' → 'cancelled'`, `'saved' → 'undone'`), and Undo
deletes exactly the rows that carry this proposal's id.

**Alternative:** keep the JSON and lock the message row (`SELECT … FOR UPDATE`). It works,
but the logic lives in application code that every future change must get right. A state
column and a unique index make the database refuse the mistake.

### Check-ins, experiences, prompts taken

```sql
-- 0015_check_ins.sql: status changes, always on a subtopic
CREATE TABLE check_ins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id    TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('got','partly','stuck')),
  text        TEXT NOT NULL,                -- the student's words, or a short label for a tap
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,  -- what created it; Undo deletes by this
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON check_ins (user_id, at);
CREATE INDEX ON check_ins (proposal_id);

-- 0016_experiences.sql: what the student said about how it went
CREATE TABLE experiences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id    TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('easy','hard','clicked')),
  text        TEXT NOT NULL,                -- their exact words
  line        TEXT NOT NULL,                -- a clean one-line version for prompts
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON experiences (user_id, topic_id);
CREATE INDEX ON experiences (proposal_id);

-- 0017_prompt_takes.sql: a prompt was copied or opened in an AI
CREATE TABLE prompt_takes (
  id       BIGSERIAL PRIMARY KEY,
  user_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  via      TEXT NOT NULL CHECK (via IN ('copy','chatgpt','claude')),
  at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON prompt_takes (user_id, at DESC);
```

- **`experiences.uses` is gone (changed 12 Nov 2026).** It counted how many prompts a hard
  note had been in. The rule is now tied to the topic's status (§6), so nothing is counted
  and the prompt is a pure function of the record again.
- **`prompt_takes` is new.** It is what lets Trellis ask "how did State go?" when the
  student comes back (design.md §7). It replaces the old `POST /api/experiences/used`.
- The API still returns `messageId` on a check-in or experience (the frontend shows where
  it came from). It is read through the proposal: `proposals.message_id`.

### Content and bookkeeping

```sql
-- 0013 (exists): part 3 of every prompt, seeded from shared/data/instructions.ts
-- prompt_instructions (id, scope, status, topic_id, text, position)

-- 0018_ai_calls.sql: every model call. For cost, for the daily budget, and for debugging.
CREATE TABLE ai_calls (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE SET NULL,
  model         TEXT NOT NULL,              -- 'zai.glm-5'
  purpose       TEXT NOT NULL CHECK (purpose IN ('read','warmup')),
  input_tokens  INT,
  output_tokens INT,
  cost_usd      NUMERIC(10,6),              -- worked out from the token counts and the configured prices
  latency_ms    INT NOT NULL,
  ok            BOOLEAN NOT NULL,
  error         TEXT,                       -- a short code: 'timeout', 'throttled', 'bad_output', …
  at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON ai_calls (at);
```

`ai_calls` never stores the message text. It holds numbers only. **Built in M5.1.**
`user_id` is `SET NULL` on delete, not `CASCADE`: a deleted student's calls were still paid
for, and today's budget must still count them. A `warmup` row (§5) has no student.

`gen_random_uuid()` is built into Postgres 13+ (the project uses Postgres 18).

## 4. API and auth

All JSON, all under `/api`. Request bodies are validated with **zod** (`validateBody`).

### Errors

Every error leaves the server in one shape:

```json
{ "error": { "code": "not_found", "message": "No such topic." } }
```

- `code` is for the frontend's code: stable, snake_case. `message` is for people.
- Route handlers throw `HttpError(status, code, message)`; one error middleware turns
  anything thrown into this shape. Unknown errors become `500 internal` with no details,
  and the real error goes to the log with the request id.
- **Why one shape:** the frontend has one place to handle failures, and no stack trace or
  SQL ever reaches a browser.

| Status | Codes | When |
|---|---|---|
| 400 | `invalid_request`, `invalid_json` | The body does not fit its schema, or names an id that is not in `shared/data` |
| 400 | `reset_link_invalid` | A reset link that is unknown, expired or already used |
| 401 | `unauthorized`, `invalid_credentials` | No valid token; wrong email or password |
| 403 | `forbidden`, `wrong_password` | Signed in, but not allowed; the password given to delete the account is wrong or missing. 403, not 401, because the frontend answers every 401 by refreshing and retrying |
| 404 | `not_found` | No such route or row (also when the row is someone else's) |
| 409 | `email_taken`, `proposal_not_open` | The request conflicts with the current state |
| 413 | `too_large` | Body over 100 KB |
| 429 | `rate_limited`, `daily_limit` | Too many requests |
| 500 | `internal` | A bug or an outage on our side |
| 503 | `graph_unavailable` | Neo4j is down or out of date; only the three graph routes |

A row that belongs to another student answers **404, not 403**, so the API never confirms
that an id exists.

### Auth: how it works

```
 password or Google ──► the server checks it ──► two things come back:
   1. an ACCESS TOKEN   a signed JWT, good for 15 minutes, holding only the user id.
                        The frontend keeps it in memory and sends it as
                        `Authorization: Bearer …` on every /api call.
   2. a REFRESH TOKEN   a long random string in an httpOnly cookie, good for 60 days from
                        its last use. The browser sends it only to /api/auth/*.
 When the access token expires, the frontend calls POST /api/auth/refresh and gets a new one.
```

| Choice | Why | Alternative and why not |
|---|---|---|
| Short JWT plus a stored refresh token | A normal request is checked without touching the database. Logging out or deleting the account kills the refresh token at once | A plain server session in a cookie: simpler, and a fair choice. Kept as is because the code exists and it is the pattern most APIs use |
| The access token holds only `sub` (the user id) | A name or email inside a token goes stale when edited, and anyone holding the token can read it | The old payload `{id, role, name, email}` |
| Access token in memory, never in localStorage | A script injected into the page cannot steal it from storage | localStorage: survives reloads, but so does a theft |
| Refresh cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth` | Scripts cannot read it; other sites cannot make the browser send it | `SameSite=Lax`: needed only if the API were on another site |
| Refresh tokens hashed in the database | A leaked database or backup cannot log in as anyone | Plain text (what exists today) |
| 60 days, extended on each use | A student returning after six weeks is still signed in (design.md §10) | 7 days: they would meet a login wall exactly when coming back is hardest |
| No refresh-token rotation in v1 | Each tab refreshes on load. With rotation, two tabs opening together would race and one would be logged out | Rotation with reuse detection is the stricter practice. Add it with a short grace window when there is time to test it |
| bcrypt for passwords (cost 12) | It exists and is sound | argon2id is the newer default; not worth a migration now |

**Where this falls short of production practice, on purpose:** no rotation (above), and no
email verification for password accounts until SES is added. Both are written down so
they are choices, not surprises.

**Rules the server enforces**

- **Login never says which part was wrong.** An unknown email and a wrong password both
  answer `401 invalid_credentials`. (Today the code answers 404 and 400, which tells an
  attacker which emails have accounts.)
- **Passwords:** 8 to 72 characters. bcrypt ignores everything after 72 bytes, so longer
  ones are refused rather than silently cut.
- **Emails** are trimmed and lower-cased before any lookup or insert.
- **Rate limits** (§8) apply to every auth route except logout (it only ever removes a
  session).
- **An unknown email takes as long as a wrong password.** Login compares against a fixed
  dummy bcrypt hash when there is no account, so the reply's timing cannot reveal which
  emails exist either.
- **The server refuses to start** without `JWT_SECRET` (32 characters or more) and
  `DB_URL`. A missing secret must never become a silent default.

### Auth: routes

| Method | Path | Body → Returns |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → `{accessToken, student}` + refresh cookie |
| POST | `/api/auth/login` | `{email, password}` → the same |
| POST | `/api/auth/refresh` | refresh cookie → `{accessToken}` |
| POST | `/api/auth/logout` | → `204`. Deletes the stored token and clears the cookie |
| GET | `/api/auth/google` | → redirects to Google |
| GET | `/api/auth/google/callback` | Google sends the browser back here → sets the refresh cookie → redirects to `/auth/done` |
| POST | `/api/auth/reset-password` | `{token, password}` → `204`. Signs out every device. It does not sign this browser in: the student logs in with the new password, which proves it works |
| GET | `/api/me` | → `Student` `{id, name, email, joinedAt, hasPassword, goals[]}` |
| PATCH | `/api/me` | `{name}` → `Student`. The email cannot be changed in v1 (no way to verify the new one) |
| DELETE | `/api/me` | `{password}` if the account has one → `204`. Deletes the account and everything with it (one `DELETE`; every table cascades) and clears the refresh cookie. Rate-limited like login |
| GET | `/api/export` | → everything Trellis holds about the student, as one JSON download (`Content-Disposition: attachment`), unpaged. Left out on purpose: the password hash and the token hashes |

### Sign in with Google

The server-side "authorization code" flow, with the official `google-auth-library`:

1. `GET /api/auth/google` makes a random `state`, stores it in a 10-minute httpOnly
   cookie, and redirects to Google asking for `openid email profile`.
2. Google sends the browser back to `/api/auth/google/callback?code=…&state=…`.
3. The server checks `state` against the cookie (so the reply belongs to a sign-in this
   browser started), swaps `code` for an ID token, and verifies that token.
4. It requires Google's `email_verified` to be true. Then:
   - **A user with this `google_sub` exists** → sign them in.
   - **A user with this email exists** → link Google to it and mark the email verified.
     If the email had **never been verified**, also remove the password and delete that
     account's refresh tokens.
   - **Nobody yet** → create the user, email already verified.
5. It sets the refresh cookie and redirects to `/auth/done`, where the frontend calls
   `/api/auth/refresh` and goes to `/start` (no goal yet) or `/map`.

- **Why remove an unverified password on linking:** password sign-up does not prove you
  own the email. Someone could register a classmate's address first, wait for them to
  sign in with Google, and then log in with the password they chose. Removing it closes
  that door. The real owner loses nothing, because they never set that password.
- **Why the server-side flow:** the app keeps its own SVG button, loads no Google script,
  and the secret stays on the server.
- **Alternative:** Google's own button with an ID token posted from the browser. Fewer
  routes, but it draws Google's button and loads their script on the sign-in page.
- **Setup outside the code:** an OAuth client in Google Cloud Console (free) with the
  redirect URIs `https://trellis.niteshkumar.xyz/api/auth/google/callback` and
  `http://localhost:3000/api/auth/google/callback`. It gives `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET`.

### Forgotten passwords

**v1 (no email):**

1. The login page tells the student to email the admin from their sign-up address.
2. The admin runs `npm run reset-link -- student@example.com` on the server. It inserts a
   `password_resets` row and prints `https://trellis.niteshkumar.xyz/reset?token=…`,
   valid for one hour.
   In production: `docker compose exec api node dist/db/reset-link.js student@example.com`.
   Making a new link cancels any older unused one. The link is printed once; only its
   hash is stored, so a lost link means making another.
3. The admin replies with the link. The student sets a new password
   (`POST /api/auth/reset-password`), which marks the link used and deletes all of that
   account's refresh tokens.

**Why a link and not "the admin sets a password":** the admin never knows any password,
and the link dies after one use or one hour.

**Later (SES):** `POST /api/auth/forgot-password {email}` emails a six-digit code, using
the same `password_resets` table (a code is a short token with a tighter expiry and an
attempt limit). Sending goes through one small module, `src/mail/mailer.ts`, with a single
function per kind of email. It does not exist yet; the name is reserved so the later
change touches one place. See `docs/aws.md` §8.

### Content (the same for everyone)

| Method | Path | Returns | Sign-in |
|---|---|---|---|
| GET | `/api/subjects` | `Subject[]` | no |
| GET | `/api/subjects/:subjectId/graph` | `{ topics, edges, goals }` | no |
| GET | `/api/topics/:topicId/path-to/:targetId` | `Topic[]`: the prerequisite chain, in learning order | yes |
| GET | `/api/instructions` | `Instruction[]`, so the frontend can assemble prompts locally | yes |

The first three read Neo4j and answer `503 graph_unavailable` when it is down. The
frontend imports the topic files directly, so it does not depend on them.

### The student's record

Every route needs the access token. Every query is scoped by the user id **from the
token**, never from the body or the URL.

| Method | Path | Body → Returns |
|---|---|---|
| GET | `/api/state` | → `{ student, goalIds, claims, checkIns, experiences, opened, promptTakes, messages, moreMessages }`: everything the store holds, in one call. `messages` is the latest 50 per subject, all subjects in one list, oldest first; `moreMessages` is `{subjectId: boolean}`; `promptTakes` the latest 20. Read in one `REPEATABLE READ` snapshot (`readSnapshot` in `src/db/index.ts`), so a save landing mid-request can't give a half-updated answer |
| PUT | `/api/goals/:subjectId` | `{goalId}` → `{subjectId, goalId, since}`. Setting the same goal again keeps `since` |
| POST | `/api/claims` | `{claims: [{topicId, claim}]}` → `201 Claim[]` (the sort; later claims win per topic, so a repeated topic in one request keeps only its last claim) |
| POST | `/api/opened` | `{topicId}` → `204`. Big topics only; opening one twice is fine |
| POST | `/api/subject-requests` | `{text}` → `204` |
| POST | `/api/prompt-takes` | `{topicId, via}` → `201` |
| GET | `/api/check-ins` | → `CheckIn[]`, newest first |
| PATCH | `/api/check-ins/:id` | `{topicId?, outcome?, text?}` → `CheckIn` |
| DELETE | `/api/check-ins/:id` | → `204` |
| PATCH | `/api/experiences/:id` | `{text, kind?}` → `Experience`. The server rebuilds `line` with the rule-based `tidy()`; no model call, and a `line` sent by the client is ignored |
| DELETE | `/api/experiences/:id` | → `204` |

There is **no** "create check-in" endpoint. Updates are created only by saving a helper
proposal, so the topic panel's buttons also go through the helper (design.md §7).

**Why `/api/state` returns everything at once:** a student's whole record is small (a few
hundred rows), the map needs all of it to compute anything, and one request means one
loading state. Chat history is the only part that grows without limit, so it alone is
paged.

### The helper

| Method | Path | Body → Returns |
|---|---|---|
| GET | `/api/helper/:subjectId/messages?before=<messageId>&limit=50` | → `{ messages, more }`, older history |
| POST | `/api/helper/:subjectId/messages` | `{text, selected?}` **or** `{pick: {outcome, topicIds, label}}` (exactly one shape; both are strict) → `201 { messages: [studentMessage, helperReply] }`. 30 a minute per student |
| POST | `/api/helper/proposals/:id/save` | `{proposal}` (possibly edited) → `{ checkIns, experiences, message, followUp }`. An unchanged note keeps the line the helper made; an edited one is rebuilt with `tidy()`; a cleared one is dropped |
| POST | `/api/helper/proposals/:id/cancel` | → `{ message }` |
| POST | `/api/helper/proposals/:id/undo` | → `{ message }`. Deletes what that save created |

`selected` is the topic open in the side panel, so "finished it" can mean that one.

Rules the server enforces:

- **A message writes only chat rows** (and a proposal). Check-ins and experiences are
  created **only** by `save`, in one transaction.
- **A new proposal cancels the older open one** in the same subject, in the same
  transaction that inserts it. The unique index (§3) is the backstop.
- **Save, cancel and undo each work once**, through the guarded update in §3. A second
  attempt answers `409 proposal_not_open` and changes nothing. Save locks the row first
  (`SELECT … FOR UPDATE` in `proposals.repo.ts lockOpenProposal`), so two saves sent at
  the same moment make one set of check-ins (tested). Another student's proposal answers
  404, not 409.
- **Message times use `clock_timestamp()`**, not `NOW()`: inside one transaction `NOW()`
  never moves, so a reply would tie with its message. The same goes for a save's rows.
- **A tap's check-in text** is `"<label>: <topic>"` ("Stuck: FlatList"), from
  `checkInText()` in `shared/helper.ts`, which the demo store uses too.
- **An edited proposal is checked again on save:** every topic id must be a subtopic of
  that subject, and every text within its length limit. The client's copy is never
  trusted because it was shown by our own UI.
- When the API returns messages, it fills each confirm card with its proposal's current
  `proposal`, `state` and saved ids, so the frontend's `Card` shape stays as it is.

## 5. The helper

```
POST /api/helper/:subject/messages
  1. limits: 30 messages a minute and 100 typed messages a day per student (§8)
  2. save the student's message
  3. load the student's record → derive statuses, next, required, revealed  (shared/graph.ts)
  4. READ the message into a small typed object, the Reading:
        a tap ({pick})            → no reading needed; our code knows what was tapped
        typed text, AI available  → one GLM 5 call
        the call fails, times out, returns something invalid,
        or today's AI budget is spent → the rule-based reader (shared/parse.ts)
  5. shared/helper.ts turns the Reading into the reply: the one question (with `asks`),
     a confirm card, a prompt card, a choice of topics, or an answer about the map
  6. one transaction: cancel any older open proposal, insert the new one if there is a
     confirm card, insert the helper message
  7. return both messages
```

### The Reading: one seam for the model and the rules

```ts
// What a message says, whoever read it. shared/helper.ts decides everything from this.
interface Reading {
  path: "report" | "answer" | "next" | "skip" | "why_stuck" | "explain" | "app_help" | "other";
  topicIds: string[];                              // subtopics of this subject; may be empty
  bigId: string | null;                            // a big topic named instead ("finished lists")
  outcome: "got" | "partly" | "stuck" | null;
  experiences: { kind: "easy" | "hard" | "clicked"; text: string; line: string }[];
  help: HelpTopic | null;                          // app_help: which guide entry answers it
  said: string;                                    // the student's words, kept as the check-in text
}
```

**Built in M4.1.** `shared/helper.ts respond()` used to read and reply in one function.
It is now:

- `readByRules(text, ctx): Reading`: the keyword logic, unchanged.
- `readTap(outcome, topicIds): Reading`: a tap, which needs no reading.
- `replyFor(reading, ctx): Reply`: the reply logic, unchanged. It also copes with readings
  only a model would produce ("answer" when nothing was asked, "report" with no outcome),
  by answering them as a plain message.
- `respond(input, ctx)` stays, as `replyFor(readByRules(…))`, so the frontend's demo mode
  keeps working.

`help` and `said` were added to the planned shape: the guide entries are now keyed
(`HELP_TOPICS`), so the model can name one instead of the reply needing the raw text; and
`said` carries the words into the proposal. **No behaviour changed:** 52 replies were
pinned as a snapshot before the split (`backend/test/helper.test.ts`) and all still match.

Since M5.2 the backend calls `replyFor(readByModel(…) ?? readByRules(…))` for typed text,
and `replyFor(readTap(…))` for a tap. `chat_messages.read_by` records which reader read
each student message (`model`, `rules` or `tap`).

**Why this shape:** the model and the rules become interchangeable at exactly one place.
Whichever read the message, the same code decides the reply, so the helper cannot behave
differently "because the AI was down". It also makes the model easy to test: feed a
Reading, check the Reply.

### The model call

- **Model:** GLM 5, id `zai.glm-5`, through the Bedrock **Converse** API, in
  `ap-southeast-2` (Sydney, the owner's call on 14 Nov 2026: close to the hosting;
  `docs/aws.md` §5).
- **Output:** structured output with a JSON schema for the Reading:
  `outputConfig.textFormat = { type: "json_schema", structure: { jsonSchema: { name,
  schema } } }`, where `schema` is the schema **as a JSON string**. GLM 5's model card lists
  structured output on `bedrock-runtime`; it does not support tool calling there.
  Bedrock's rules for the schema (read on its structured-output page, 14 Nov 2026) shape
  `READING_SCHEMA` in `src/ai/reader.ts`:
  - every object needs `additionalProperties: false`;
  - no `minimum`, `maximum`, `minLength` or `maxLength`, so lengths are cut afterwards;
  - at most 12 optional properties, so **every field is required** and "nothing" is `null`
    or `[]`;
  - **the first call with a new schema compiles it, which can take up to about 90
    seconds**, and the compiled schema is cached for 24 hours.
- **What is sent:** fixed instructions (classify and extract; never explain a topic; what
  each path means), this subject's topic ids and names (about 100 lines), the pending
  question if there is one, the selected topic, and the student's message.
  **Never** a name, an email, or another student's data.
- **What comes back is checked** with zod, then against the map (`checkReading`): unknown
  topic ids are dropped, a big topic's id in `topicIds` becomes `bigId`, an invented guide
  key becomes `null`, texts are cut to 500 characters, an empty `line` is rebuilt with
  `tidy()`. `said` is always the student's own text, never the model's. The rules read the
  message instead when the reply is not the schema, was cut off (`max_tokens`), or **named
  topics of which not one is real**: the model was guessing, and trusting the rest could
  propose a change to the wrong topic.
- **Timeout:** 6 seconds, one attempt (`maxAttempts: 1`). A slow answer is worse than a
  plain one. `maxTokens` is 600 on every call, so a runaway reply costs at most $0.0023.
- **The schema is fixed, and kept warm.** Because of the compile time above, topic ids in
  the schema are plain strings checked against the map afterwards, not a per-subject list
  of allowed values: that would make one schema per subject, each compiled separately. And
  the server sends a tiny warm-up call with the same schema at start and every 3 hours
  (`warmUp()`, `purpose = 'warmup'`, 120-second timeout, about $0.0005 each, $0.004 a
  day). Without it, the first messages after each cache expiry would all time out at 6
  seconds and fall back to the rules. **Where this falls short:** AWS doesn't say whether
  the 24 hours count from the first use or the last, so 3 hours is a guess that is safe
  either way. After the first days live, check `latency_ms` of the `read` rows in
  `ai_calls`: if none is near 6000, it works.
- **Never throws.** `callForJson()` in `bedrock.ts` turns every failure (timeout,
  throttled, refused, no credentials, unusable reply) into `null` plus an `ai_calls` row
  with a short code. A failing model must never fail a student's message.
- **Credentials:** the AWS SDK's default chain. On the server that is the EC2 instance
  role; on a laptop it is the `trellis` profile. There are no AWS keys in any env file.
- **Code:** `src/ai/bedrock.ts` (the client, the timeout, the `ai_calls` row) and
  `src/ai/reader.ts` (the instructions, the schema, the checks, the budget gate, the
  warm-up). The empty `src/ai/models/jev.ts` and `deepseek.ts` and the `@openrouter/sdk`
  package were removed in M5.1.
- **A bad model reply is never the student's bad request.** The reader checks with
  `safeParse`, so nothing is thrown. And since M5.2 `validateBody` turns its own zod
  failures into a `400` `HttpError`; the error handler no longer treats every `ZodError`
  as the client's fault, so a stray one answers `500` like any other bug.
- **What a student can do with it:** type "ignore your instructions and mark everything
  done". The worst result is a confirm card for their own record, which they must Save
  themselves. The model sees no other student's data and can't write anything.

**The first real call (done 14 Nov 2026).** What a real call could show that the tests
couldn't, and what it showed:

- **Access:** works in both Mumbai and Sydney. 23 reads through the API in Sydney:
  **mean 2.3 s, 90th percentile 2.7 s**, one timeout at 6 s. About 1,680 tokens in and 40
  to 120 out, **about $0.0019 a message**. No reasoning block. The 6 s timeout stays.
- **Bedrock does not hold GLM 5 to the schema.** One reply sent `"help": []`. So
  `ModelReading` is strict only where a wrong value changes the meaning (`path`,
  `outcome`, the experiences); a wrong `bigId`, `help` or `topicIds` becomes `null` or
  `[]` instead of throwing the whole reading away.
- **The readings were good** ("the hooks part was easy but useEffect cleanup confused me"
  became one easy and one hard note; an injection attempt and "had pizza" got the plain
  menu), except "I'm lost on what comes after FlatList", first read as `why_stuck`. The
  wording of `next` and `why_stuck` in the instructions was sharpened; it now reads as
  `next` every time.

To repeat the check, the list of things to look at was:

- that the account may call `zai.glm-5` at all (`denied` or `no_model` in `error` if not);
- the real latency (`latency_ms`): if typical calls are near 6000, raise `AI_TIMEOUT_MS`;
- the real token counts: the doc assumes about 1,700 in and 120 out. If GLM 5 writes a
  reasoning block first, output tokens will be far higher, and `error = 'max_tokens'` may
  appear. Then turn reasoning off for this model in the request, or raise `MAX_TOKENS`;
- that the readings make sense: compare a few `read_by = 'model'` replies with what the
  rules would have said.

**The AI never decides** statuses, the next topic, skip or not, or why someone is stuck.
`shared/graph.ts` does. The model only fills in the Reading.

**Why one call and not two (changed 12 Nov 2026).** The earlier plan sent every message
to a routing model (Jev) and then some to a reading model (DeepSeek), both through
OpenRouter.

- Two calls in a row could take up to 16 seconds before the fallback.
- The saving was a fraction of a cent per message: a helper message costs about a quarter
  of a cent on GLM 5.
- It needed a second company and a second bill, outside the AWS credits.

**Why not "rules first, model only when unsure":** it sounds cheaper, but the rules cannot
tell when they are wrong ("I'm lost on what comes after FlatList" matches *stuck*). One
path for all typed text is consistent and easier to debug. The rules stay as the net.

### Cost limits

| Limit | Default (env) | What happens at the limit |
|---|---|---|
| Typed messages per student per day | 100 (`HELPER_DAILY_MESSAGES`) | `429 daily_limit`, with a message the frontend shows as it is; taps still work |
| AI spend for the whole site per day | $0.50 (`AI_DAILY_BUDGET_USD`) | The rules read every message until midnight UTC |

Both are counted from the database (`chat_messages`, `ai_calls`) since **midnight UTC**
(5:30 in the morning in India), so a restart does not reset them. UTC so they line up with
the AWS bill. Built in M5.2 (the budget, checked before every call in `modelAvailable()`)
and M5.3 (the message limit, in `helper.controller.ts`). Typed messages count whether the
model or the rules read them; taps never count. Neither check takes a lock, so two
messages at the same instant can overshoot by one; a lock would cost more than that.

At about $0.0019 a message (measured in Sydney), $0.50 is about 260 model-read messages a
day and at most $15 a month.

**Why this matters more than usual:** on the AWS free plan, spent credits close the
account (`docs/aws.md` §3). A cost limit here is what keeps the site up.

### After saving

`save` runs in one transaction: the guarded update on the proposal, insert the check-ins
and experiences with its id, then compute the follow-up with `shared/helper.ts afterSave()`
(stuck: the likely cause plus a prompt; partly: the same topic; done: next topic plus "that
opened X"). The follow-up is stored as a helper message and returned.

## 6. Prompts

Assembled, never generated (design.md §9): `shared/prompt.ts buildPrompt(topic, statuses,
checkIns, experiences, instructions)`. The frontend assembles prompts locally with the
same function, using `/api/instructions`.

- Part 1, **known topics**: template text from statuses.
- Part 2, **experiences** (rules changed 12 Nov 2026, built in MS.2: `experiencesFor()`):
  - this topic's own, newest first, at most 4;
  - plus at most 2 from its **direct prerequisites**, `clicked` first, then `easy`, newest
    first, never `hard`;
  - a `hard` note is included only while its topic's status is not `done`.
- Part 3, **instructions**: from `prompt_instructions`, by layer (status, then topic incl.
  its common mistakes, then base). The base layer always says not to remind the student of
  past mistakes, and (new, id `base-report-back`) asks the AI to end with two lines the
  student can paste back into Trellis.

`MAX_HARD_USES`, `Experience.uses` and `Prompt.experienceIds` are removed (MS.2), so the
same record always gives the same prompt. Taking a prompt records a `prompt_takes` row
instead (§3).

## 7. Derived logic (must match the frontend exactly)

All of it lives in `shared/graph.ts`; the rules are in design.md §6 and §8. In short:

- A subtopic's status is its latest check-in (`got` → done, `partly` → learning, `stuck` →
  stuck), else its own claim, else its big topic's claim, else new.
- A big topic's status: done/know when every core subtopic is done or known; stuck if any
  is stuck; learning if any is under way; else its claim.
- A goal needs its target big topics, everything they stand on, their core subtopics, and
  anything those need.
- Next: an in-progress ready subtopic first, else the first ready one on the route.
- Revealed: a big topic opens on a check-in inside it, when next is inside it, when it
  holds a stuck topic's likely cause, or when opened by hand.

**Changed on 12 Nov 2026, built in MS on 14 Nov** (tests: `backend/test/suspects.test.ts`,
`coming-back.test.ts`, `prompt.test.ts`, and the golden test). `Suspect` also carries
`rank`, `doubt` and `matched`, so the helper can say why ("you marked it done, but it was
hard going"; "what you said about being stuck sounds like it"). `revealed()` gained
`experiences` for the same reason the suspects did: the map must open the frame of the
same first suspect the Stuck button names.

- **Suspects** (design.md §8). Candidates are still the prerequisites up to two steps
  below the stuck topic. The ranking becomes:

  | Rank | Status of the prerequisite |
  |---|---|
  | 0 | new |
  | 1 | stuck |
  | 2 | shaky |
  | 3 | learning |
  | 4 | know (claimed) |
  | 5 | done with doubt: it has a `hard` experience, or a `stuck` or `partly` check-in before its `got` |
  | – | done cleanly: not a suspect |

  A **text match** lifts a candidate three ranks (not below 0), and makes a cleanly done
  topic a suspect at rank 3. The text is the latest stuck check-in on the stuck topic plus
  its `hard` experiences; it matches when it mentions the candidate's name or a keyword
  (`parse.ts mentions()`), or shares a phrase of three or more words with one of its
  `mistakes`. Ties: fewer steps first, then file order. The function gains two
  parameters: `suspectsFor(stuckId, statuses, checkIns, experiences)`.
- **`awaitingReport(promptTakes, checkIns, now)`**: the latest prompt take whose topic has
  no check-in after it, taken between 10 minutes and 14 days ago. This is the topic the
  helper asks about on return. `null` when there is none.
- **`unsortedAreas(goal, claims)`**: big topics the goal needs that have no claim. Shown
  after a goal change as an offer to sort just those.

**Golden test** (`backend/test/golden.test.ts`): with the sample student
(`shared/data/student.ts`) the React Native next topic is **State**, FlatList is stuck,
its first suspect is **State**, and **Redis has no goal**. It must still pass after the
suspect change, and gains cases for "done with doubt" and the text match.
`backend/test/data-checks.test.ts` fails if any `console.assert` in `shared/data/index.ts`
fails.

## 8. Cross-cutting

### Config

`backend/src/config/index.ts` is the only place that reads `process.env`. It runs once at
start and **throws on a missing or bad value**.

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV`, `PORT` | `production`, `8000` | |
| `PUBLIC_URL` | `https://trellis.niteshkumar.xyz` | Used for the Google redirect and reset links. Replaces `CLIENT_URL` |
| `DB_URL` | `postgresql://trellis:…@db:5432/trellisdb` | Required |
| `JWT_SECRET` | 32+ random characters | Required. `openssl rand -hex 32` |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_DAYS` | `15m`, `60` | |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Google sign-in is off when they are empty |
| `NEO4J_URL`, `NEO4J_USER`, `NEO4J_PASSWORD` | `bolt://neo4j:7687` | The site runs without Neo4j (§2) |
| `AI_PROVIDER` | `bedrock` or `off` | `off` in development and tests: the rules read everything, and no AWS is needed |
| `BEDROCK_REGION`, `READER_MODEL` | `ap-southeast-2`, `zai.glm-5` | |
| `READER_PRICE_IN_PER_M`, `READER_PRICE_OUT_PER_M` | `1.03`, `3.30` | Dollars per million tokens, for `cost_usd` (Sydney's prices; change them with the region) |
| `AI_TIMEOUT_MS`, `AI_DAILY_BUDGET_USD`, `HELPER_DAILY_MESSAGES` | `6000`, `0.50`, `100` | |

Removed: `OPENROUTER_API_KEY`, `ROUTER_MODEL`, `ROUTER_MIN_CONFIDENCE`, `CLIENT_URL`.

**Where secrets live:** in development, `backend/.env` (git-ignored). In production, AWS
Systems Manager Parameter Store; a small script writes them into the server's env file at
deploy (`docs/aws.md` §6). Secrets are never committed and never baked into an image.

### Security

- **helmet** for safe response headers. **CORS is off in production** (one origin, §2); in
  development the Next rewrite makes it unnecessary too.
- **Every query is parameterised** and scoped by the token's user id.
- **Input limits:** bodies up to 100 KB (larger answers `413`); a helper message up to
  2,000 characters; an experience up to 500; a name up to 60.
- **Rate limits** (`express-rate-limit`, in memory, which is correct for one server):

  | Routes | Limit | Keyed by |
  |---|---|---|
  | `/api/auth/login`, `/register`, `/reset-password` | 10 per 15 minutes, each route counted on its own | IP address |
  | `/api/auth/refresh` | 60 per 15 minutes | IP address |
  | `POST /api/helper/*/messages` | 30 per minute | user id |
  | everything else under `/api` | 300 per minute | user id, or IP when signed out |

  Behind Caddy the visitor's address arrives in a header, so `app.set("trust proxy", 1)`
  is required in production (set in `src/app.ts` when `NODE_ENV=production`). Without it
  every visitor looks like Caddy and shares one limit.
  The limits are off under Vitest (`config.rate_limits`), because tests sign up many
  users from one address; `test/rate-limit.test.ts` checks the limiter itself.
  Built so far: the auth rows and the helper row. **The general 300-a-minute limit is not
  built.** At the app level the user id is not known yet (requireAuth runs per route), so
  it would be keyed by IP address, and a class on one campus Wi-Fi shares one address
  (§12). The helper's own limits (30 a minute, 100 typed a day, the AI budget) cover the
  one route that costs money. Add it, keyed by a verified token or IP, if a route is
  abused.
- **Deleting an account** asks for the password again when the account has one.
- **No admin routes.** There is no role check to get wrong because there is nothing only
  an admin can call. The admin works through scripts on the server.

### Logging and health

- **`pino`** writes one JSON line per request to stdout: time, request id, method, path,
  status, duration, user id. Docker keeps and rotates the files. **Never logged:** message
  text, passwords, tokens, cookies, email addresses.
- Every response carries `X-Request-Id`, and the same id is on its log line and on any
  error logged for it. So "it failed at 21:40" can be traced to one request.
- `GET /api/health` → `{ postgres: "ok", neo4j: "ok" | "down" | "drift" }`. It answers `200`
  when Postgres is reachable and `503` when it is not. Neo4j never changes the status.
- **Why not Sentry or a log service now:** one server and a few dozen users. `docker logs`
  with a request id is enough, and costs nothing. Add CloudWatch or Sentry when reading
  logs by hand stops working.

### Tests

Vitest plus supertest, in two commands.

- `npm test` needs no database and takes seconds: pure functions, and routes with the repo
  replaced by a fake (`vi.mock`).
- `npm run test:integration` runs `test/integration/` against the real dev databases, and
  fails if they are down rather than skipping.
- Bedrock is always mocked in tests (`vi.mock("@aws-sdk/client-bedrock-runtime")`). The
  reader's tests (`test/reader.test.ts`) feed fixed model outputs (good, malformed, wrong
  shape, made-up topic ids, cut off, a timeout) and check the fallback; `test/bedrock.test.ts`
  checks the request we send and the `ai_calls` row each outcome leaves.

### Code style

TypeScript `strict`, ESM, small files: one router, one controller, one repo file per area
(`src/routes/claims.routes.ts`, `src/controllers/claims.controller.ts`,
`src/repos/claims.repo.ts`). The backend drops `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`, because `shared/` fails them and must type-check the same
way in both apps. Comments follow §0.

```
backend/src/
  index.ts, app.ts        start-up; middleware and routes in order
  config/                 the one place that reads process.env
  routes/                 one file per area: which URL goes to which controller
  controllers/            read the request, call repos and shared/, send the reply
  repos/                  every SQL and Cypher statement lives here, nowhere else
  middlewares/            auth, validation, errors, rate limits
  ai/                     bedrock.ts (the client), reader.ts (message → Reading)
  db/                     pools, migrations, seeds
  utils/                  small helpers (tokens, HttpError, health)
```

### Deploy and backups

In `docs/aws.md` §6 and §7. In short: images are built for arm64 and pushed to Amazon ECR;
the server pulls them; migrations and the graph seed run as one-shot containers before the
API starts; Postgres is dumped to S3 every night and the dumps expire after 14 days.

## 9. Connecting the frontend

**Built in M6 (14 Nov 2026).** How it works now is in `docs/frontend.md` §10 and §11; the
plan it followed is kept below. Two places differ from the plan: the store's actions are
called as `act.*` methods instead of being dispatched, and the confirm card is addressed by
`proposalId` (the screens still pass a message id and card index; `useHelper` looks up the
id).

`frontend/lib/store.tsx`, `components/map/useHelper.ts` and `app/(auth)/AuthForm.tsx` are
the places to change. Before M6 the store was a `useReducer` persisted to localStorage
(`trellis-demo-v4`). The plan:

- A small API client holds the access token in memory, sends it on every call, and on a
  `401` calls `/api/auth/refresh` once and retries.
- Hydrate from `GET /api/state` instead of localStorage.
- Each action becomes its request:

  | Store action | Request |
  |---|---|
  | `goal` | `PUT /api/goals/:subjectId` |
  | `claims` | `POST /api/claims` |
  | `open` | `POST /api/opened` |
  | `edit`, `remove` | `PATCH`, `DELETE /api/check-ins/:id` |
  | `editExperience`, `removeExperience` | `PATCH`, `DELETE /api/experiences/:id` |
  | `used` (renamed `took`) | `POST /api/prompt-takes` |
  | `say` (through `useHelper`) | `POST /api/helper/:subjectId/messages` |
  | `save`, `cancel`, `undo` | `POST /api/helper/proposals/:id/…` |
  | `erase` | `DELETE /api/me` |

- A `409 proposal_not_open` on save means "this was already decided": reload that message
  rather than show an error.
- Keep a **demo mode** on the sample data for the landing page and for signed-out
  visitors. It keeps using `shared/helper.ts respond()` locally.
- The product changes the frontend needs are listed in `docs/frontend.md` §13.

## 10. The build plan

Each line is one task, built in order, each with its tests. The dates are the plan for the
21 Nov deadline. **If a day slips, cut M5 first** (the helper still works on the rules),
**then M6.3** (Google sign-in).

**M0: Foundations** ✅ (merged into `main`, 7 Nov 2026)
**M1: Content (Neo4j)** ✅ (merged into `main`, 12 Nov 2026)

**M2: Accounts and the student's record** ✅ (merged into `main`, 13 Nov 2026)
- M2.1 Migration 0007. Auth moves to `/api/auth/*`: the error shape, zod bodies, one
  `invalid_credentials` answer, hashed refresh tokens (60 days, extended on use), the
  `{sub}` token, auth rate limits, config that refuses to start without secrets.
  `GET` and `PATCH /api/me`.
- M2.2 `npm run reset-link` and `POST /api/auth/reset-password`.
- M2.3 Migration 0008 plus `PUT /api/goals/:subjectId`.
- M2.4 Migration 0009 plus `POST /api/claims`.
- M2.5 Migrations 0010 and 0011 plus `POST /api/opened` and `POST /api/subject-requests`.
- M2.6 The API starts without Neo4j; the graph routes answer 503; `/api/health` reports both;
  topic ids are checked against `shared/data`.

**M3: Check-ins, experiences, prompts taken** ✅ (merged into `main`, 13 Nov 2026)
- M3.1 Migrations 0012, 0014 and 0015 plus `GET/PATCH/DELETE /api/check-ins`.
- M3.2 Migration 0016 plus `PATCH/DELETE /api/experiences`.
- M3.3 Migration 0017 plus `POST /api/prompt-takes`.
- M3.4 `GET /api/state`, `GET /api/export`, `DELETE /api/me`.

**M4: The helper on rules** ✅ (merged into `main` as one squashed commit, 14 Nov 2026)
- M4.1 Split `shared/helper.ts` into `readByRules` and `replyFor` (§5). No behaviour
  change; the frontend checks stay clean.
- M4.2 `GET/POST /api/helper/:subject/messages` on the rules, with paging.
- M4.3 Proposals: save, cancel, undo (the guarded update; one transaction).

**M6: Connect the frontend** ✅ (merged into `main` as one squashed commit, 14 Nov 2026)
- M6.1 The API client, the store on the API, loading and error states, demo mode, the
  rewrite keeping `/api`.
- M6.2 Real sign-up and login, the reset page, and the wording changes in frontend.md §13.
- M6.3 Google sign-in: the two routes and the button.
- M6.4 Prompt takes and the "how did it go?" line; subject requests; the short sort after
  a goal change. (Needs MS.3, which was built just before it on `backend/m6`.)

**MS: Rule changes in `shared/`** ✅ (merged into `main` as one squashed commit, 14 Nov 2026; MS.3 went in with M6)
- MS.1 The new suspect ranking (§7), with golden-test cases.
- MS.2 The new prompt experience rules, `base-report-back`, and removing `uses`.
- MS.3 `awaitingReport` and `unsortedAreas`.

**M5: The helper with GLM 5** ✅ (merged into `main` as one squashed commit, 14 Nov 2026; tried against the real Bedrock)
- M5.1 Migration 0018, `src/ai/bedrock.ts`: the Converse call, the timeout, the `ai_calls`
  row with its cost. Remove the OpenRouter package and files.
- M5.2 `src/ai/reader.ts`: instructions, schema, validation, the fallback to the rules.
  `validateBody` wraps its own errors, so a bad model reply is never reported as the
  student's bad request.
- M5.3 The daily message limit and the daily AI budget; tests with Bedrock mocked.

**M7: Deploy** (15 Nov; the steps are in `docs/aws.md` §9)
- M7.1 The production compose file: Caddy, Postgres, Neo4j with memory caps, the API,
  Next, one-shot `migrate` and `seed-graph` services. Remove pgAdmin. arm64 images in ECR.
- M7.2 The AWS resources: server, role, DNS, backup bucket, budgets.
- M7.3 The nightly backup, one tested restore, and the smoke test.

**18 to 21 Nov:** friends use it. Fix what they hit.

## 11. Progress

Update this table at the start of each planning session from `git log` and merged PRs.

| Task | Status | Merged in |
|---|---|---|
| M0.1 Move the domain code into `shared/` | done | `main`, 7 Nov 2026 |
| M0.2 tsup, Vitest, zod, error handler, Docker from the root | done | `main`, 7 Nov 2026 |
| M0.3 Golden test + data checks test | done | `main`, 7 Nov 2026 |
| M0.4 Migrations 0005–0006, empty seed, Neo4j + AI config | done | `main`, 7 Nov 2026 |
| M1.1 Neo4j in compose, driver, config, boot check | done | `main`, 12 Nov 2026 |
| M1.2 `npm run seed:graph` | done | `main`, 12 Nov 2026 |
| M1.3 Graph repo, snapshot, content routes | done | `main`, 12 Nov 2026 |
| M1.4 Migration 0013, instructions seed, `GET /api/instructions` | done | `main`, 12 Nov 2026 |
| M1.5 `GET /api/topics/:id/path-to/:targetId` | done | `main`, 12 Nov 2026 |
| Design review; this doc, design.md v7, aws.md | done | `main`, 12 Nov 2026 |
| M2.1 Migration 0007, `/api/auth/*`, hashed refresh tokens, config, `/api/me` | done | `main`, 13 Nov 2026 |
| M2.2 `npm run reset-link`, `POST /api/auth/reset-password` | done | `main`, 13 Nov 2026 |
| M2.3 Migration 0008, `PUT /api/goals/:subjectId` | done | `main`, 13 Nov 2026 |
| M2.4 Migration 0009, `POST /api/claims` | done | `main`, 13 Nov 2026 |
| M2.5 Migrations 0010, 0011, `POST /api/opened`, `POST /api/subject-requests` | done | `main`, 13 Nov 2026 |
| M2.6 The API runs without Neo4j; `/api/health` | done | `main`, 13 Nov 2026 |
| M3.1 Migrations 0012, 0014, 0015, `GET/PATCH/DELETE /api/check-ins` | done | `main`, 13 Nov 2026 |
| M3.2 Migration 0016, `PATCH/DELETE /api/experiences` | done | `main`, 13 Nov 2026 |
| M3.3 Migration 0017, `POST /api/prompt-takes` | done | `main`, 13 Nov 2026 |
| M3.4 `GET /api/state`, `GET /api/export`, `DELETE /api/me` | done | `main`, 13 Nov 2026 |
| M4.1 Split `respond()` into `readByRules` and `replyFor` | done | `main`, 14 Nov 2026 (squashed) |
| M4.2 `GET/POST /api/helper/:subjectId/messages` on the rules | done | `main`, 14 Nov 2026 (squashed) |
| M4.3 Save, cancel, undo | done | `main`, 14 Nov 2026 (squashed) |
| M6.1 The API client, the store on the API, demo mode, the rewrite | done | `main`, 14 Nov 2026 (squashed) |
| M6.2 Real sign-up and login, the reset page, the wording changes | done | `main`, 14 Nov 2026 (squashed) |
| M6.3 Google sign-in | done; the OAuth client exists and it is on in development (14 Nov 2026) | `main`, 14 Nov 2026 (squashed) |
| M6.4 "How did it go?", subject requests, the short sort | done | `main`, 14 Nov 2026 (squashed) |
| MS.3 `awaitingReport`, `unsortedAreas` | done | `main`, 14 Nov 2026 (squashed) |
| MS.1 The new stuck ranking | done | `main`, 14 Nov 2026 (squashed) |
| MS.2 The new prompt note rules, `base-report-back`, no more `uses` | done | `main`, 14 Nov 2026 (squashed) |
| M5.1 Migration 0018, `src/ai/bedrock.ts`, OpenRouter removed | done | `main`, 14 Nov 2026 (squashed) |
| M5.2 `src/ai/reader.ts`, the fallback, the warm-up, `validateBody` wraps its errors | done | `main`, 14 Nov 2026 (squashed) |
| M5.3 The daily message limit (the budget is in M5.2) | done | `main`, 14 Nov 2026 (squashed) |
| M5 against the real Bedrock (§5 "The first real call"), Bedrock moved to Sydney | done | `main`, 14 Nov 2026 (squashed) |
| M7 | not started | — |

**Expected test counts after M5:** 246 passed in `npm test`, 86 in
`npm run test:integration`, none skipped (checked 14 Nov 2026). After MS
they were 211 and 81. After M6 they were 193 and 81; after M4, 178 and 77. M6 was also checked by
hand in a browser against the real API (sign-up to delete, a reset link, the helper's
question, Save, reload); the frontend has no automated tests of its own yet.

**Turning on Google sign-in (the owner, once):** in Google Cloud Console create an OAuth
client ("Web application") with the redirect URIs
`http://localhost:3000/api/auth/google/callback` and
`https://trellis.niteshkumar.xyz/api/auth/google/callback`. Put its id and secret in
`backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and set
`NEXT_PUBLIC_GOOGLE_SIGNIN=on` in `frontend/.env`. Until then the routes answer 404 and
the button is hidden. Not tested against Google itself yet: the tests fake it.

**How M3 is tested without the helper:** nothing can create a check-in or an experience
through the API until M4.3 (only saving a proposal does). The integration tests write
those rows directly, the way a save would, with `insertSavedCheckIn` and
`insertSavedExperience` in `test/integration/helpers.ts`. M4.3 replaces them with the
real save.

**Messages are read already, written in M4.** `src/repos/chat.repo.ts listMessages()`
reads a thread and fills each stored `{type: "confirm", proposalId}` card from its
proposal (payload, state, saved ids). `/api/state` uses it now; M4.2's paging route
reuses it.

**Before running M2 locally:** `backend/.env` needs a `JWT_SECRET` of 32 characters or
more (`openssl rand -hex 32`); the server refuses `admin123`. Then `npm run db:migrate:dev`
to run 0007 to 0011. Migration 0007 deletes every stored refresh token (they were plain
text and can't be converted), so everyone signs in once more.

**Known gaps in the code today, each fixed by the task named:**
- `users.role` is still a column but nothing reads it (the token no longer carries it,
  and there are no admin routes). Harmless; drop it in a later migration if it stays
  unused.
- `docker-compose.yml` (production) has pgAdmin, no Neo4j and no Caddy. → M7.1
- `frontend/next.config.ts` strips `/api` when forwarding. → M6.1

## 12. Open questions

Nothing blocks M7. To settle when reached:

- **Rate limits and a shared campus address.** The auth limits are per IP address. If a
  class signs up together on one campus Wi-Fi, they may all share one public address,
  and the 11th sign-up in 15 minutes gets `429`. Watch for it in the 18 Nov testing. The
  usual fix is to key login by IP **and** email, with a looser cap per IP alone.

- **Where the server runs.** Bedrock is in Sydney "close to the hosting" (owner, 14 Nov
  2026), but `docs/aws.md` plans the server in Mumbai. Settle before M7.
- ~~Bedrock on the free plan; does GLM 5 reason first?~~ Settled 14 Nov 2026 by real
  calls: it works, and it doesn't (§5).
- **Does the warm-up keep the schema cached?** Watch `latency_ms` in `ai_calls` for the
  first days (§5).
- ~~The exact structured-output request for GLM 5.~~ Settled 14 Nov 2026 from the Bedrock
  page; it is in §5.
- **Memory on the 2 GB server.** If Neo4j does not fit beside everything else, it moves to
  development only (`docs/aws.md` §4).
