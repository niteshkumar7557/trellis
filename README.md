# Trellis

> The map of what you're learning.

Trellis is a study platform built around a **knowledge graph** of a subject. It shows you:

- what to study next
- what you can skip for your goal
- when you're stuck, the earlier topic that is probably the real problem

It also remembers what confused you and what helped, so you never explain yourself twice.

**Trellis never teaches.** For every topic it puts together a precise prompt that you take
to your own AI (ChatGPT, Claude, Gemini), from what you know, what you've said about the topic,
and fixed instructions; no AI writes it. The learning happens there; Trellis does the part your AI
can't: it knows the shape of the subject and your history inside it.

**Status:** v1 in progress. The frontend is complete: its topic maps are real; the student and
the helper's AI are stand-ins. The backend is designed (`docs/backend-design.md`) and is
being built next.

---

## How it works

1. **Pick a subject and a goal.** For example: *React Native → Build and ship my first app*.
2. **Sort the big topics.** For each one: *I know it · Shaky · New to me*. It takes about a minute.
3. **See your map.** For example, *"31 to learn · 48 you can skip"*, with one topic marked
   **next**. It starts small: each big topic opens into its smaller topics when you reach it.
4. **Study it with your own AI**, using the prompt Trellis writes for you.
5. **Tell the helper**, in the map's side panel: *"my flatlist doesn't update when I add an
   item"*. It asks what's confusing, shows what it will save, and saves only when you confirm
   (with Undo after). What you tell it shapes your future prompts.
6. **When you're stuck,** Trellis says whether the topic is one not to skip, and points to the
   weakest earlier topic: *"You may be stuck because of State."*

**v1 subjects:** React Native and Redis. Their topic lists are adapted from the roadmaps at
[roadmap.sh](https://roadmap.sh); the links, core/optional marks, summaries and mistakes are
ours. Any other subject gets a "coming soon" for now.

## Docs

| File | What it covers |
|---|---|
| [`docs/design.md`](docs/design.md) | The product: rules, the map, check-ins, promises, the v1 boundary and the v2 list. **The source of truth.** |
| [`docs/frontend.md`](docs/frontend.md) | How the frontend is built and how to change it; the data contract the backend must serve |
| [`docs/backend-design.md`](docs/backend-design.md) | The backend system design, the build plan, and how the team splits the work |
| [`docs/tech-stack.md`](docs/tech-stack.md) | The tools: in use, planned, later |

## Tech

| Part | Choice |
|---|---|
| Frontend | Next.js 16, Tailwind 4, GSAP. The map is laid out with dagre and drawn in SVG. |
| Backend | Node.js, Express |
| Data | Postgres for accounts and every student's record; Neo4j for the topic graph (planned) |
| AI | Only in the helper chat, through OpenRouter: Jev to route each message, DeepSeek to read it (planned; a rule-based stand-in for now) |
| Infra | Docker Compose, served through a Cloudflare Tunnel |

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
cp backend/example.env backend/.env   # then point DB_URL at port 5050
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5050
```

**Backend:**

```bash
cd backend
npm install
npm run db-init      # migrations + seed
npm run dev
```

## Project layout

```
frontend/
  app/                 routes: landing, (auth), start, (app)/map | check-ins | settings
  components/map/      the map: layout, canvas, topic panel, helper chat, list view
  components/landing/  landing page
  components/art/      SVG drawings (the espalier)
  lib/store.tsx        client state: the one place to swap in API calls
shared/                domain code the frontend and backend both run (imported as @shared/*)
  data/                the React Native and Redis maps (reviewed files), and a sample student
  graph.ts             derived logic: statuses, next topic, what's open, skip or not, stuck diagnosis
  helper.ts            the helper chat's brain (stand-in for the AI): ask, propose, reply
  prompt.ts            the three-part prompt: known topics, experiences, instructions
backend/
  src/                 Express API (auth today; the v1 endpoints are next)
docs/                  design, frontend plan, tech stack
```

## Our promises

- **Your record is private.** Nobody else sees it.
- **You can see, edit and delete everything** Trellis records about you.
- **No streaks, no guilt, no nagging.** Coming back after a break is never harder than carrying on.
