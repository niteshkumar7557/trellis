# Trellis

A study platform built around a knowledge graph ("the map"). It **never teaches**: it shows
what to study next, what you can skip, and the earlier topic that is really why you're
stuck, and it puts together a prompt for the student's own AI. An end-of-semester university
project for a backend course, due **21 Nov 2026**. After that, real users: classmates and
juniors first.

## Start every session here

1. Read this file, then the doc for the job (`docs/README.md` maps every doc to the
   question it answers):
   - `docs/codebase.md`: **the whole codebase for someone new**: every folder, how a
     request flows, sign-in, the AI, the data, conventions, where to make common changes.
   - `docs/design.md`: **the product (v7), the source of truth.** §5 user flows, §7 the
     helper, §8 stuck, §9 prompts, §12 AI, §14 the v1 boundary, §16 every decision and why.
   - `docs/backend-design.md`: the backend design with its reasons, the **rules for coding
     sessions (§0)**, the build plan (§10) and the **progress table (§11)**.
   - `docs/aws.md`: hosting. **§2 is the account check to run before any AWS action.**
   - `docs/frontend.md`: how the frontend is built; the data contract; **§13 the product
     changes agreed but not built yet**.
   - `README.md` (public overview; keep in step) and `docs/tech-stack.md`.
   - `docs/subject-blueprint.md`: **adding a subject**: official sources, a staged path with
     gates, a review panel of agents, and a design record per subject (`docs/subjects/`).
   - `docs/testing.md`: the backend's two test suites, each technique with its files, how to
     write and debug a test, and the gaps.
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

## Where things stand (21 Nov 2026)

- **Desktop app (21 Nov 2026): merged into `main` with merge commits and released; pushed.
  Current version 1.0.2.** `desktop/` is an Electron Mac app (Apple Silicon, ad-hoc signed,
  no notarization: $0) that loads the live site in a locked-down window, with a menu,
  menu-bar icon, update check, ⌃⌥T, Back/Forward (⌘[ ⌘] and a two-finger swipe that yields to the map's panning), and Google sign-in in the system browser handed back by
  `trellis://` with PKCE. It opens Log in when signed out, the map when signed in. **No
  reminders** (1.0.1 removed 1.0.0's daily reminder: design.md §14 and the landing page
  promise none). It's a graded elective; **everything about it is in `docs/desktop.md`.**
  Downloads: https://github.com/niteshkumar7557/trellis-desktop (the app's update check
  reads its latest release), linked from the landing footer and Settings (hidden inside
  the app, `frontend/lib/desktop.ts`). The backend half is live: migration 0020
  `desktop_handoffs`, `GET /api/auth/google?desktop=`, `POST /api/auth/desktop/exchange`,
  the `/auth/desktop` page. Counts: backend `npm test` 329, `npm run test:integration` 96;
  desktop `npm test` 33, `npm run test:e2e` 11, `npm run test:e2e:stack` 3.
- **No graph database (21 Nov 2026): merged into `main` with a merge commit (branch
  `chore/drop-graph-database`, deleted) and released the same day; pushed.** The owner removed it: it took a 768 MB share of the 2 GB server and
  nothing a student sees needed it. The API now reads the topic graph from `shared/data`
  in memory (`backend/src/repos/graph.repo.ts`): the three content routes keep their URLs
  and answers and can no longer answer 503; `/api/health` is `{ postgres }` only; there is
  no graph seed, drift check or graph-database variable. Counts: `npm test` 323, `npm run
  test:integration` 90, all passing. **After the release**, two leftovers on AWS need the
  owner's yes: the old data volume on the server and one Parameter Store secret (the
  commands are in the branch's commit message). The reasons are in `backend-design.md` §2
  "No graph database" and `design.md` §16.
- **Docs and comments brought up to date (17 Nov 2026), committed straight to `main` on the
  owner's request and pushed; no release needed (no behaviour changed).** Added
  `docs/README.md`, `docs/codebase.md` and `docs/testing.md`; fixed stale lines across the
  docs and code comments; fixed `test/integration/state.test.ts`, which had failed since
  MongoDB arrived (nobody ran the suite). Counts: `npm test` 329, `npm run test:integration`
  112, all passing. What the check found is in `backend-design.md` §11 "Known gaps":
  - **the AI costs about $0.003 a message now, not $0.002** (the 15 Nov topic lists are
    bigger), so a student gets about 20 AI-read messages a day, not 30; re-measure from
    `ai_calls` and decide on `AI_USER_DAILY_USD`;
  - **no request logging** (pino and `X-Request-Id` were planned, never built);
  - ~~nothing runs the tests automatically~~: fixed 21 Nov 2026, see CI below;
  - the unused `cors` dependency, the unused `users.role` column, and Google's start
    sharing login's rate-limit count.
