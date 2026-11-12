# Tech stack

The tools, in one place. Where this disagrees with `design.md` §13, `backend-design.md` or
`aws.md`, those win. The reasons for each choice are in those files.

## In use

| Part | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, CSS modules with design tokens (Tailwind 4 installed, barely used) |
| Map | dagre for layout, drawn in SVG |
| Motion | GSAP (Draggable, DrawSVG, Inertia, ScrollTrigger) |
| Backend | Node.js 24, Express 5, TypeScript (ESM), built with tsup |
| Shared domain code | `shared/`, used by both the frontend and the backend |
| Database | PostgreSQL 18 |
| Topic graph | Neo4j 5 (content only, seeded from `shared/data`) |
| Validation | zod |
| Testing | Vitest + supertest |
| Auth | JWT access tokens + database-backed refresh tokens (httpOnly cookie), bcrypt |

## Planned for v1 (see backend-design.md §10)

| Part | Choice |
|---|---|
| Sign-in | Google (OAuth 2, `google-auth-library`) next to email and password |
| AI | **GLM 5 on Amazon Bedrock** (`@aws-sdk/client-bedrock-runtime`), one call per typed helper message; the rule-based reader is the fallback |
| Rate limiting | express-rate-limit (in memory; one server) |
| Logging | pino, JSON lines to stdout |
| Hosting | AWS, Mumbai: one EC2 server (t4g.small, arm64) running Docker Compose |
| HTTPS and routing | Caddy (certificates from Let's Encrypt) |
| DNS | Route 53 for `trellis.niteshkumar.xyz`; the parent domain stays at GoDaddy |
| Images | Amazon ECR |
| Secrets | AWS Systems Manager Parameter Store |
| Backups | Nightly `pg_dump` to Amazon S3, kept 14 days |

## Later (not v1)

| Part | Choice |
|---|---|
| Email (password reset codes, then reminders) | Amazon SES |
| CI / CD | GitHub Actions, signing in to AWS with OIDC |
| Infrastructure as code | Terraform |
| Error tracking and uptime | Sentry; CloudWatch alarms |
| Cache / limits across several servers | Redis, only if the backend ever runs as more than one instance |
| Other notification channels (design.md §15: reminders) | Telegram, Discord, WhatsApp |

## Dropped on 12 Nov 2026

| Was planned | Why it went |
|---|---|
| OpenRouter, Jev (TypeSafe AI), DeepSeek | Replaced by one GLM 5 call on Bedrock (design.md §16) |
| Cloudflare Tunnel | Trellis is hosted on AWS with its own address |
| Railway | Same |
| pgAdmin in production | It contradicted the privacy promise (design.md §11) |
