# Trellis

A study platform built around a knowledge graph ("the map"). It **never teaches**: it shows
what to study next, what you can skip, and the earlier topic that is really why you're
stuck, and it puts together a prompt for the student's own AI. An end-of-semester university
project for a backend course, due **21 Nov 2026**. After that, real users: classmates and
juniors first.

## Start every session here

1. Read this file, then the doc for the job:
   - `docs/design.md`: **the product (v7), the source of truth.** §5 user flows, §7 the
     helper, §8 stuck, §9 prompts, §12 AI, §14 the v1 boundary, §16 every decision and why.
   - `docs/backend-design.md`: the backend design with its reasons, the **rules for coding
     sessions (§0)**, the build plan (§10) and the **progress table (§11)**.
   - `docs/aws.md`: hosting. **§2 is the account check to run before any AWS action.**
   - `docs/frontend.md`: how the frontend is built; the data contract; **§13 the product
     changes agreed but not built yet**.
   - `README.md` (public overview; keep in step) and `docs/tech-stack.md`.
2. Run `git log --oneline -15` and `git status` to see what changed since.

### When asked "what's next in the backend?"

Follow `docs/backend-design.md` §0: bring §11 Progress up to date from `git log`, then take
the next tasks from §10 in order (M2, M3, M4, M6, MS, M5, M7), each with its tests, and keep
the docs in step. If a day slips, cut M5 first, then M6.3.

## Rules for every coding session (the owner's, 12 Nov 2026)

- **Write code as if a student will read and maintain it.** Comments explain **why** the
  code is there and why it's done this way, not what the syntax does.
- **Keep the structure simple enough that the owner can write or debug any part himself.**
  He wants to code and debug too, and must be able to take over at any point without you.
- **Explain the reasoning for every decision:** why it's there, what the alternatives were,
  what the trade-off is. Don't teach the topic itself; he knows the basics.
- **Follow production practice, and say where the design falls short of it.**
- **Docs are for him and for sessions that start with no context.** Each doc must make
  sense on its own and be easy for a person to read.
- **Before any AWS action, run the account check in `docs/aws.md` §2.** The AWS tools on
  this machine were signed in to a different account. Never act on that one.

## Where things stand (12 Nov 2026)

- **Design:** reviewed on 12 Nov 2026. `design.md` v7, `backend-design.md` and `aws.md` are
  the result. The docs are written; nothing in them beyond M0 and M1 is built yet.
- **Frontend:** the screens are finished and connected to the API (M6, on `main`):
  signed in is **live** (the record from the backend), signed out is a **demo** on the
  sample student. The topic graphs are real (`shared/data/react-native.ts`, `redis.ts`,
  from roadmap.sh). See `docs/frontend.md` §10 and §11.
- **`shared/`:** the domain code both apps run: types, data, graph, prompt, parse, helper.
  The frontend imports it as `@shared/*`. Keep it free of React, Next and Node-only APIs.
- **Backend:** M0 (foundations), M1 (Neo4j content: the graph seed, `GET /api/subjects`,
  the subject graph, `GET /api/instructions` and the path query) and M2 (accounts under
  `/api/auth`, `/api/me`, reset links, goals, claims, opened topics, subject requests, and
  running without Neo4j) and M3 (check-ins, experiences, prompt takes, `GET /api/state`,
  `GET /api/export`, `DELETE /api/me`), M4 (the helper on rules) and M6 (the frontend on
  the API, real sign-in, Google sign-in (on in development), the reset
  page, "how did it go?", the short sort, with MS.3) and MS (the new stuck ranking and
  prompt note rules) and M5 (GLM 5 on Bedrock in **Sydney**, tried against the real
  service; `AI_PROVIDER=bedrock` in `backend/.env`) are done and on `main`. **M7
  (deploy) is done: live at https://trellis.niteshkumar.xyz** since 14 Nov 2026 (Sydney,
  behind CloudFront; squashed into `main` and pushed, 14 Nov 2026). Release with `./deploy/release.sh`.
  The `trellis` AWS profile exists (account `631603562964`); still run the `docs/aws.md`
  §2 check every time.