- **In one line:** every milestone of v1 (M0 to M7, MS, ML) is built, merged and **live at
  https://trellis.niteshkumar.xyz**. Production runs the merge of `chore/drop-graph-database`, released 21 Nov 2026 (before it, `bf1c0fc` from 15 Nov). Three subjects are live: React Native, Redis and MongoDB. **Nothing is pending** (owner, 15 Nov 2026: "mark all pending things done"); the items closed without being built are listed under "Closed on 15 Nov 2026" below. Next: testing with real users, 18 to 21 Nov.
- **Design:** reviewed on 12 Nov 2026 (`design.md` v7, `backend-design.md`, `aws.md`), and
  kept in step with every change since; the docs describe the code as it stands.
- **Frontend:** the screens are finished and connected to the API (M6, on `main`):
  signed in is **live** (the record from the backend), signed out is a **demo** on the
  sample student. The topic graphs are real (`shared/data/react-native.ts`, `mongodb.ts`
  from official sources; `redis.ts` adapted from roadmap.sh). See `docs/frontend.md` §10
  and §11.
- **`shared/`:** the domain code both apps run: types, data, graph, prompt, parse, helper.
  The frontend imports it as `@shared/*`. Keep it free of React, Next and Node-only APIs.
- **Backend:** M0 (foundations), M1 (content: `GET /api/subjects`, the subject graph,
  `GET /api/instructions` and the path query; from memory since 21 Nov 2026) and M2
  (accounts under `/api/auth`, `/api/me`, reset links, goals, claims, opened topics and
  subject requests) and M3 (check-ins, experiences, prompt takes, `GET /api/state`,
  `GET /api/export`, `DELETE /api/me`), M4 (the helper on rules) and M6 (the frontend on
  the API, real sign-in, Google sign-in (on in development), the reset
  page, "how did it go?", the short sort, with MS.3) and MS (the new stuck ranking and
  prompt note rules) and M5 (GLM 5 on Bedrock in **Sydney**, tried against the real
  service; `AI_PROVIDER=bedrock` in `backend/.env`) are done and on `main`. **M7
  (deploy) is done: live at https://trellis.niteshkumar.xyz** since 14 Nov 2026 (Sydney,
  behind CloudFront; squashed into `main` and pushed, 14 Nov 2026). Release with `./deploy/release.sh`.
  The `trellis` AWS profile exists (account `631603562964`); still run the `docs/aws.md`
  §2 check every time.
- **AI limits per account (ML, 14 Nov 2026): on `main` (merge commit `6159270`) and
  live.** Each account has $0.06 a day and $0.25 a week of AI
  (`AI_USER_DAILY_USD`, `AI_USER_WEEKLY_USD`), inside the site's $0.50 a day. Every model
  call is reserved in `ai_calls` under a lock before Bedrock is called (migration 0019,
  `src/ai/limits.ts`). Students see a percentage in the sidebar and in Settings
  (`GET /api/usage`); the owner sees dollars with `npm run ai:spend`. The numbers and
  reasons are in `docs/backend-design.md` §5 "Cost limits".
- **Landing page and brand assets (14 Nov 2026): on `main` and live** (squashed from
  `frontend/brand-landing`, released as `253c556`). The landing page leads with the real React Native map in the
  app's own map style, live, and every section runs the shared code on the sample student
  (`components/landing/sample.ts`). Its headings are Fraunces. The brand is in
  `components/brand/`; the tab icon, touch icon, manifest, share image and 404 page are
  new. A signed-in visitor gets "Open your map" there, and `/login` and `/signup` send
  them on. See `docs/frontend.md` §3a and §3b.
- **Topic difficulty (14 Nov 2026): on `main` and live** (`d67de24`). Every topic is Easy,
  Medium or Hard; the helper no longer asks "what felt easy, and was anything hard?" after
  Got it on an easy topic. Details under "Decisions" below and in `design.md` §7.
- **Small fixes (14 Nov 2026): on `main` and live** (`2e9ebc7`):
  - suggestion chips under the helper's **latest** reply only, worked out when shown from
    the record (`suggestionsFor` in `shared/helper.ts`), never saved with the message and
    never an invented problem; "Nothing to add" while it waits on its question;
  - `/map` with no goal anywhere says "Your map", not "React Native";
  - a big topic's soft link is drawn and named once (it showed "helps" twice);
  - long chips wrap inside their border.
