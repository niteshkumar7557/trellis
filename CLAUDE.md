# Trellis

A study platform built around a knowledge graph ("the map"). It **never teaches**: it shows
what to study next, what you can skip, and the earlier topic that is really why you're
stuck, and it puts together a prompt for the student's own AI. An end-of-semester university
project for a backend course, due around **27 Nov 2026**.

## Start every session here

1. Read this file, then the doc for the job:
   - `docs/design.md`: **the product (v6), the source of truth.** §7 the helper, §9 prompts,
     §12 AI, §14 the v1 boundary, §15 v2.
   - `docs/backend-design.md`: the backend system design, the build plan (§10), the
     **progress table (§11)** and **how the team works (§0)**.
   - `docs/frontend.md`: how the frontend is built and how to change it; the data contract.
   - `README.md` (public overview; keep in step) and `docs/tech-stack.md`.
2. Run `git log --oneline -15` and `git status` to see what changed since.

### When the owner asks "what's next in the backend?"

Follow `docs/backend-design.md` §0 exactly. It's the **50/50 model** (owner's rule, 7 Nov
2026, for every milestone from M1; the 70/30 of 3 Nov proved too small and easy):
1. Update §11 Progress from `git log` and merged PRs.
2. Pick the next **three independent tasks** from §10.
3. **Build about half yourself** on `backend/v1`: working code, with the teammate's half left
   as `TODO(Task X)` gaps that compile and their tests named and described but `it.skip`.
   Typecheck and tests stay green. **Solve every gap in a scratch copy, against the real
   databases, each task alone and then together,** then commit your half.
4. Write `team-tasks/<YYYY-MM-DD>/task-A-….md`, `task-B-…`, `task-C-…` (template in §0)
   for the **other half**: a spec with the new syntax and the traps, not finished code. Each
   **teaches something new**, explains your half file by file as well, opens with a block for
   the teammate's AI assistant (teach, don't just write the code), and ends with "Explain it
   back" questions and viva questions with model answers.

The rules: no two tasks share a file, migration numbers are reserved per task, and wiring
in shared files (`src/app.ts`) is done in your half, never by a teammate. The teammates
**don't know the codebase**, but must be able to explain both halves in the viva.
The owner does ideas and reviews. `team-tasks/` is git-ignored; the owner shares the files
outside GitHub.

## Where things stand (7 Nov 2026)

- **Frontend: finished.** No API calls; the topic graphs are real
  (`shared/data/react-native.ts`, `redis.ts`, from roadmap.sh). The sample student, their
  history and the helper's AI (`shared/helper.ts`, `shared/parse.ts`) are stand-ins.
- **`shared/`:** the domain code both apps run: types, data, graph, prompt, parse, helper.
  The frontend imports it as `@shared/*`. Keep it free of React, Next and Node-only APIs.
- **Backend:** M0 is done and on `main`, with the teammates' commits. M1 (Neo4j content) is half
  built on `backend/v1` (`4bf1f3e`); the 7 Nov tasks finish it: A the seed's constraints and
  stale removal, B the graph read and drift check, C the instructions and the path query.
  **Next up:** review their PRs, merge, then plan M2 the same way.
- **Git:** work happens on **`backend/v1`**. Commit only there. **Never push, never merge**
  without the owner's say-so. Teammates branch from `backend/v1` as
  `task/<date>-<letter>-<slug>`, and PRs go into `backend/v1`. **Merge commits only, never
  squash:** the owner needs each teammate's own commits visible on `main` for the viva.

## Decisions already made (don't re-ask)

- **Subjects:** React Native and Redis only. Topic names and grouping come from roadmap.sh;
  summaries, links and core/optional are ours. Anything else gets a fixed "Coming soon".
- **The map:** two levels. A big topic opens into its subtopics when the student reaches it
  (next inside, a check-in inside, the likely cause of a stuck topic, or "Look inside now").
  It starts small and only grows.
- **Skip or not:** every topic says "Don't skip" or "Can skip" with a reason.
- **The helper** lives in the map's right panel, one thread per subject:
  - it **asks one question**, then shows a **confirm card**; nothing is saved without Save,
    and there's Undo after;
  - it **never explains**: "explain X" gets a prompt;
  - the topic panel's buttons go through it too.
  - There is no general chat in v1.
- **Prompts are assembled, never AI-generated:** known topics + **this topic's own
  experiences** + layered instructions.
  - A "was hard" experience is used in at most **2 prompts taken**.
  - The instructions tell the AI not to remind the student of past mistakes.
- **AI only in the helper:** **Jev** (TypeSafe AI) routes each message; **DeepSeek v4.1
  flash** reads the ones that need language. Both go through OpenRouter. The rule-based
  stand-in is the fallback.
- **Storage:** Postgres for accounts and every student record; **Neo4j for the topic graph**
  (kept for v1, owner's call); statuses are derived, never stored.
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
- **GSAP** from `@/lib/gsap`, with `useGSAP` and a scope; respect reduced motion.
- **IBM Plex Sans** only; the theme is set before paint by `themeScript`.
- **Checks:** `npx tsc --noEmit`, `npx eslint .` and `npm run lint:shared` stay clean (frontend). Design inspector:
  `node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs <url> [--app]`. The
  landing page always "fails" the picture checks; that's expected.
- **Backend:** TypeScript strict ESM (tsup builds, `tsc` only type-checks), `@shared/*` for
  the domain code, errors as `{error:{code,message}}` via `HttpError`, zod via
  `validateBody`, parameterised SQL scoped by the
  token's user id, one router/controller/repo file per area, tests with every task.
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
`trellis-demo-v4`; Settings → "Restore the sample data" resets it.
