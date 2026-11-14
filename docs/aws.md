# Trellis on AWS

Where Trellis runs, which AWS services it uses and why, how each is set up, what the free
plan covers, what could cost money, and what happens when the six months end.

Read it with `docs/backend-design.md` (what the software needs) and `docs/design.md` (the
product). **Live since 14 Nov 2026** at https://trellis.niteshkumar.xyz (milestone M7). §9 lists every
resource and how each was made.

**Checked on 12 Nov 2026; the region and CloudFront changed on 14 Nov 2026** (everything
runs in Sydney, behind CloudFront; §2 and §4 say why). Prices and free-plan rules change. §11 says which facts were
read on AWS's own pages and which still need checking in the console.

**Contents:** 1 At a glance · 2 The account, and the check before any AWS work · 3 The
free plan · 4 The server and its address · 5 Bedrock · 6 Deploy and secrets · 7 Backups ·
8 Email later (SES) · 9 Setup steps · 10 When the six months end · 11 What is verified

---

## 1. At a glance

```
 Student in India
   │  https://trellis.niteshkumar.xyz
   ▼
 CloudFront edge near them (New Delhi, Mumbai, Chennai, ...)   ← pages and JS cached here
   │  cache miss, or any /api/* call: HTTPS to the origin, with a secret header
   ▼
 Region: ap-southeast-2 (Sydney)       origin.trellis.niteshkumar.xyz → Elastic IP
   ┌───────────────────────── EC2 t4g.small (2 GB, arm64, Ubuntu) ─────────────────────┐
   │  Docker Compose:  Caddy (HTTPS) → Next.js  and  Express API → Postgres, Neo4j     │
   │  Instance role: lets the server call Bedrock, S3, ECR and Parameter Store         │
   └──────┬───────────────────┬──────────────────────┬─────────────────┬───────────────┘
          ▼                   ▼                      ▼                 ▼
   Bedrock (GLM 5)     S3 (nightly backups)   ECR (the images)   Parameter Store (secrets)

 DNS: GoDaddy (niteshkumar.xyz) ─ NS for "trellis" ─► Route 53 zone trellis.niteshkumar.xyz
        trellis.niteshkumar.xyz         → alias to the CloudFront distribution
        origin.trellis.niteshkumar.xyz  → the Elastic IP
```

| Service | What it does for Trellis | About, per month |
|---|---|---|
| EC2 | The one server (`t4g.small`, $0.0212 an hour in Sydney) | $15.50 |
| EBS | Its 30 GB gp3 disk ($0.096 per GB) | $2.90 |
| Public IPv4 (Elastic IP) | A fixed address | $3.65 |
| Route 53 | DNS for the subdomain | $0.50 |
| CloudFront | Caches the site at edges in India; HTTPS for visitors | $0 (inside the always-free 1 TB and 10 million requests a month) |
| ACM | CloudFront's certificate | free |
| Bedrock | GLM 5 reads helper messages (about $0.0019 each) | $1 to $3 typical; capped at $15 |
| S3 | Database backups | under $0.10 |
| ECR | Stores the two Docker images | under $0.10 |
| IAM, Systems Manager, Budgets | Permissions, secrets, shell access, alerts | free |
| **Total** | | **about $24 to $27** |

(Prices from the AWS Price List API for Sydney, 14 Nov 2026.) Six months at that rate is
about **$145 to $160**: more than the $100 the plan gives at sign-up. The other $100 comes
from the console's activities (§3). **Earning it is not optional: do it in the first
week.** Without it the credits run out around the fourth month, and that closes the
account. If it can't be earned, the server has to shrink (`t4g.micro`, 1 GB, about $7.75 a
month, which means dropping Neo4j in production) or the site stops early.

**Not used, and why**

| Service | Why not |
|---|---|
| RDS (managed Postgres) | About $15 a month or more on its own. It would use most of the budget. Postgres runs in a container with nightly backups instead (§7) |
| Lightsail | Cheaper per GB of memory, but it is a simplified product with its own way of doing things, and it is not confirmed for the free plan. See §4 |
| Load balancer (ALB) | About $16 a month before any traffic. One server needs none |
| ECS, EKS, Lambda | More parts to learn and debug than one server needs |
| Secrets Manager | $0.40 per secret per month. Parameter Store does the same job free |
| NAT gateway | About $30 a month. The server sits in a public subnet and needs none. **Never create one** |
| AWS Organizations, IAM Identity Center | Joining an Organization **ends the free plan at once** (§3) |

## 2. The account, and the check before any AWS work

| | |
|---|---|
| Root email | trellis.niteshkumar@gmail.com |
| Account ID | `631603562964` (confirmed by the owner, 14 Nov 2026) |
| Created | 12 Nov 2026 |
| Plan | Free plan, ends **12 May 2027** at the latest |
| Region | **`ap-southeast-2` (Sydney), for everything.** Not a choice: on this free-plan account EC2 works only there (§3, "Regions"). CloudFront (§4) brings the pages close to students in India |
| CLI profile name | `trellis` |

### The check (do this every time)

This machine's AWS tools were signed in to a **different** account on 12 Nov 2026. Acting
on that account by mistake would create or change resources in the wrong place.

**Before any AWS command, tool or skill that reads or changes resources:**

1. Run `aws sts get-caller-identity --profile trellis`.
2. Compare the `Account` number with the Account ID in the table above.
3. If they differ, or the profile does not exist, **stop**. Sign in to the Trellis account
   first (the `signing-in-to-aws` skill sets up a profile). Do nothing on the other
   account, not even "just to look".