- **AI limits per account (ML, 14 Nov 2026): built on the branch `feature/ai-limits`,
  not merged or deployed yet.** Each account has $0.06 a day and $0.25 a week of AI
  (`AI_USER_DAILY_USD`, `AI_USER_WEEKLY_USD`), inside the site's $0.50 a day. Every model
  call is reserved in `ai_calls` under a lock before Bedrock is called (migration 0019,
  `src/ai/limits.ts`). Students see a percentage in the sidebar and in Settings
  (`GET /api/usage`); the owner sees dollars with `npm run ai:spend`. The numbers and
  reasons are in `docs/backend-design.md` §5 "Cost limits".
- **Landing page and brand assets (14 Nov 2026): on `main`** (squashed from
  `frontend/brand-landing`). The landing page leads with the real React Native map in the
  app's own map style, live, and every section runs the shared code on the sample student
  (`components/landing/sample.ts`). Its headings are Fraunces. The brand is in
  `components/brand/`; the tab icon, touch icon, manifest, share image and 404 page are
  new. A signed-in visitor gets "Open your map" there, and `/login` and `/signup` send
  them on. See `docs/frontend.md` §3a and §3b.
- **Merging (owner's choice since 14 Nov 2026):** M4, M6, MS, M5, M7 and the landing page went
  into `main` as one squashed commit each, on the owner's request; §0 still says merge commits. Ask
  for the next one.
- **Plan (re-planned 13 Nov 2026):** M3 on 13 Nov; M4, M6 and MS on 14 Nov; M5 and M7 on
  15 Nov. Testing with real users 18 to 21 Nov.
- **AWS:** everything is created and live, in Sydney; every resource id is in
  `docs/aws.md` §9. CloudFront `E6RLEBVGF9SWB`, server `i-03c628dea103abc86`.
- **Git:** `main` is the only branch. Each milestone gets its own branch from `main`
  (`backend/m2`, …); commit only there. **Push and merge only on the owner's say-so.** It goes
  into `main` with a **merge commit, never a squash**, and is deleted after.
  No Claude co-author line.

## Decisions already made (don't re-ask; the reasons are in design.md §16)

- **Subjects:** React Native and Redis only. Topic names and grouping come from roadmap.sh;
  summaries, links and core/optional are ours. Anything else gets a fixed "Coming soon", and
  the request is saved.
- **The map:** two levels. A big topic opens into its subtopics when the student reaches it
  (next inside, a check-in inside, the likely cause of a stuck topic, or "Look inside now").
  It starts small and only grows.
- **Skip or not:** every topic says "Don't skip" or "Can skip" with a reason.
- **The helper** lives in the map's right panel, one thread per subject:
  - it **asks one question**, then shows a **confirm card**; nothing is saved without Save,
    and there's Undo after;
  - it **asks "how did it go?"** when the student returns after taking a prompt;
  - it **never explains**: "explain X" gets a prompt;
  - the topic panel's buttons go through it too.
  - There is no general chat in v1.
- **Stuck:** prerequisites up to two steps down, ranked by how weak the evidence is. A topic
  marked done can be a suspect if it was hard, and the student's own words move a suspect
  up. A fixed rule, never the AI's opinion.
- **Prompts are assembled, never AI-generated:** known topics + this topic's own
  experiences + **up to two "what worked" lines from its direct prerequisites** + layered
  instructions.
  - A "was hard" note stays **while its topic is not done** (there is no use counter).
  - The instructions tell the AI not to remind the student of past mistakes, and to end
    with two lines the student can paste back.
- **AI only reads helper messages:** one **GLM 5** call on **Amazon Bedrock** (Sydney, `ap-southeast-2`) per
  typed message; taps call no model; the rule-based reader is the fallback. **No Jev, no
  DeepSeek, no OpenRouter.**
- **AI limits (14 Nov 2026):** each account has a daily and a weekly allowance, counted in
  money and across all its subjects; the whole site has a daily one, which is what caps
  the bill.
  - At a limit the helper answers in **basic mode** (the rules); nothing is refused.
  - Students see **only a percentage** and a reset time, never dollars or message counts.
  - Deleting an account resets its allowance (nothing links spend to an email after).
  - **No subscription or top-up** to raise a limit in v1.
- **Accounts:** Google sign-in plus email and password. A forgotten password is reset by the
  admin with a one-time link. Email (Amazon SES) comes later; the design leaves room.
- **Storage:** Postgres for accounts and every student record; **Neo4j for the topic graph**
  (kept for v1, owner's call), but **the site must run without it**; statuses are derived,
  never stored.
- **Hosting:** AWS free plan, **Sydney** (`ap-southeast-2`): the free plan allows EC2
  nowhere else (checked 14 Nov 2026, `aws.md` §3). **CloudFront** in front caches the
  pages at edges in India; `/api/*` is never cached. One EC2 `t4g.small` with Docker
  Compose and Caddy (`deploy/`); backups in S3; DNS for `trellis.niteshkumar.xyz` in
  Route 53 (the parent domain stays at GoDaddy). The free plan ends by 12 May 2027, and **running out of credits closes the
  account**, so cost limits are uptime limits.
- **Privacy:** the promise names its limits (design.md §11). No admin tool that reads
  records; no pgAdmin in production; backups expire after 14 days.
- **Map look:**
  - arrows point **upward**, in learning order, with heads drawn along each line's last 8px;
  - links are named only on hover or selection, as tags when a line is too short, and as a
    summary when there are more than 3 of a kind;
  - the stuck trace says "may be why";
  - topic details open in a sheet over the map; the header holds the Stuck and Next buttons;
  - search is a full-page ⌘K pop-up.

## Rules for this codebase

- **No raster images.** Every picture is SVG drawn in code (the owner's explicit rule).
- **Colours come from tokens** in `frontend/app/globals.css` (light + dark); nothing is
  hard-coded. App screens use the "framed sheet" style: colour on data only, a near-black
  primary button, no gradients, no resting shadows. The landing page has its own tokens.
  The few places CSS variables can't reach (the tab icon, the build-time PNGs) take their
  hex from `components/brand/brand.ts`.
- **GSAP** from `@/lib/gsap`, with `useGSAP` and a scope; respect reduced motion.
- **IBM Plex Sans** only, with one exception the owner asked for on 14 Nov 2026: the
  landing page's headings are Fraunces (`components/landing/fonts.ts`). The theme is set
  before paint by `themeScript`.
- **Checks:** `npx tsc --noEmit`, `npx eslint .` and `npm run lint:shared` stay clean (frontend). Design inspector:
  `node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs <url> [--app]`. The
  landing page always "fails" the picture checks; that's expected.
- **Backend:** TypeScript strict ESM (tsup builds, `tsc` only type-checks), `@shared/*` for
  the domain code, every route under `/api`, errors as `{error:{code,message}}` via
  `HttpError`, zod via `validateBody`, parameterised SQL scoped by the token's user id, one
  router/controller/repo file per area, tests with every task.
- Keep the post-semester club distribution plan **out of repo docs**; `design.md` mentions
  groups only generically.

## Run

```bash
cd frontend && npm install && npm run dev        # http://localhost:3000, sample student
docker compose -f docker-compose.dev.yml up -d   # dev Postgres on :5050, Neo4j on :7687 and :7474
cd backend && npm install && npm run db-init && npm run seed:graph && npm run dev
```

The dev compose file maps Postgres to **5050** (`backend/example.env` says so; an older
`backend/.env` may still say 5432; it also needs `NEO4J_PASSWORD=trellis-dev-pass`). Backend
checks: `npm run typecheck`, `npm test` (no database) and `npm run test:integration` (real ones).
The frontend demo state is in localStorage
`trellis-demo-v5` (demo mode, signed out); Settings → "Restore the sample data" resets it.
