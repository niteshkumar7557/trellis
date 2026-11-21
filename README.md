# Trellis

> The map of what you're learning.

Trellis is a study platform built around a **knowledge graph** of a subject. It shows you:

- what to study next
- what you can skip for your goal
- when you're stuck, the earlier topic that is probably the real problem

It also remembers what confused you and what helped on each topic, so your next prompt already knows.

**Trellis never teaches.** For every topic it puts together a precise prompt that you take
to your own AI (ChatGPT, Claude, Gemini), from what you know, what you've said about the topic,
and fixed instructions; no AI writes it. The learning happens there; Trellis does the part your AI
can't: it knows the shape of the subject and your history inside it.

**Status:** v1 is built and live at
[trellis.niteshkumar.xyz](https://trellis.niteshkumar.xyz) (AWS, Sydney, behind
CloudFront; `docs/aws.md`). Accounts (email and password, Google), each student's record,
the helper (GLM 5 on Amazon Bedrock reads typed messages, with rules as the fallback and a
daily and weekly AI allowance per account), and an Easy / Medium / Hard rating on every
topic. Signed-out visitors get a demo on a sample student. Testing with real users starts
18 Nov 2026.

---

## How it works

1. **Pick a subject and a goal.** For example: *React Native → Build and ship my first app*.
2. **Sort the big topics.** For each one: *I know it · Shaky · New to me*. It takes about a minute.
3. **See your map.** For example, *"31 to learn · 48 you can skip"*, with one topic marked
   **next**. It starts small: each big topic opens into its smaller topics when you reach it.
4. **Study it with your own AI**, using the prompt Trellis puts together for you.
5. **Come back and say how it went.** Trellis asks *"How did State go?"*: one tap answers it.
   Or tell the helper in your own words: *"my flatlist doesn't update when I add an item"*.
   It asks what's confusing, shows what it will save, and saves only when you confirm (with
   Undo after). What you tell it shapes your future prompts.
6. **When you're stuck,** Trellis says whether the topic is one not to skip, and points to the
   earlier topic that may be the real problem: *"You may be stuck because of State."*

**v1 subjects:** React Native, Redis and MongoDB. MongoDB was designed from official sources
on 15 Nov 2026 (MongoDB 9.0, the Node.js and Go drivers, Mongoose;
[docs/subjects/mongodb.md](docs/subjects/mongodb.md)). React Native was redesigned from official sources
on 15 Nov 2026 (the React Native and Expo docs and release notes, Meta's course, the State of
React Native survey and Stack Overflow; [docs/subjects/react-native.md](docs/subjects/react-native.md)).
Redis's topic list is still adapted from the roadmap at [roadmap.sh](https://roadmap.sh) until
its redesign; its links, core/optional marks, summaries and mistakes are ours. Any other
subject gets a "coming soon" for now. New subjects follow
[docs/subject-blueprint.md](docs/subject-blueprint.md).

## Docs

New to the code? Start with [`docs/README.md`](docs/README.md) (the reading order) and
[`docs/codebase.md`](docs/codebase.md) (a tour of the whole codebase).

| File | What it covers |
|---|---|
| [`docs/README.md`](docs/README.md) | Start here: which doc answers which question, and the order to read them in |
| [`docs/codebase.md`](docs/codebase.md) | The whole codebase for someone new: every folder, how a request flows, sign-in, the AI, the data, conventions |
| [`docs/testing.md`](docs/testing.md) | The backend's tests: the two suites, each technique with its files, how to write and debug a test, the gaps |
| [`docs/design.md`](docs/design.md) | The product: what it is, who it's for, the user flows, promises, the v1 boundary, and every decision with its reason. **The source of truth.** |
| [`docs/backend-design.md`](docs/backend-design.md) | The backend: architecture, data model, API, auth, the helper, the build plan and the progress |
| [`docs/aws.md`](docs/aws.md) | Hosting on AWS: each service and why, the free plan's limits, costs, DNS, backups and setup steps |
| [`docs/frontend.md`](docs/frontend.md) | How the frontend is built and how to change it; the data contract the backend must serve |
| [`docs/tech-stack.md`](docs/tech-stack.md) | The tools: in use, later, dropped |
| [`docs/subject-blueprint.md`](docs/subject-blueprint.md) | How to add a subject: official sources, a staged path with review gates |
| [`docs/subjects/`](docs/subjects/) | One design record per subject built with the blueprint (React Native, MongoDB) |

## Tech

| Part | Choice |
|---|---|
| Frontend | Next.js 16, Tailwind 4, GSAP. The map is laid out with dagre and drawn in SVG. |
| Backend | Node.js, Express |
| Data | Postgres for accounts and every student's record; the topic graph is TypeScript files in `shared/data`, which the API reads in memory |
| AI | Only in the helper chat: GLM 5 on Amazon Bedrock reads each typed message when it is turned on (`AI_PROVIDER=bedrock`), within spending limits (each account's for the day and the week, shown to the student as a percentage; the whole site's for the day); a rule-based reader is the fallback and the default |
| Infra | AWS (Sydney, the free plan's region) behind CloudFront, which caches pages near India: one EC2 server running Docker Compose behind Caddy (`deploy/`); backups in S3 |

## Run it locally

**Frontend** (works on its own, with dummy data):

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

You start as a sample student, Nitesh, who is three weeks into React Native, stuck on
FlatList. Redis starts from zero, so you can try the start flow. **Settings → Restore the sample data** resets the demo.

**Dev database:**

```bash
cp backend/example.env backend/.env   # then set JWT_SECRET: openssl rand -hex 32
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5050
```

**Backend:**

```bash
cd backend
npm install
npm run db-init      # migrations + seed
npm run dev
```

**Checks** (run before every merge; nothing runs them automatically yet):

```bash
cd backend && npm run typecheck && npm test        # 323 unit tests, no database, ~3 s
npm run test:integration                            # 90 tests against the dev Postgres
cd ../frontend && npx tsc --noEmit && npx eslint . && npm run lint:shared
```

## Project layout

```
frontend/
  app/                 routes: landing, (auth), start, (app)/map | check-ins | settings
  components/map/      the map: layout, canvas, topic panel, helper chat, list view
  components/landing/  landing page: the real map, live, on the sample student's record
  components/brand/    the mark, the lockup, and the icons and share image drawn from them
  components/art/      SVG drawings (the espalier)
  lib/api.ts           the one API client (the access token in memory, refresh and retry)
  lib/store.tsx        client state: live (signed in, from the API) or demo (the sample student)
shared/                domain code the frontend and backend both run (imported as @shared/*)
  data/                one reviewed file per subject (React Native, Redis, MongoDB), and a sample student;
                       adding a subject: docs/subject-blueprint.md
  graph.ts             derived logic: statuses, next topic, what's open, skip or not, stuck diagnosis
  helper.ts            the helper's rules: read a message (readByRules), reply (replyFor), after a save
  parse.ts             the rule-based reader's keyword matching
  prompt.ts            the three-part prompt: known topics, experiences, instructions
backend/
  src/                 Express API: accounts, each student's record, the helper, the AI and its limits
  test/                Vitest unit tests; test/integration/ against the real Postgres
deploy/                production: Docker Compose, Caddy, the release, deploy and backup scripts
docs/                  start at docs/README.md
```

## Our promises

- **Your record is private.** No other student, teacher or group sees it. What you type to the
  helper is read by an AI model inside our own AWS account and is not used to train it.
- **You can see, edit and delete everything** Trellis records about you.
- **No streaks, no guilt, no nagging.** Coming back after a break is never harder than carrying on.