4. Pass `--profile trellis` (or set `AWS_PROFILE=trellis`) on **every** command. Never rely
   on the default profile: on this machine the default is the other account.

### How the account is set up

- **Root user:** turn on MFA, create no access keys, and use it only for billing and plan
  changes. Why: root can do everything, including closing the account, and cannot be
  limited.
- **An IAM user for the owner** (`nitesh`) with MFA and the `AdministratorAccess` policy,
  for daily work in the console and the CLI. Why not root for daily work: a mistake or a
  leaked session then has the widest possible reach.
- **CLI sign-in:** short-lived credentials under the `trellis` profile (the
  `signing-in-to-aws` skill). Avoid long-lived access keys on the laptop where possible.
- **An account alias** (for example `trellis-nitesh`), so the console's top bar shows
  which account you are in.
- **Where this falls short of production practice:** real teams use IAM Identity Center
  with one role per job and no IAM users at all. That needs AWS Organizations, which ends
  the free plan, so it waits until the account is on the paid plan.

## 3. The free plan

Read on AWS's own pages on 12 Nov 2026.

| Rule | What it means for Trellis |
|---|---|
| $100 in credits at sign-up, and up to $100 more for completing activities in the console's "Explore AWS" widget | Do the activities in week one. Some create resources (for example a database): delete what an activity created as soon as its credit shows, or it eats the credits |
| The plan ends after six months **or when the credits are used up, whichever comes first** | 12 May 2027 at the latest. Earlier if spending is high |
| When it ends, the account is closed and you lose access. AWS keeps the data for 90 days | Until about 10 Aug 2027, upgrading brings everything back. After that it is deleted |
| The free plan cannot be charged | The failure mode is **an outage, not a bill**. Cost control is uptime control |
| You can upgrade to the paid plan at any time. Unused credits carry over. You cannot go back | See §10 |
| Joining AWS Organizations, or setting up Control Tower, upgrades the account automatically | Do not do either |
| Some services are not available on the free plan | Check each one in the console before relying on it (§9, step 2) |
| "Always free" allowances still apply (for example 100 GB of data out per month) | Trellis's traffic is far below them |

### Regions: Sydney, because the free plan allows nothing else (checked 14 Nov 2026)

