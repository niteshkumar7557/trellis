# Tech stack

Where this disagrees with `design.md` §13 or `backend-design.md`, those win.

## In use

| Part | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, CSS modules with design tokens (Tailwind 4 installed, barely used) |
| Map | dagre for layout, drawn in SVG |
| Motion | GSAP (Draggable, DrawSVG, Inertia, ScrollTrigger) |
| Backend | Node.js 24, Express 5, TypeScript (ESM) |
| Database | PostgreSQL 18 |
| Auth | JWT access tokens + database-backed refresh tokens (httpOnly cookie), bcrypt |
| Infra | Docker Compose; served through a Cloudflare Tunnel |

## Planned for v1 (see backend-design.md)

| Part | Choice |
|---|---|
| Shared domain code | `shared/` used by both frontend and backend; the backend builds with tsup |
| Validation | zod |
| Testing | Vitest + supertest |
| AI | OpenRouter: **TypeSafe AI Jev** to route helper messages, **DeepSeek v4.1 flash** to read them |
| Topic graph | **Neo4j 5** (content only, seeded from `shared/data`; backend-design.md §2) |
| Rate limiting | express-rate-limit (in memory) |

## Later (not v1)

| Part | Choice |
|---|---|
| Auth | Google OAuth2 |
| Cache / multi-instance limits | Redis |
| Observability | Sentry; UptimeRobot (downtime); Healthchecks (nightly database backup ping) |
| Notifications (design.md §15: reminders) | AWS SES, Telegram, Discord, WhatsApp (Evolution API) |
| CI / CD | GitHub Actions; Railway |
