# Tech stack

The tools, in one place (checked against the code on 17 Nov 2026). Where this disagrees
with `design.md` §13, `backend-design.md` or `aws.md`, those win. The reasons for each
choice are in those files.

## In use (all live since 14 Nov 2026)

| Part | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, CSS modules with design tokens (Tailwind 4 installed, barely used) |
| Map | `@dagrejs/dagre` for layout, drawn in SVG |
| Motion | GSAP 3 (Draggable, DrawSVG, Inertia, ScrollTrigger), through `frontend/lib/gsap.ts` |
| Backend | Node.js 24, Express 5, TypeScript (strict ESM), built with tsup; `tsx` in development |
| Shared domain code | `shared/`, imported as `@shared/*` by both the frontend and the backend |
| Database | PostgreSQL 18 (`pg`), plain SQL migrations (`backend/src/db/migrations/`) |
| Topic graph | No database: the files in `shared/data`, held in memory by the API (`backend/src/repos/graph.repo.ts`) |
| Validation | zod 4 (request bodies, and the AI model's replies) |
| Testing | Vitest + supertest (backend); Vitest + Playwright for the desktop app; the frontend has no test runner |
| Auth | JWT access tokens (`jsonwebtoken`, HS256, 15 minutes) + database-backed refresh tokens in an httpOnly cookie (60 days, sliding), bcrypt (cost 12) |
| Sign-in with Google | OAuth 2 authorization code flow on the server, `google-auth-library` |
| AI | **GLM 5 on Amazon Bedrock** in Sydney (`@aws-sdk/client-bedrock-runtime`, the Converse API with structured output), one call per typed helper message; the rule-based reader is the fallback |
| Rate limiting | `express-rate-limit` (in memory; correct for one server) |
| Security headers | `helmet`; no CORS (one origin) |
| Logging | `console.*` to stdout, kept and rotated by Docker. **No per-request log** (pino was planned and not built; `backend-design.md` §8) |
| Hosting | AWS, Sydney: one EC2 server (t4g.small, arm64) running Docker Compose, behind CloudFront |
| HTTPS and routing | Caddy 2 (certificates from Let's Encrypt), in front of the API and Next.js |
| DNS | Route 53 for `trellis.niteshkumar.xyz`; the parent domain stays at GoDaddy |
| Images | Amazon ECR, built on the laptop by `deploy/release.sh` |
| Secrets | AWS Systems Manager Parameter Store, written into the server's env file at deploy |
| Backups | Nightly `pg_dump` to Amazon S3, kept 14 days (a systemd timer on the server) |
| Desktop app (21 Nov 2026) | **Electron 45** (macOS, Apple Silicon) loading the live site; TypeScript compiled by `tsc`; packaged by **electron-builder 26** into an ad-hoc-signed `.dmg` with Electron Fuses; icons rendered from the SVG mark by `@resvg/resvg-js` and `iconutil`; Vitest and Playwright (`_electron`) for tests. Electron is what the elective asks for (the nearest alternative would be Tauri: Rust, and the system WebView instead of one fixed Chromium); electron-builder was chosen over Electron Forge (more plugins for the same result). See `docs/desktop.md` |
| CI | GitHub Actions (`.github/workflows/ci.yml`), every check on every push; `deploy/release.sh` refuses a commit it hasn't passed. Chosen over AWS CodeBuild (spends the free-plan credits), Jenkins (a Java server that needs ~4 GB of RAM for a small team) and GitLab CI or CircleCI (another account for code already on GitHub) |

## Later (not v1)

| Part | Choice |
|---|---|
| Email (password reset codes, then reminders) | Amazon SES |
| CD (automatic deploys) | GitHub Actions building the arm64 images and deploying, signing in to AWS with OIDC. Waits on arm64 runners for private repos |
| Request logging | `pino` / `pino-http` with an `X-Request-Id` per request |
| Frontend and end-to-end tests | Vitest for `frontend/lib`; Playwright for the browser |
| Infrastructure as code | Terraform |
| Error tracking and uptime | Sentry; CloudWatch alarms |
| Cache / limits across several servers | Redis, only if the backend ever runs as more than one instance |
| Other notification channels (design.md §15: reminders) | Telegram, Discord, WhatsApp |

## Installed but unused

| Package | Note |
|---|---|
| `cors` (backend) | Never imported: the app deliberately has no CORS. Safe to remove |

## Dropped on 12 Nov 2026

| Was planned | Why it went |
|---|---|
| OpenRouter, Jev (TypeSafe AI), DeepSeek | Replaced by one GLM 5 call on Bedrock (design.md §16) |
| Cloudflare Tunnel | Trellis is hosted on AWS with its own address |
| Railway | Same |
| pgAdmin in production | It contradicted the privacy promise (design.md §11) |