The account was created with Sydney as its region, and the free plan holds it there.
AWS's pages don't say so plainly (their FAQ only says that "multiple regions" come with
the paid plan's advanced features), so it was checked on the account itself:

| Call, as the `trellis` profile | Mumbai `ap-south-1` | Sydney `ap-southeast-2` | `us-east-1` |
|---|---|---|---|
| EC2: describe images, describe instance types | **denied** | allowed | **denied** |
| EC2: launch a `t4g.small` (dry run, creates nothing) | (can't even look up an image) | "would have succeeded" | not tried |
| SSM: read a public parameter | **denied** | allowed | not tried |
| Bedrock: a Converse call to GLM 5 | allowed | allowed | not tried |

Each denial says `explicit deny in a service control policy` from an AWS Organizations
policy in an organization that is AWS's, not ours: that is how the free plan applies its
limits. The global services Trellis needs all answered: CloudFront, ACM in `us-east-1`
(where CloudFront's certificates must live), Route 53, IAM, Budgets.

So **every regional resource is in Sydney**: the server, backups, images, secrets,
Bedrock, and later SES. The cost is distance: about 150 to 250 ms per round trip from
Delhi. CloudFront (§4) takes most of that away: pages and scripts come from an edge in
India, and the edge keeps a warm connection to Sydney for the API calls. Upgrading to the
paid plan (§10) would open Mumbai; moving then is a backup, a restore and a DNS change.

AWS's FAQ gives two different answers for when credits expire (six months in one place,
twelve in another). The **Credits** page in the Billing console shows the real date for
this account. Look there.

### What could use up the credits

| Risk | Guard |
|---|---|
| Someone hammers the helper and runs up Bedrock use | A daily message limit per student and a daily AI budget for the whole site (backend-design.md §5). At most $15 a month |
| A bigger server "just for now" | An 8 GB server is about $70 a month and would end the plan in under three months. Stay on t4g.small |
| Something left running from an "Explore AWS" activity | Delete it the same day |
| An Elastic IP not attached to anything | It costs the same $3.65. Release it if the server is gone |
| A NAT gateway or a load balancer created by a wizard | Never accept one. Check the bill the day after any setup work |
| Old Docker images piling up in ECR | A lifecycle rule keeps the last five |
| A leaked access key | There are none on the server (it uses a role). Keep none in the repo |

### Alerts

- **AWS Budgets** (free for plain budgets): one monthly cost budget of $30, emailing the
  owner at 50%, 80% and 100%.
- **Once a week**, open Billing → Credits and Billing → Bills. Compare credits left with
  months left. If the credits will run out before 12 May 2027, lower `AI_DAILY_BUDGET_USD`
  or decide early about upgrading (§10).

## 4. The server and its address

### EC2

| Setting | Value | Why |
|---|---|---|
| Type | `t4g.small`: 2 vCPUs, 2 GB memory, arm64 | On the free plan's list. arm64 is cheaper than the same size on x86, and matches an Apple Silicon laptop, so images built locally run unchanged |
| System | Ubuntu Server 24.04 LTS, arm64 | Long support, familiar, Docker's own packages, and the Systems Manager agent comes installed |
| Disk | 30 GB gp3, encrypted | Room for images, the databases and logs. Encryption costs nothing |
| Network | The default VPC, a public subnet, one Elastic IP | The simplest correct layout for one server |
| Firewall (security group) | In: TCP 443 **only from CloudFront** (the AWS-managed prefix list `com.amazonaws.global.cloudfront.origin-facing`); TCP 80 from anywhere. Nothing else. Out: everything | 443 carries the site, and only CloudFront may reach it, so nobody skips the cache and its protection. Port 80 is for Let's Encrypt's check (Caddy's certificate) and a redirect; it serves no pages. **No port 22**: there is no SSH (see below). The prefix list counts as about 55 rules of the group's 60 |
| Metadata | IMDSv2 required, **hop limit 2** | The API runs in a container. With the default limit of 1 it cannot reach the server's role credentials, and Bedrock calls fail with a confusing "no credentials" error |
| Protection | Termination protection on | One wrong click must not delete the server and its disk |
| Role | `trellis-ec2` (§6) | So no AWS keys are stored on the server |

**Shell access is through Systems Manager Session Manager**, not SSH. Why: no port open
to the internet, no key file to lose, and every session is tied to an AWS sign-in.
Alternative: SSH with a key pair, limited to your own IP. It works, but your IP changes
and the port still gets scanned.

### Memory: the plan for 2 GB

Five containers share 2 GB. Each gets a limit in the compose file, so that if memory runs
short the least important one is stopped, not the database.

| Container | Limit | Notes |
|---|---|---|
| Postgres | 384 MB | The one that must never be killed |
| Neo4j | 768 MB, **one core** | Heap 256 MB, page cache 64 MB. The graph is ~230 topics; it needs very little. **Changed on the first day:** with a 384 MB heap and a 128 MB cache, Java's memory outside the heap pushed it over 768 MB and it was killed in a loop; each restart took both cores and the API stopped answering. `cpus: 1.0` keeps a core for everything else. It settles at about 475 MB |
| API | 256 MB | |
| Next.js | 384 MB | |
| Caddy | 64 MB | |

Plus a **2 GB swap file** as a cushion, and **images are never built on the server**: a
Next.js build alone needs more than 1.5 GB (§6).

**Measured on the live server (14 Nov 2026):** about 1.1 GB used plus some swap, with
Neo4j at 475 MB, Postgres 48 MB, the API 44 MB, Next 55 MB and Caddy 33 MB.

**CPU credits: a `t4g` in "standard" mode starts with none.** It earns 24 an hour (one
credit is one core at 100% for a minute) and may run at 20% of its two cores without
spending any. The first day's setup, image pulls and Neo4j's restarts spent every credit
as it came in, so for its first hour the server was held at 20% and felt slow. It is
normal after a fresh server or a heavy deploy, and it passes as credits build up (to at
most 576). Look at the `CPUCreditBalance` metric in CloudWatch. "Unlimited" mode would
avoid the slowdown, but bills $0.04 per core-hour above the 20% average, with no cap: on
the free plan, a slow hour is better than a surprise.

**If it does not fit:** Neo4j is the one to move. The site already runs without it
(backend-design.md §2), so the fallback is to run Neo4j only in development. The second
fallback is a 4 GB server, but check the cost against the credits first.

### EC2 or Lightsail

Lightsail is a simplified product on top of the same servers: one flat monthly price that
bundles the server, disk, a fixed IP and a data allowance.

| | EC2 (chosen) | Lightsail |
|---|---|---|
| 2 GB | about $22 a month with disk and IP (Sydney) | $12, all in |
| 4 GB | about $37 | $24, all in |
| On the free plan | Yes, confirmed | Not confirmed on AWS's pages |
| Calling Bedrock and S3 | A role on the server; no keys stored | Stored access keys |
| What you learn | VPC, security groups, roles, EBS: what production work uses | Lightsail's own console |

**Why EC2:** the owner wants production practice, it is confirmed on the plan, and the
role means no secret key sits on the server. **What it costs us:** tighter memory for the
same money. If memory becomes the real problem and Lightsail turns out to be allowed, the
compose file moves over unchanged; only the credentials differ.

### DNS

The domain `niteshkumar.xyz` is registered at GoDaddy and stays there. Only the subdomain
moves:

1. In Route 53, create a **public hosted zone** named `trellis.niteshkumar.xyz`. Route 53
   gives it four name servers.
2. At GoDaddy, in the DNS records for `niteshkumar.xyz`, add **four NS records** with the
   host `trellis`, one for each of those name servers. Remove any existing `trellis`
   record (an A or CNAME from an earlier setup): a name cannot have NS records and other
   records together.
3. In the Route 53 zone, add:
   - an **A record** for `origin.trellis.niteshkumar.xyz` pointing at the Elastic IP (what
     CloudFront connects to; visitors never use it);
   - the **CNAME that ACM asks for** to validate CloudFront's certificate (§4 "HTTPS");
   - once the distribution exists, **A and AAAA alias records** for
     `trellis.niteshkumar.xyz` pointing at the CloudFront distribution (an alias, not a
     CNAME: a zone's own name can't be a CNAME, and alias lookups are free).
4. Check with `dig NS trellis.niteshkumar.xyz +short` (the four AWS name servers),
   `dig origin.trellis.niteshkumar.xyz +short` (the Elastic IP) and
   `dig trellis.niteshkumar.xyz +short` (CloudFront's addresses). It can take up to an hour.

| Option | Verdict |
|---|---|
| **Delegate only the subdomain to Route 53** | **Chosen.** The parent domain and anything else on it are untouched. Every Trellis record (the address now, the email records later) lives in AWS next to the rest of the setup. $0.50 a month |
| Keep everything at GoDaddy: one A record there | Free and the simplest. The fallback if Route 53 is not available on the free plan. The cost is that the SES records (about six) are added by hand at GoDaddy later |
| Move the whole domain's name servers to Route 53 | Rejected. It changes DNS for everything on `niteshkumar.xyz` to solve a problem only the subdomain has |

### HTTPS: two certificates, one on each hop

| Hop | Certificate | Who renews it |
|---|---|---|
| Visitor → CloudFront | ACM, for `trellis.niteshkumar.xyz`, **in `us-east-1`** (CloudFront only uses certificates from there), validated by the CNAME in Route 53 | ACM, by itself, as long as the CNAME stays |
| CloudFront → the server | Let's Encrypt, for `origin.trellis.niteshkumar.xyz`, got by Caddy | Caddy, by itself, through port 80 |

**Why HTTPS on the second hop too:** that hop crosses the internet from the edge to Sydney,
and it carries passwords, tokens and every student's words. CloudFront checks that the
origin's certificate is valid and matches `origin.trellis.niteshkumar.xyz`, so nobody in
between can pretend to be the server.

**The secret header.** CloudFront adds `X-Origin-Verify: <secret>` to every request it
sends to the server, and Caddy answers 403 to anything without it
(`deploy/Caddyfile`). The security group alone isn't enough: CloudFront's addresses are
shared by every CloudFront customer, so anyone could point their own distribution at our
server. The secret is `/trellis/prod/ORIGIN_VERIFY` in Parameter Store and the
distribution's origin settings; change both together.

**Alternatives turned down:** plain HTTP from CloudFront to the server (simpler, but
passwords travel unencrypted on the longest hop); the Let's Encrypt DNS check instead of
port 80 (no port 80 at all, but Caddy needs a plug-in built into a custom image and
permission to change Route 53 records).

### CloudFront: caching near India

One distribution, alias `trellis.niteshkumar.xyz`, origin
`origin.trellis.niteshkumar.xyz` (HTTPS only, TLS 1.2, the secret header above), HTTP/2
and HTTP/3, compression on, viewers redirected to HTTPS, **price class "all"** (the India
edges are not in the cheapest class; inside the free allowance the class costs nothing
extra).

| Path | Cache policy | Sent on to the server | Why |
|---|---|---|---|
| `/api/*` | `Managed-CachingDisabled` | `Managed-AllViewerExceptHostHeader`: every header, cookie and query string; all methods | Never cached: every answer is one student's. The edge still helps: HTTPS ends near the student, and the edge reuses a warm connection to Sydney |
| `/_next/static/*` | `Managed-CachingOptimized` | nothing extra | Scripts and styles, named by their content and marked `immutable` for a year by Next. Cached at the edge until they age out |
| everything else (pages) | **`trellis-pages`**, our own (below) | nothing extra | Every page's HTML is the same for every student (the app reads no cookies on the server; the theme and the sign-in happen in the browser), so it can be cached |

`trellis-pages`: minimum TTL 0, **default TTL 0** (an answer that doesn't say how long to
keep it is not kept), maximum one year; gzip and Brotli; no cookies; the query string
**`_rsc` only**; the headers **`rsc`, `next-router-state-tree`, `next-router-prefetch`,
`next-router-segment-prefetch`, `next-url`**.

**Why those headers (found 14 Nov 2026 by running the production image):** when a student
clicks a link, Next fetches a different answer from the same address, told apart only by
these headers. Next marks that with `Vary`, which CloudFront ignores. Next 16 also answers
`rsc: 1` on a plain address with a redirect to `?_rsc=…`. With a plain policy, whichever
answer reached the edge first would be served to everyone: the HTML to a link click, or
the redirect to a page load. Putting the headers and `_rsc` in the cache key keeps every
kind of answer apart. Other query strings (a reset link's `?token=`) stay out of the key,
so they are never stored at the edge.

**Every deploy clears the cache** (`deploy/release.sh`, step 5). Next marks pages
`s-maxage=31536000`, so the edges keep them for up to a year, and after a deploy an old
page would ask for scripts the new server no longer has. `/*` counts as one path; the first
1,000 paths a month are free.

**What it costs:** CloudFront's always-free allowance is 1 TB out and 10 million requests a
month (check Billing → Free Tier after the first week); Trellis will use a tiny part of
it. Traffic from the server to CloudFront is free. The free plan allowed creating the
distribution (14 Nov 2026). Had it not, the fallback was
the server alone, with Caddy's certificate for `trellis.niteshkumar.xyz` and
`TRUST_PROXY_HOPS=1`: everything works, about 0.2 s slower per request from India.

**Where it falls short of production practice:** no WAF in front (about $5 a month, plus
rules); the app's own rate limits are the defence. No CloudFront access logs (they would
be one more place where students' requests are stored).

## 5. Bedrock

| | |
|---|---|
| Model | GLM 5 by Z.AI, model id `zai.glm-5` |
| Region | **`ap-southeast-2` (Sydney)**, beside the server (14 Nov 2026; §3 "Regions"). It runs in-region; there is no cross-region profile for this model. GLM 5 is also active in Mumbai on this account (Bedrock is one of the few things the free plan allows there), but nothing gains from splitting the regions |
| API | Converse, with structured output (a JSON schema). It does not support tool calling on this API |
| Price in Sydney | $1.03 per million input tokens, $3.30 per million output tokens (standard tier; AWS Price List API, 14 Nov 2026). Mumbai is $1.20 and $3.84 |
| A helper message | **Measured** (23 real calls, 14 Nov 2026): about 1,680 tokens in and 40 to 120 out, **about $0.0019**, 2.3 seconds on average from India. No reasoning block |
| Access | **Confirmed by a real call on 14 Nov 2026.** Enabled on first use; no request form. Z.AI models are not sold through AWS Marketplace, which is where credit problems with third-party models usually come from |
| Permission | The server's role may call `bedrock:InvokeModel` on this one model only |
| Privacy | Bedrock does not use prompts to train models and does not share them with the model's maker. Re-read AWS's Bedrock data protection page before repeating this claim anywhere new |

**Structured output compiles the schema on first use** (up to about 90 seconds, then
cached for 24 hours). The server keeps it warm with a tiny call at start and every 3 hours,
logged in `ai_calls` as `warmup` (`backend-design.md` §5). These calls cost about $0.004 a
day.

**Why GLM 5 on Bedrock:** it runs inside the same AWS account, on the same credits, in the
same region as the users, with no second company and no second bill.

**Before turning the AI on, prove it with one real call** from the Trellis account: the
Bedrock console's playground, or the helper itself with `AI_PROVIDER=bedrock` on a laptop
(the checklist is in `backend-design.md` §5 "The first real call"). M5's code is built
and waits only for this. The owner reports GLM 5 is available on the
account's free plan; AWS's pages do not say either way. If the call is refused, set
`AI_PROVIDER=off`: the helper runs on its rules, and nothing else changes.

**Cheaper alternative if spend matters:** GLM 4.7 Flash costs $0.08 and $0.48 per million
tokens in Mumbai, about fifteen times less, but AWS marks it "Legacy" with an end date of
30 Mar 2027. Not worth building on.

**On a laptop:** the same code uses the `trellis` CLI profile. Development and tests run
with `AI_PROVIDER=off`, so no AWS access is needed to work on Trellis.

## 6. Deploy and secrets

### The server's role (`trellis-ec2`)

One IAM role, attached to the server, with only what the server needs:

| Permission | On | For |
|---|---|---|
| `AmazonSSMManagedInstanceCore` (AWS's managed policy) | | Session Manager shell and commands |
| `bedrock:InvokeModel` | the `zai.glm-5` model in `ap-southeast-2` | The helper |
| `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` | the backup bucket only | Backups and restores |
| `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchCheckLayerAvailability` | the two Trellis repositories | Pulling images |
| `ssm:GetParametersByPath` | `/trellis/prod/*` | Reading secrets at deploy (`deploy/env-from-ssm.sh`) |
| later: `ses:SendEmail` | the Trellis identity only | Password reset codes (§8) |

**Why a role and not access keys:** the server gets short-lived credentials that AWS
rotates by itself. There is no secret to leak, rotate or forget in a file.

### Images: Amazon ECR

- Two private repositories, `trellis/backend` and `trellis/frontend`, each with a
  lifecycle rule that keeps the last five images.
- Images are built **on the laptop** for `linux/arm64`, from the repo root, tagged with
  the git commit's short hash, and pushed.
- **Why ECR:** the server pulls with its role, so no registry password lives on it.
  Alternative: GitHub's registry, which needs a token on the server.
- **Why tag by commit and not `latest`:** you always know exactly what is running, and
  going back is "use the previous tag".

### Secrets: Parameter Store

Systems Manager Parameter Store, standard tier (free), under `/trellis/prod/`:

| Parameter | Type | Make it with |
|---|---|---|
| `JWT_SECRET` | SecureString | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | SecureString | `openssl rand -hex 24` (hex: it goes inside a URL, so no symbols) |
| `NEO4J_PASSWORD` | SecureString | `openssl rand -hex 24` |
| `ORIGIN_VERIFY` | SecureString | `openssl rand -hex 32`; the same value goes in the CloudFront origin's custom header |
| `GOOGLE_CLIENT_SECRET` | SecureString | Google Cloud Console |
| `GOOGLE_CLIENT_ID` | String | Google Cloud Console (not a secret) |

At deploy, `deploy/env-from-ssm.sh` on the server reads that path and writes
`/opt/trellis/.env` (owner-only permissions). Compose fills `docker-compose.yml` from it,
and each container gets only the values it lists. Plain settings that are not secret
(ports, the model, the region, limits) live in `deploy/docker-compose.yml`, in git.

- **Why:** secrets are in one audited place, not typed into a file by hand and forgotten.
- **Fallback:** write `.env.production` by hand on the server. Fine for week one; move to
  Parameter Store before anyone else gets access to the server.

### A deploy, start to finish

One command on the laptop, from the repo root, on a committed tree:
`./deploy/release.sh`. It prints each step:

1. The account check (§2); it stops on any other account.
2. Builds both images for `linux/arm64`, tagged with the commit's short hash.
3. Pushes them to ECR.
4. Runs `/opt/trellis/deploy.sh <tag>` on the server through Session Manager (no SSH).
   That script refreshes `.env` from Parameter Store, pulls, and runs `docker compose up
   -d`. Compose starts things in order: Postgres → the one-shot `migrate` → the API; Neo4j →
   the one-shot `seed-graph`; then Next and Caddy. The API does **not** wait for Neo4j.
   It then waits up to a minute for the API to report healthy.
5. Clears CloudFront's cache (§4).

Then check `https://trellis.niteshkumar.xyz/api/health`.

**Going back:** on the server, `sudo /opt/trellis/deploy.sh <previous tag>`, then clear
the cache (step 5 by hand: `aws cloudfront create-invalidation --distribution-id <id>
--paths "/*"`). Migrations only move forward,
so write each one to be safe for the previous version of the code too (add a column in one
release, start requiring it in the next).

**Where this falls short of production practice:**

- The deploy is run by hand, and there is a few seconds of downtime while containers
  restart. The next step is GitHub Actions building and deploying on every merge, signing
  in to AWS with OIDC (no stored keys).
- The resources are created by hand in the console (§9), not from code. The next step is
  Terraform, so the whole setup can be rebuilt in a new account with one command. Until
  then, **every resource is written down in the table in §9**.
- One server is one point of failure. If it dies, the site is down until it is rebuilt
  and the last backup restored. Acceptable for a few dozen users; not for more.

## 7. Backups

| | |
|---|---|
| What | Postgres: every account and every student's record |
| How | `pg_dump` in custom format to a file, checked with `pg_restore --list`, then uploaded by the server's role (`deploy/backup.sh`) |
| When | Every night at 02:30 India time (21:00 UTC), by `trellis-backup.timer` on the server |
| Where | A private S3 bucket in `ap-southeast-2`: Block Public Access on, encrypted, versioning **off** |
| How long | A lifecycle rule deletes each backup after **14 days** |
| Not backed up | Neo4j (rebuilt from the files in git by the seed) and Caddy's certificates (re-issued) |

- **Why 14 days and versioning off:** design.md promises that "Delete everything" is gone
  from backups within 14 days. Versioning would quietly keep deleted backups.
- **What you can lose:** up to 24 hours of check-ins if the disk dies between backups.
  A managed database with point-in-time recovery would cut that to minutes; it does not
  fit the budget (§1).
- **A backup you have never restored is a guess.** `deploy/backup.sh` dumps to a file,
  checks that `pg_restore` can read it, then uploads it; `deploy/restore-test.sh` restores
  the newest backup into a scratch database (`restore_check`), prints row counts beside the
  live ones, and drops it. Both were run on 14 Nov 2026 (`sudo /opt/trellis/<script>`).
  The timer's log: `journalctl -u trellis-backup`; its next run: `systemctl list-timers`.
- **Restoring for real:** stop the API, restore into the database with `pg_restore
  --clean --if-exists`, start the API. Anything a student deleted after the backup was
  taken comes back, so **after a restore, repeat any account deletions** made since
  (the `DELETE /api/me` requests are in the logs by user id).
- **No automatic alert yet** when a backup fails. In week one, check the bucket by hand
  during the weekly billing check. Add an alarm on "no new object in 36 hours" later.

## 8. Email later (SES)

Not in v1. A forgotten password is handled by the admin with a one-time link
(backend-design.md §4). This section is what makes adding email a small job later.

**What is already in place for it**

- The DNS zone is in Route 53, so the email records are a few clicks, in AWS.
- The server uses a role, so sending needs one more permission and no new secret.
- The database has `password_resets` and `users.email_verified_at`.
- The backend reserves `src/mail/mailer.ts` as the only place that will send email.

**What adding it involves**

1. Create a **domain identity** for `trellis.niteshkumar.xyz` in SES, in `ap-southeast-2`, with
   Easy DKIM. Add the three CNAME records it shows to the Route 53 zone.
2. Set a **custom MAIL FROM** domain (`mail.trellis.niteshkumar.xyz`): one MX and one SPF
   TXT record. Add a **DMARC** TXT record at `_dmarc.trellis.niteshkumar.xyz`, starting
   with `p=none`.
3. **Ask to leave the sandbox.** A new SES account can send only to addresses you have
   verified. Request production access and describe the use plainly: password reset codes
   for a study app, sent only when a user asks. Allow a day or more for the answer.
4. Add `ses:SendEmail` to the server's role, limited to this identity and to the sender
   `no-reply@trellis.niteshkumar.xyz`.
5. Turn on the account-level suppression list, so addresses that bounce are not mailed
   again.
6. In the backend: `POST /api/auth/forgot-password` emails a six-digit code that expires
   in ten minutes and allows five attempts.

**Cost:** about $0.10 per thousand emails. Trellis would send a handful a week.

**Unknown:** whether SES is usable on the free plan. AWS's SES pricing page says the free
credits can be applied to it, which suggests yes. Check in the console when the time comes.

## 9. Setup steps (M7)

Do them in this order. Each step says why it comes where it does. **All regional steps are
in `ap-southeast-2`.** **All done on 14 Nov 2026** except the owner's
console tasks in step 1 (MFA, the IAM user, the alias). The DNS zone was created first
of all, so the GoDaddy change could spread while the rest was built.

1. ✅ **Sign in to the right account** and run the check in §2. The Account ID is in §2.
   Still to do by hand in the console: MFA for root, the IAM user, the account alias.
2. ✅ **Find out what the plan allows, before building on it** (§3 "Regions"): EC2 only in
   Sydney; Route 53, ECR, Parameter Store, ACM in `us-east-1`, CloudFront (listing),
   Budgets and IAM all answer; GLM 5 works. Not yet proven: that creating each one is
   allowed, which each step below finds out. Fallbacks if one is refused:

   | Refused | Fallback |
   |---|---|
   | CloudFront distribution | The server alone (§4 "CloudFront", last paragraph) |
   | Route 53 | Records at GoDaddy: an A for `origin.trellis`, a CNAME for `trellis` to CloudFront, the ACM CNAME |
   | ECR | Build on the laptop, `docker save`, copy through S3, `docker load` on the server |
   | Parameter Store | A hand-written `/opt/trellis/.env` (§6) |

3. ✅ **Budgets and credits.** Create the $30 budget with its three alerts, **counting
   spending before credits** (`IncludeCredit: false`): by default a budget subtracts
   credits, the free plan's credits cover everything, and the alerts would never fire. Do the "Explore
   AWS" activities and delete what they created.
4. ✅ **The backup bucket**, with Block Public Access, encryption and the 14-day rule.
5. ✅ **The ECR repositories** `trellis/backend` and `trellis/frontend`, each keeping the
   last five images. Tags are **immutable**: a tag is a commit, so it can never be pushed
   twice with different contents.
6. ✅ **The role** `trellis-ec2` with the permissions in §6 (an inline policy,
   `trellis-server`, plus `AmazonSSMManagedInstanceCore`).
7. ✅ **The security group** `trellis-web` (443 from the CloudFront prefix list, 80 from
   anywhere), then **the server** with every setting in §4, then **the Elastic IP**. The
   server also gets **CPU credits "standard"**: a `t4g` defaults to "unlimited", which
   bills extra for long bursts; standard slows the CPU down instead and never costs more.
8. ✅ **Prepare the server**: done by `deploy/server-setup.sh`, given to EC2 as user data,
   so it runs at first boot (swap, Docker and compose from Ubuntu's packages, the AWS CLI,
   security updates, `/opt/trellis`). Its log: `/var/log/cloud-init-output.log`.
   `release.sh` copies the rest of `deploy/` in on every release.
9. ✅ **DNS, part 1** (§4). **At GoDaddy, the four NS records go in the "DNS Records" tab
   (Add New Record → Type NS → Name `trellis`), NOT in the "Nameservers" tab.** On the first
   try the Nameservers tab was used, which handed the WHOLE domain to the Trellis zone; the
   main domain started answering `REFUSED` and was put back. Then: the Route 53 zone, the NS records at GoDaddy, the A record for
   `origin.trellis.niteshkumar.xyz`. Wait until `dig` shows the Elastic IP. Why before the
   first start: Caddy asks for its certificate the moment it starts, and that fails if the
   name does not point here yet.
10. ✅ **Secrets** into Parameter Store (§6); the Google values are the development OAuth
    client's. Add the production redirect URI to the Google
    OAuth client (backend-design.md §4).
11. ✅ **First deploy**: `./deploy/release.sh` (step 5 fails until the distribution exists;
    that's expected the first time). Watch `docker compose logs caddy` until the
    certificate for `origin.trellis.niteshkumar.xyz` is issued.
12. ✅ **The certificate** in ACM, in `us-east-1`, for `trellis.niteshkumar.xyz`; add its CNAME
    to Route 53 and wait for "Issued".
13. ✅ **The CloudFront distribution** (§4): the `trellis-pages` cache policy,
    then the distribution from `deploy/cloudfront.json` with the placeholder replaced by
    `/trellis/prod/ORIGIN_VERIFY` (never commit the real value):
    `aws cloudfront create-distribution --distribution-config file://<filled copy>`. Then **DNS,
    part 2**: the A and AAAA alias records for `trellis.niteshkumar.xyz`.
14. ✅ **Backups:** `release.sh` installs the nightly timer; `sudo /opt/trellis/backup.sh`
    once by hand, then `sudo /opt/trellis/restore-test.sh` (§7). Done on an empty database;
    run the restore test again after the smoke test, with real rows.
15. ✅ **Smoke test** on the real address (14 Nov 2026: everything passed except Google
    sign-in, which needs a person in a browser; pages came from `DEL51`, New Delhi):
    - sign up with a password; sign up with Google; log out and back in;
    - pick a subject, sort, see the map; click between pages (the cached ones too);
    - take a prompt, come back, answer "how did it go?";
    - type a message to the helper, save the card, undo it;
    - make a reset link and use it;
    - export; delete the account; confirm the rows are gone;
    - stop the Neo4j container and confirm the site still works;
    - `curl -I https://origin.trellis.niteshkumar.xyz` from the laptop is refused
      (only CloudFront may connect);
    - a second page load shows `x-cache: Hit from cloudfront` and an Indian edge in
      `x-amz-cf-pop` (for example `DEL54-…`).

### Resources (fill in as each is created)

| Resource | Name or id |
|---|---|
| Account ID | `631603562964` |
| IAM user | `nitesh` |
| Budget | `trellis-monthly` ($30, alerts at 50/80/100% to the root email) |
| S3 bucket | `trellis-backups-631603562964` |
| Role and instance profile | `trellis-ec2` |
| Security group | `trellis-web` · id: `sg-004b06c79d5531ae4` |
| EC2 instance | `trellis-prod` · id: `i-03c628dea103abc86` (Ubuntu 24.04 arm64, `ap-southeast-2a`) |
| Elastic IP | `52.64.199.196` · `eipalloc-00a97586de444633f` |
| Route 53 hosted zone | `trellis.niteshkumar.xyz` · id: `Z022179811JM26X6WIBM` · name servers `ns-1371.awsdns-43.org`, `ns-1864.awsdns-41.co.uk`, `ns-368.awsdns-46.com`, `ns-678.awsdns-20.net` |
| ACM certificate (`us-east-1`) | `trellis.niteshkumar.xyz` · arn: `arn:aws:acm:us-east-1:631603562964:certificate/746e1d6b-ca03-4576-b711-d15a50a9f7c9` |
| CloudFront cache policy | `trellis-pages` · id: `a4e04d62-657f-44a3-9b00-b2192c7f4a00` |
| CloudFront distribution | alias `trellis.niteshkumar.xyz` · id: `E6RLEBVGF9SWB` · `d168ezssqcvc0r.cloudfront.net` |
| Route 53 records | `trellis` A + AAAA alias → CloudFront; `origin.trellis` A → `52.64.199.196`; the ACM CNAME |
| ECR repositories | `trellis/backend`, `trellis/frontend` (immutable tags) |
| Parameter Store path | `/trellis/prod/` (6 parameters, §6) |
| Backup timer | `trellis-backup.timer` on the server, 21:00 UTC |

## 10. When the six months end

| Date | What happens |
|---|---|
| 12 Nov 2026 | Account created |
| **15 Apr 2027** | **Decide**: upgrade, or stop |
| 12 May 2027 | The free plan ends, or earlier if the credits run out. The account closes and the site goes down |
| about 10 Aug 2027 | AWS deletes the account and its data |

**Option A: upgrade to the paid plan** (Billing console → Upgrade plan), before 12 May.

- Everything keeps running with no interruption, and unused credits carry over.
- From then on real money can be charged: about $24 to $27 a month at today's size.
- Before upgrading: confirm the budget alerts work, and check a card is on the account.
- After upgrading you can set up IAM Identity Center and Terraform (§2, §6), and there is
  no going back to the free plan.

**Option B: stop.**

1. Tell the users, with a date. Remind them of Export in Settings.
2. Download the last backup from S3 to somewhere you control.
3. Delete the resources in §9's table, newest first (CloudFront must be disabled before it can be deleted), and release the Elastic IP.
4. Remove the four NS records at GoDaddy.

**Option C: move** to another host. The whole product is a compose file plus a Postgres
dump; only Bedrock (§5) and the backup destination (§7) are tied to AWS, and both sit
behind one small module each.

If the weekly check (§3) shows credits running out before May, the same decision simply
arrives sooner.

## 11. What is verified, and what is not

**Read on AWS's own pages, 12 Nov 2026**

- The free plan: $100 plus up to $100 in credits; ends at six months or when credits run
  out; the account then closes and data is kept 90 days; upgrading keeps the credits and
  cannot be undone; joining AWS Organizations upgrades automatically; no charges while on
  the free plan.
- EC2 types on the free plan for accounts created after 15 Jul 2025: t3.micro, t3.small,
  t4g.micro, t4g.small, c7i-flex.large, m7i-flex.large.
- A public IPv4 address costs $0.005 an hour. Route 53: $0.50 per zone per month.
- GLM 5 on Bedrock: the model id, in-region in Mumbai, structured output supported, the
  Mumbai prices (from a summary of the pricing page, not the page's raw text), and that
  Z.AI models are not sold through AWS Marketplace.
- 14 Nov 2026, checked on the account itself: the free plan's service control policy
  denies EC2 outside `ap-southeast-2` (Mumbai and `us-east-1` tried); CloudFront, ACM in
  `us-east-1`, Route 53, ECR, Parameter Store, SES, Budgets and IAM answer read calls
  (§3 "Regions"). Next 16's caching headers and its `rsc` redirect, by running the
  production image (§4 "CloudFront").
- 14 Nov 2026, checked on the account itself: GLM 5 is ACTIVE in both `ap-south-1` and
  `ap-southeast-2`; the Sydney prices come from the AWS Price List API. Structured output
  is NOT strictly enforced for GLM 5 (a reply had `"help": []` against the schema), so the
  backend's own check is what counts (`backend-design.md` §5).
- Lightsail's bundle prices, and that Mumbai bundles include half the data allowance.

**Not verified. Check in the console (§9, step 2)**

- Whether Route 53, ECR, Parameter Store and SES are usable on the free plan.
- Whether GLM 5 calls are covered by free-plan credits. The owner reports it is available.
- ~~The exact EC2 and EBS prices.~~ Read from the AWS Price List API for Sydney on
  14 Nov 2026: `t4g.small` $0.0212 an hour, gp3 $0.096 per GB-month (§1).
- Whether a free-plan account can launch a server type that is not on the list above.
- That Lightsail servers cannot take an IAM role. This is from general knowledge, not
  from a page read on the day.
- That Bedrock does not train on prompts or share them with the model's maker. This is
  AWS's long-standing statement, but it was not re-read on the day. Read the Bedrock data
  protection page before the privacy wording in design.md §11 goes live.
- Which date the credits expire on: AWS's FAQ says six months in one answer and twelve in
  another.

**Sources**

- [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- [AWS account plans](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
- [EC2 free tier usage](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)
- [VPC pricing (public IPv4)](https://aws.amazon.com/vpc/pricing/)
- [Route 53 pricing](https://aws.amazon.com/route53/pricing/)
- [SES pricing](https://aws.amazon.com/ses/pricing/)
- [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)
- [GLM 5 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-5.md)
- [Bedrock model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [Bedrock structured output](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html)
- [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
