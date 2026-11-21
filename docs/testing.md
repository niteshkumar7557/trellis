# Testing the Trellis backend

How the tests are built, what each kind proves, how to write a new one and how to debug a
failing one. The short version is in `docs/backend-design.md` §8 "Tests"; this is the full
one. Checked on **21 Nov 2026**, after the graph database was removed: `npm test` ran
**323 tests in 33 files** (about 3 s) and `npm run test:integration` ran **90 tests in 13
files** (about 20 s), all passing.

**Contents:** 1 The two suites · 2 How the configs set the stage · 3 Every test file ·
4 Unit-test techniques · 5 Golden tests, snapshots and data checks · 6 Integration tests ·
7 Concurrency tests · 8 What is covered, by area · 9 Rules every test follows · 10 Writing
a new test · 11 Debugging a failing test · 12 Gaps

---

## 1. The two suites

```bash
cd backend
npm test                    # unit: no database, no network
npm run test:integration    # real Postgres; needs the dev database:
                            #   docker compose -f docker-compose.dev.yml up -d   (repo root)
                            #   npm run db-init                                  (once)
npm run typecheck           # tsc --noEmit
npm run test:watch          # unit tests again on every save
npx vitest run test/tokens.test.ts          # one file
npx vitest run -t "alg: none"               # tests whose name contains this
npx vitest run test/helper.test.ts -u       # re-record that file's snapshots (§5)
```

| | `npm test` | `npm run test:integration` |
|---|---|---|
| Config | `backend/vitest.config.ts` | `backend/vitest.integration.config.ts` |
| Files | `test/**/*.test.ts` except `test/integration/` | `test/integration/**/*.test.ts` |
| Needs | nothing | dev Postgres on :5050, migrated |
| A database is down | not affected | **fails**, on purpose: skipping would look like a pass |
| Files run | in parallel | one at a time (they share one database) |
| Real Bedrock | never | never |
| Rate limits | off | off |

Tests live only in `backend/`. **The frontend has no test runner**, so the frontend's pure
map code (`frontend/components/map/layout.ts`, `focus.ts`) is tested from here
(`test/map-layout.test.ts`), and so is everything in `shared/`, which both apps run.

### CI (since 21 Nov 2026)

GitHub Actions runs `.github/workflows/ci.yml` on every push and pull request, as three
jobs side by side on GitHub's Linux machines:

| Job | Runs |
|---|---|
| Backend | `npm ci` in `frontend/` and `backend/`, then typecheck, `npm test`, `npm run build` |
| Backend integration | a `postgres:18` service container, `npm run db-init`, `npm run test:integration` |
| Frontend | `tsc --noEmit`, `eslint .`, `npm run lint:shared`, `npm run build` |

- **The backend job installs the frontend's packages too**, because `test/map-layout.test.ts`
  imports the map code in `frontend/components/map/`, which uses `@dagrejs/dagre`.
- **There is no `backend/.env` in CI.** The job's `env:` gives `DB_URL`, `JWT_SECRET` and
  `AI_PROVIDER=off`; the integration job's `JWT_SECRET` must match
  `vitest.integration.config.ts`, which sets it anyway.
- **A newer push cancels the older run** on the same branch (`concurrency`).
- **Release gate:** `deploy/release.sh` stops unless this workflow passed for the exact
  commit being released (`docs/aws.md` §6). Push, wait for green (`gh run watch`), release.
- **Where to look when it's red:** the Actions tab on GitHub, or `gh run view --log-failed`.
  A frontend build that fails while downloading IBM Plex Sans from Google Fonts is a network
  hiccup: re-run the job (`gh run rerun --failed`).
- **Cost:** the Free plan includes 2,000 minutes a month for a private repo; a run is a few
  minutes per job. Check the usage page in GitHub's billing settings now and then.

## 2. How the configs set the stage

`backend/vitest.config.ts` sets three things before any file is imported:

