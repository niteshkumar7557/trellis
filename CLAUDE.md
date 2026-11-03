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

Follow `docs/backend-design.md` §0 exactly. It's the **70/30 model** (owner's rule, 3 Nov
2026, for every milestone):
1. Update §11 Progress from `git log` and merged PRs.
2. Pick the next **three independent tasks** from §10.
3. **Build about 70% of each yourself** on `backend/v1`: working code, with the teammate's
   part left as `TODO(Task X)` gaps that compile and their tests written but `it.skip`.
   Typecheck and tests stay green. Solve the 30% in a scratch copy to prove it works, then
   commit the 70%.
4. Write `team-tasks/<YYYY-MM-DD>/task-A-….md`, `task-B-…`, `task-C-…` (template in §0)
   for the **remaining 30%**. Each one **teaches something new**, explains the 70% file by
   file as well, opens with a block for the teammate's AI assistant (teach, don't just
   write the code), and ends with "Explain it back" questions and viva questions with model
   answers.

The rules: no two tasks share a file, migration numbers are reserved per task, and wiring
in shared files (`src/app.ts`) is done in your 70%, never by a teammate. The teammates are
busy and **don't know the codebase**, but must be able to explain both parts in the viva.
The owner does ideas and reviews. `team-tasks/` is git-ignored; the owner shares the files
outside GitHub.

## Where things stand (3 Nov 2026)

- **Frontend: finished** (on `main`). No API calls; the topic graphs are
  real (`shared/data/react-native.ts`, `redis.ts`, from roadmap.sh). The sample
  student, their history and the helper's AI (`shared/helper.ts`, `shared/parse.ts`) are
  stand-ins.
- **`shared/`** (M0.1, done): the domain code both apps run: types, data, graph, prompt,
  parse, helper. The frontend imports it as `@shared/*`. Keep it free of React, Next and
  Node-only APIs.
- **Backend: M0 in progress.** Express + Postgres auth, now built with tsup, tested with
  Vitest, one error shape, Neo4j/AI config. No `/api` routes yet. Then M1 (Neo4j content).
- **Git:** `main` holds the finished frontend as one squashed commit (`8e3aadc redesign:
  frontend-v4`); `redesign/frontend-v1` keeps its step-by-step history. Work happens on
  **`backend/v1`**, created 3 Nov 2026 from `main`. Commit only on `backend/v1`. **Never push,
  never merge** without the owner's say-so. Teammates branch from `backend/v1` as
  `task/<date>-<letter>-<slug>`.
- **M0:** the 70% is on `backend/v1` (`a730405`); the 3 Nov tasks (A error branches,
  B golden prompt facts + data checks, C migrations 0005–0006 + `fraction()`) finish it.
  **Next up:** once they merge, plan M1 with the same 70/30 model.

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
docker compose -f docker-compose.dev.yml up -d   # dev Postgres on :5050 (Neo4j joins in M1)
cd backend && npm install && npm run db-init && npm run dev
```

The dev compose file maps Postgres to **5050** (`backend/example.env` says so; an older
`backend/.env` may still say 5432). Backend checks: `npm run typecheck` and `npm test`.
The frontend demo state is in localStorage
`trellis-demo-v4`; Settings → "Restore the sample data" resets it.