- **Map rendering review and fixes (14 Nov 2026): on `main` and live** (`8084a53`). Big-topic "needs" links are now worked out from the subtopic links (six
  changed: Networking and Storage stand on React basics, Publishing on Development
  workflow, Pub/Sub on Getting started; Performance no longer needs Interactions); frames
  are laid out by dagre; lines run top to bottom with upright heads; hover lights the
  topic's own lines too; open frame headers are clickable again; tags never cover names;
  a selected topic keeps its path (switch in the sheet); zoom out fits any map.
  Details in `docs/frontend.md` §7 and "Editing the topic graphs". No topic ids changed.
  The blueprint for adding a subject is `docs/subject-blueprint.md` (14 Nov 2026, live in
  `73b62c6`); a subject is now one file plus one line in `shared/data/index.ts` and its id
  in `SubjectId`.
- **React Native redesigned (15 Nov 2026): on `main` and live** (`a4319bd`, squashed from
  `feature/subject-react-native`). Built from official sources with the blueprint: 25 big topics, 159
  subtopics, three goals, an "I already know React" shortcut on /start/sort ("Build my first app", "Publish to the app stores", "All of React
  Native"); no roadmap.sh credit. Everything about it (sources, inventory, decisions,
  review findings) is in `docs/subjects/react-native.md`. The owner asked to finish it in one
  session, so the plan sign-off, the file-stage review round and the browser look were
  skipped; the owner closed them on 15 Nov 2026 (see below). The sample student is now told "may be
  Objects and arrays in state" for FlatList. Old React Native
  check-ins on retired ids (listed in the record's Decisions) stop matching a topic.
- **MongoDB (15 Nov 2026): on `main` and live** (`88f81fa`, squashed from
  `feature/subject-mongodb`). A new subject from official sources with the blueprint:
  22 big topics, 143 subtopics, four goals (Node.js, Go, Mongoose, all). Its record is
  `docs/subjects/mongodb.md`.
- **Map and landing fixes (15 Nov 2026): on `main` and live** (`05d37de`, `bf1c0fc`):
  - a skeleton (grey shapes) while the app finds out who is signed in, instead of the
    sample student's sidebar flashing up (`components/app/Skeleton.tsx`);
  - map lines between big topics, inside open frames and on the miniatures each get their
    own **lane** in the gap they cross, drawn as one smooth S (`laneRoutes` in
    `components/map/layout.ts`, `SHAPE = "curve"`); lines sharing one box edge start 24px
    apart; rows and frames grow when a gap needs room;
  - landing: the hero's key is a row under the map; the stuck trace spreads its rows and
    sizes each row's names to fit (measured in the browser); a claimed topic says "Said I
    know", not "Done"; the subjects sit in one row of three; the "What it won't do" and
    footer headings lead their items.
- **Closed on 15 Nov 2026 without being built (owner: "mark all pending things done").**
  Don't treat these as done; reopen one only when the owner asks:
  - the **Redis redesign** with the blueprint, and with it **removing the roadmap.sh
    credit** (`Subject.source`, `SOURCE`, `fromRoadmapSh` and the docs that mention it).
    Redis still credits roadmap.sh;
  - React Native's skipped gates: the plan sign-off, a file-stage review round, the look
    in the browser;
  - MongoDB's unfinished checks: triaging the file-stage review, the rest of stage 9
    (hovers, a selected topic, the list view) and stage 10 (`npm run test:integration`
    with the dev databases up).
- **Merging (owner's choice since 14 Nov 2026):** M4, M6, MS, M5, M7, the landing page,
  topic difficulty and the small fixes went into `main` as one squashed commit each, on the
  owner's request; ML, the graph-database removal and CI (21 Nov) went in with merge commits; the 17 Nov docs update was committed
  straight to `main` on the owner's request (a one-off). `backend-design.md` §0 now says
  "the owner's call each time". Ask which for the next one.
- **CI (21 Nov 2026, on `main`):** GitHub Actions, `.github/workflows/ci.yml`: on every push and pull
  request it runs the backend typecheck, unit tests and build, the integration tests on a
  `postgres:18` service container, and the frontend's `tsc`, eslint, `lint:shared` and
  `next build`. `release.sh` asks `gh` whether CI passed for `HEAD` and stops if not, so
  **push first, wait for green, then release**. `SKIP_CI_CHECK=1` is the emergency
  override. Deploys stay manual (laptop arm64 builds); automating them is a later step.
- **Releasing:** run `./deploy/release.sh` on its own, **never piped** (`| tail` hides a
  failed build behind a success code). Every build downloads IBM Plex Sans from Google
  Fonts; on 14 Nov one build failed there for a moment (`next-font-loader … reading '1'`).
  Production keeps running the old release when a build fails; run it again.
- **Plan (re-planned 13 Nov 2026):** everything planned for 13 to 15 Nov was done by
  15 Nov. Testing with real users 18 to 21 Nov.
- **AWS:** everything is created and live, in Sydney; every resource id is in
  `docs/aws.md` §9. CloudFront `E6RLEBVGF9SWB`, server `i-03c628dea103abc86`.
- **Git:** `main` is the only branch and matches GitHub (21 Nov 2026: the graph-database
  removal and CI both went in with merge commits and were pushed).
  Each piece of work gets its own branch from `main` (`backend/m2`, `feature/…`, `fix/…`); commit only there, unless the
  owner says otherwise. **Push, merge and deploy only on the owner's say-so.** How to merge
  is the owner's call each time (see "Merging"), so ask.
  The branch is deleted after. No Claude co-author line.

## Decisions already made (don't re-ask; the reasons are in design.md §16)

- **Subjects:** React Native, Redis and MongoDB. Redis's topic names and grouping came from
  roadmap.sh, and it keeps that credit (its redesign was closed unbuilt, 15 Nov 2026);
  React Native (redesigned) and MongoDB (new) were built from official sources on
  15 Nov 2026 and credit nothing.
  Anything else gets a fixed "Coming soon", and the request is saved.
- **New subjects (14 Nov 2026):** designed from **official sources split by job** (docs and
  release notes for facts, exam guides and official courses for scope, learner pain for
  core and difficulty), **never roadmap.sh**; always searched, never from memory; every draft
  reviewed by **three agents per round, two rounds at most** (owner, 15 Nov 2026: the
  14-agent panel used up a session). The procedure is `docs/subject-blueprint.md`.
- **The map:** two levels. A big topic opens into its subtopics when the student reaches it
  (next inside, a check-in inside, the likely cause of a stuck topic, or "Look inside now").
  It starts small and only grows.
- **Skip or not:** every topic says "Don't skip" or "Can skip" with a reason.
- **Difficulty (14 Nov 2026):** every topic is Easy, Medium or Hard (`Topic.difficulty`),
  rated by hand in each subject file's difficulty table (`redisDifficulty`,
  `reactNativeDifficulty`) from what learners report; a big
  topic takes its hardest core subtopic. Shown in LeetCode's colours as a word and a bar
  meter, never a filled pill (statuses own those). The helper doesn't ask "what felt easy,
  and was anything hard?" after Got it on an easy topic.
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
- **Storage:** Postgres for accounts and every student record. **The topic graph has no
  database** (owner, 21 Nov 2026: it used too much of the server's memory, and it isn't
  coming back): the API reads `shared/data` in memory. Statuses are derived, never stored.
- **Hosting:** AWS free plan, **Sydney** (`ap-southeast-2`): the free plan allows EC2
  nowhere else (checked 14 Nov 2026, `aws.md` §3). **CloudFront** in front caches the
  pages at edges in India; `/api/*` is never cached. One EC2 `t4g.small` with Docker
  Compose and Caddy (`deploy/`); backups in S3; DNS for `trellis.niteshkumar.xyz` in
  Route 53 (the parent domain stays at GoDaddy). The free plan ends by 12 May 2027, and **running out of credits closes the
  account**, so cost limits are uptime limits.
- **Privacy:** the promise names its limits (design.md §11). No admin tool that reads
  records; no pgAdmin in production; backups expire after 14 days.
- **Map look:**
  - arrows point **upward**, in learning order: every line leaves a box's top, enters the
    next one's bottom, and ends in a straight 8px stem under its head (14 Nov 2026);
  - big-topic "needs" links are **worked out** from the subtopics' (core ones only), never
    written; a link between subtopics in different big topics shows as the big-topic line;
  - hover lights the topic's own lines both ways plus the chain below; every named line is lit;
  - a selected topic shows the same path and holds it (hover changes nothing) until the
    sheet's "Hide path"; zoom goes out as far as the whole map needs;
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
docker compose -f docker-compose.dev.yml up -d   # dev Postgres on :5050
cd backend && npm install && npm run db-init && npm run dev
```

The dev compose file maps Postgres to **5050** (`backend/example.env` says so; an older
`backend/.env` may still say 5432). Backend
checks: `npm run typecheck`, `npm test` (no database) and `npm run test:integration` (real ones). `npm run subject -- <id> [--goal a,b]` prints a subject's curriculum as Trellis works it
out (routes, worked-out links, warnings).
The frontend demo state is in localStorage
`trellis-demo-v5` (demo mode, signed out); Settings → "Restore the sample data" resets it.