- the **`@shared` alias** (Vitest doesn't read `tsconfig.json` paths);
- the **environment**: `JWT_SECRET` (must match `TEST_JWT_SECRET` in `test/auth-token.ts`),
  a `DB_URL` pointing at port 1 (nothing listens there, so a unit test that touches the
  database by mistake fails fast instead of using someone's data), and `AI_PROVIDER=off`
  (no test can reach Bedrock, whatever your `backend/.env` says; dotenv never overwrites a
  variable that's already set);
- `NODE_ENV=test` (Vitest's default), which makes `config.rate_limits` false. Tests sign
  up many users from one address, and the limits would fail them for unrelated reasons.

`vitest.integration.config.ts` takes the real `DB_URL` from `backend/.env`, sets the same
`JWT_SECRET` and `AI_PROVIDER=off`, and sets `fileParallelism: false`.

`test/auth-token.ts` exports `bearerToken(userId)`: a real signed access token for tests of
routes behind `requireAuth`.

## 3. Every test file

**Unit (33 files in `backend/test/`)**, by technique (§4):

| Technique | Files |
|---|---|
| A. Pure functions | `limits`, `suspects`, `prompt`, `suggestions`, `coming-back`, `difficulty`, `big-links`, `map-layout`, `paths`, `graph-repo`, `tokens` (first half) |
| B. A route with its repos faked | `auth.routes`, `google.routes`, `me.routes`, `helper.routes`, `check-ins.routes`, `experiences.routes`, `prompt-takes.routes`, `record.routes`, `instructions.routes`, `usage.routes` |
| C. A tiny app built for the test | `errors`, `health`, `rate-limit`, `trust-proxy`, `tokens` (the `requireAuth` half) |
| A route on the real data, nothing faked | `subjects.routes`, `topics.routes` (the content is in memory, so there is nothing to fake) |
| D. Config and environment | `config` |
| E. The AWS SDK faked | `bedrock`, `reader` |
| Golden and snapshot (§5) | `golden`, `helper` (+ `__snapshots__/helper.test.ts.snap`, 52 snapshots) |
| Data checks (§5) | `data-checks` |

**Integration (13 files in `backend/test/integration/`)**:

| Area | Files |
|---|---|
| Accounts | `auth`, `google`, `reset-link` |
| The student's record | `record`, `state`, `check-ins`, `experiences`, `prompt-takes` |
| The helper | `helper`, `proposals` |
| AI money | `ai-calls`, `ai-limits` |
| Content | `instructions` (the prompt instructions live in Postgres) |
| Not tests | `helpers.ts` (shared set-up) |

## 4. Unit-test techniques

### A. Pure functions

Call and check, with a focus on the edges (zero, exactly at a limit, one past it), often
many cases in one loop. Example, `test/tokens.test.ts`:

```ts
for (const token of [expired, forged, old, notANumber, "not-a-jwt"]) {
  expect(verifyAccessToken(token)).toBeNull();
}
```

The codebase keeps logic testable by putting it in pure functions: `src/ai/limits.ts` has no
database in it so `limits.test.ts` can test every money rule directly;
`makeHealthHandler(checkPostgres)` takes its check as an argument; the graph repo reads
`shared/data` in memory, so `paths.test.ts` and `graph-repo.test.ts` test it on the real
topic files with no fake at all.

### B. A route with its repos faked

Build a small Express app with only the router under test, replace its repos with
`vi.mock`, and drive it with supertest. From `test/auth.routes.test.ts`:

```ts
vi.mock("../src/repos/users.repo.js", () => ({
  createPasswordUser: vi.fn(), findLoginByEmail: vi.fn(), getStudent: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use(notFound);
app.use(errorHandler);

beforeEach(() => vi.resetAllMocks());
```

then program a fake (`vi.mocked(findLoginByEmail).mockResolvedValue(row)`), send a request,
and assert on the status, the body, the headers (cookie attributes:
`toMatch(/SameSite=Strict/)`) and what the repo received, when that *is* the promise
("only the hash of the token is stored", "the id came from the token":
`expect(getStudent).toHaveBeenCalledWith(9)` after `bearerToken(9)`).

Notes:

- `vi.mock` is **hoisted** above the imports, so the code under test gets the fake.
- Reset fakes in `beforeEach` (`vi.resetAllMocks()` or `vi.clearAllMocks()`), or one test's
  set-up leaks into the next.
- bcrypt at cost 4 in tests (`bcrypt.hash(pw, 4)`) is fast, and `compare()` reads the cost
  from the hash.
- `helper.routes.test.ts` also fakes `src/db/index.js` so `inTransaction(work)` runs
  `work({})`, and fakes the model reader (`readByModel` → `null` = "the model didn't read
  it").

### C. A tiny app built for the test

For middleware, build a throwaway app with one route per behaviour. `test/errors.test.ts`
has routes that throw an `HttpError`, a plain `Error`, an async error, a zod error outside
`validateBody`, and so on, each proving one rule of the error shape. A test that triggers
an error on purpose silences the log and can still assert it was logged:

```ts
const log = vi.spyOn(console, "error").mockImplementation(() => {});
// … expect(JSON.stringify(res.body)).not.toContain("secret"); expect(log).toHaveBeenCalled();
log.mockRestore();
```

`rate-limit.test.ts` builds `makeLimiter(2, 60_000, true)` (on, though limiters are off
under tests); `trust-proxy.test.ts` sends crafted `X-Forwarded-For` headers to apps with
`trust proxy` 1 and 2.

### D. Config and environment

`src/config/index.ts` runs once, when first imported. `test/config.test.ts` stubs the
environment, empties the module cache, and imports a fresh copy:

```ts
beforeEach(() => { vi.resetModules(); for (const n of OPTIONAL_VARS) vi.stubEnv(n, ""); });
afterEach(() => vi.unstubAllEnvs());
const loadConfig = async () => (await import("../src/config/index.js")).default;

vi.stubEnv("JWT_SECRET", "admin123");
await expect(loadConfig()).rejects.toThrow(/at least 32 characters/);
```

Stubbing every optional variable to `""` makes the tests ignore your own `backend/.env`.

### E. The AWS SDK faked

**Tests never call the real Bedrock.** `bedrock.test.ts` and `reader.test.ts` replace the
SDK module:

```ts
const { send } = vi.hoisted(() => ({ send: vi.fn() }));   // must exist before vi.mock runs
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: class { send = send; },
  ConverseCommand: class { constructor(public input: unknown) {} },   // keep the request
}));
```

Each test programs `send` (a good reply, a reasoning block first, malformed JSON, a
`max_tokens` cut-off, a timeout, `ThrottlingException`, made-up topic ids, GLM 5's real
`"help": []` slip) and checks the result, the request sent
(`send.mock.calls[0][0].input`), and what the call was reserved and settled as in
`ai_calls` (the repo is faked too). To turn the AI on for one file only, set
`process.env.AI_PROVIDER = "bedrock"` inside `vi.hoisted`, before the config loads.

## 5. Golden tests, snapshots and data checks

- **`test/golden.test.ts`** pins what the sample student (`shared/data/student.ts`) is
  told: next topic `rn-jsx-lists`, FlatList stuck, first suspect `rn-state-updates`, Redis
  all new (129 topics), and the start of FlatList's prompt. Both apps run the same
  `shared/` code, so this covers both. It compares ids, not names. **If it fails, a change
  altered what students are told: find out why before "fixing" the test.**
- **`test/helper.test.ts`** snapshots 52 replies of the rule-based helper across many
  messages and contexts. It was recorded before `respond()` was split into `readByRules()`
  and `replyFor()`, which is how the split was proven safe. When it fails: read the diff;
  if the change is intended, run `npx vitest run test/helper.test.ts -u` and commit the
  `.snap` with the code so a reviewer sees both.
- **`test/data-checks.test.ts`**: `shared/data/index.ts` checks the content against itself
  about 1,500 times with `console.assert`, which only *prints*. The test spies on
  `console.assert`, imports the data **inside** the test, fails on any false call, and
  also asserts that the checks ran. It's what catches mistakes when a subject is edited.

## 6. Integration tests

They run the real app (`src/app.ts`) against the real dev Postgres, with Bedrock faked.

- **Users per file, by email domain.** `registerStudent(domain)` in
  `test/integration/helpers.ts` signs a student up through the real API and returns their
  id, an `Authorization` header and the refresh cookie; `deleteUsers(domain)` removes them
  (and, by cascade, their record). Each file has its own domain (`@it.trellis.test`,
  `@it-google.trellis.test`, …), cleans up in `beforeAll` (after a crashed run) and
  `afterAll`, and calls `pool.end()` at the end so the process can exit.
- **`ai_calls` rows survive account deletion** (`ON DELETE SET NULL`), so `ai-calls.test.ts`
  marks its rows with a model name nothing else uses and deletes by it after **every** test,
  and `ai-limits.test.ts` remembers the ids of the rows it made.
- **Writing rows directly** when the real path isn't the point: `insertSavedCheckIn()` and
  `insertSavedExperience()` write a message, a saved proposal and the row, so the record
  tests don't depend on the helper's wording.
- **Looking inside the tables** to prove storage promises: the stored hash is
  `$2b$12$…`, the stored token is the SHA-256 of the cookie and not the cookie, the reset
  link stores only its hash.
- **Moving time instead of waiting:** `UPDATE password_resets SET expires_at = NOW() -
  INTERVAL '1 second'`; and comparisons done by the database's own clock
  (`expires_at > NOW() + INTERVAL '30 days'`), never JavaScript's.
- **Order inside a file** is used only where the file says so: `integration/auth.test.ts`
  is one session, register → me → rename → login → refresh → expired → logout.
- **Shared database:** the integration tests use your **dev** database, beside your own
  data. That's why everything is keyed by domain, and why the AI tests set the site budget
  very high (your real calls may already be in `ai_calls` today).

## 7. Concurrency tests

The most important promises are about two things at once. Start requests together with
`Promise.all` and assert on **counts**, never on which one won:

- `integration/ai-calls.test.ts`: 20 reservations at the same instant against $0.06 →
  exactly 14 pass, 6 are blocked. Without the advisory lock in `reserveAiCall` all 20 pass.
- `integration/proposals.test.ts`: two Saves of one proposal at once → statuses `[200, 409]`
  and one set of check-ins.
- `integration/ai-limits.test.ts`: a burst of messages with room for one → one model call.

Only a real database can test real locking; a fake would let everything through.

## 8. What is covered, by area

| Area | Unit | Integration |
|---|---|---|
| Tokens, `requireAuth` | `tokens` | |
| Sign-up, login, refresh, logout, reset | `auth.routes` | `auth`, `reset-link` |
| Google | `google.routes` (Google faked) | `google` (the find/link/create rule) |
| Account | `me.routes` | `auth` |
| Errors, validation, health, limits, proxies, config | `errors`, `health`, `rate-limit`, `trust-proxy`, `config` | |
| The record (state, export, goals, claims, check-ins, notes, prompt takes) | `record.routes`, `check-ins.routes`, `experiences.routes`, `prompt-takes.routes` | `record`, `state`, `check-ins`, `experiences`, `prompt-takes` |
| The helper | `helper` (snapshot), `helper.routes`, `suggestions`, `coming-back` | `helper`, `proposals` |
| The AI and its money | `reader`, `bedrock`, `limits`, `usage.routes` | `ai-calls`, `ai-limits` |
| Derived logic and prompts | `golden`, `suspects`, `prompt`, `difficulty`, `big-links` | |
| Content | `subjects.routes`, `topics.routes`, `instructions.routes`, `graph-repo`, `paths`, `data-checks` | `instructions` |
| The map's drawing (frontend code) | `map-layout` | |

## 9. Rules every test follows

- Never the real Bedrock, the real Google, or any network.
- A test file starts with a comment saying what it checks and what it fakes.
- Test names are sentences stating the promise
  ("gives the SAME answer for a wrong password, an unknown email and a Google-only account").
- Fakes are reset in `beforeEach`; integration data is keyed by domain and cleaned up.
- Integration tests fail, never skip, when a database is down.
- Every change ships with its tests (`CLAUDE.md`).

## 10. Writing a new test

1. Write the promise as one sentence; that's the `it(...)` name.
2. Pick the cheapest test that can fail when it breaks: pure logic → A; status codes,
   bodies, cookies, what reaches the repo → B; middleware → C; SQL, constraints,
   transactions, cascades, races → integration (§6, §7). Most features get a route test
   **and** an integration test.
3. Put it beside its siblings (`test/<area>.routes.test.ts`, `test/<module>.test.ts`,
   `test/integration/<area>.test.ts`) and copy their set-up.
4. Cover the edges: empty, at a limit, one past it, someone else's id (404), no token (401),
   a bad body (400 with `details`).
5. **See it fail once** (break the code, or write the test first). A test you've never seen
   fail may check nothing.
6. Run `npm run typecheck`, `npm test`, and `npm run test:integration` if you touched SQL.

A template for a protected route:

```ts
// The HTTP layer of /api/notes, with its repo replaced by a fake.
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../src/middlewares/error.middleware.js";
import { listNotes } from "../src/repos/notes.repo.js";
import notesRoutes from "../src/routes/notes.routes.js";
import { bearerToken } from "./auth-token.js";

vi.mock("../src/repos/notes.repo.js", () => ({ listNotes: vi.fn() }));

const app = express();
app.use(express.json());
app.use("/api/notes", notesRoutes);
app.use(notFound);
app.use(errorHandler);

beforeEach(() => vi.resetAllMocks());

describe("GET /api/notes", () => {
  it("needs a token", async () => {
    expect((await request(app).get("/api/notes")).status).toBe(401);
  });

  it("lists the notes of the TOKEN's user, never another id", async () => {
    vi.mocked(listNotes).mockResolvedValue([]);
    const res = await request(app).get("/api/notes").set("Authorization", bearerToken(9));
    expect(res.status).toBe(200);
    expect(listNotes).toHaveBeenCalledWith(9);
  });
});
```

An integration test starts from `registerStudent(DOMAIN)` and ends with
`deleteUsers(DOMAIN)` and `pool.end()`.

## 11. Debugging a failing test

1. Run only it: `npx vitest run test/file.test.ts -t "part of the name"`.
2. Read the diff Vitest prints; for `toHaveBeenCalledWith` it lists every real call.
3. A 500 in a route test: the error handler logged the real error. If the test silences
   `console.error`, remove the `mockImplementation` for a moment to see it.
4. Passes alone, fails with others: shared state (a fake not reset, a module-level
   variable, rows left by another test).
5. `ECONNREFUSED` in integration: the containers aren't up (`docker ps`), or `DB_URL` in
   `backend/.env` isn't on port **5050**.
6. A test that hardcodes the list of subjects breaks when a subject is added. Build such
   expectations from `subjects` in `@shared/data` (`integration/state.test.ts` does, since
   it broke this way when MongoDB arrived).
7. Breakpoints: run `npx vitest run test/file.test.ts` in a VS Code "JavaScript Debug
   Terminal".

## 12. Gaps

- ~~Nothing runs the tests automatically.~~ Fixed 21 Nov 2026 (§1 "CI"). Before it, a
  stale `state.test.ts` expectation went unnoticed from 15 to 17 Nov.
- **No frontend tests**: nothing covers `frontend/lib/api.ts` (refresh and retry, the shared
  refresh), the store's live/demo switch, or any component.
- **No end-to-end tests** in a browser (Playwright would be the usual choice).
- **No coverage measurement** (`@vitest/coverage-v8` isn't installed).
- **Integration tests share the dev database** with manual testing. A separate test
  database would be cleaner.
- **No route test checks that a limiter is attached** (limits are off in route tests; the
  limiter is tested alone).
- **Only by hand:** the real Google exchange, the real Bedrock contract (checked 14 Nov
  2026, `backend-design.md` §5), Caddy and CloudFront, login timing, and load.
