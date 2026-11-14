# Trellis on AWS

Where Trellis runs, which AWS services it uses and why, how each is set up, what the free
plan covers, what could cost money, and what happens when the six months end.

Read it with `docs/backend-design.md` (what the software needs) and `docs/design.md` (the
product). Nothing in this file has been created yet: it is the plan for milestone M7.

**Checked on 12 Nov 2026.** Prices and free-plan rules change. §11 says which facts were
read on AWS's own pages and which still need checking in the console.

**Contents:** 1 At a glance · 2 The account, and the check before any AWS work · 3 The
free plan · 4 The server and its address · 5 Bedrock · 6 Deploy and secrets · 7 Backups ·
8 Email later (SES) · 9 Setup steps · 10 When the six months end · 11 What is verified

---

## 1. At a glance

```
 GoDaddy (niteshkumar.xyz)
   └─ NS records for "trellis" ──► Route 53 zone: trellis.niteshkumar.xyz
                                      └─ A record ──► Elastic IP
                                                         │
   Region: ap-south-1 (Mumbai)                           ▼
   ┌───────────────────────── EC2 t4g.small (2 GB, arm64, Ubuntu) ─────────────────────┐
   │  Docker Compose:  Caddy (HTTPS) → Next.js  and  Express API → Postgres, Neo4j     │
   │  Instance role: lets the server call Bedrock, S3, ECR and Parameter Store         │
   └──────┬───────────────────┬──────────────────────┬─────────────────┬───────────────┘
          ▼                   ▼                      ▼                 ▼
   Bedrock (GLM 5)     S3 (nightly backups)   ECR (the images)   Parameter Store (secrets)
```

| Service | What it does for Trellis | About, per month |
|---|---|---|
| EC2 | The one server | $8 to $12 |
| EBS | Its 30 GB disk | $2.70 |
| Public IPv4 (Elastic IP) | A fixed address | $3.65 |
| Route 53 | DNS for the subdomain | $0.50 |
| Bedrock | GLM 5 reads helper messages | $1 to $3 typical; capped at $15 |
| S3 | Database backups | under $0.10 |
| ECR | Stores the two Docker images | under $0.10 |
| IAM, Systems Manager, Budgets | Permissions, secrets, shell access, alerts | free |
| **Total** | | **about $17 to $22** |

Six months at that rate is about **$100 to $130**. The plan gives $100 at sign-up and up to
$100 more for activities (§3). **Earn the extra $100 in the first week**; without it the
credits can run out before the six months do, and that closes the account.

**Not used, and why**

| Service | Why not |
|---|---|
| RDS (managed Postgres) | About $15 a month or more on its own. It would use most of the budget. Postgres runs in a container with nightly backups instead (§7) |
| Lightsail | Cheaper per GB of memory, but it is a simplified product with its own way of doing things, and it is not confirmed for the free plan. See §4 |
| Load balancer (ALB) | About $16 a month before any traffic. One server needs none |
| CloudFront and ACM | ACM certificates cannot be installed on a plain server; they need a load balancer or CloudFront. Caddy gets free certificates itself |
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
| Region | `ap-south-1` (Mumbai), for everything except Bedrock, which is in `ap-southeast-2` (Sydney) (§5). **Open (14 Nov 2026):** the owner wants Bedrock "close to the hosting"; whether the server moves to Sydney too is to be settled before M7 |
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
| Firewall (security group) | In: TCP 80 and 443 from anywhere. Nothing else. Out: everything | Port 80 is needed to get the HTTPS certificate and to redirect to 443. **No port 22**: there is no SSH (see below) |
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
| Neo4j | 768 MB | Heap 384 MB, page cache 128 MB (`NEO4J_server_memory_heap_max__size=384m`, `NEO4J_server_memory_pagecache_size=128m`). The graph is 227 topics; it needs very little |
| API | 256 MB | |
| Next.js | 384 MB | |
| Caddy | 64 MB | |

Plus a **2 GB swap file** as a cushion, and **images are never built on the server**: a
Next.js build alone needs more than 1.5 GB (§6).

**If it does not fit:** Neo4j is the one to move. The site already runs without it
(backend-design.md §2), so the fallback is to run Neo4j only in development. The second
fallback is a 4 GB server, but check the cost against the credits first.

### EC2 or Lightsail

Lightsail is a simplified product on top of the same servers: one flat monthly price that
bundles the server, disk, a fixed IP and a data allowance.

| | EC2 (chosen) | Lightsail |
|---|---|---|
| 2 GB | about $15 to $18 a month with disk and IP | $12, all in |
| 4 GB | about $31 | $24, all in |
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
3. In the Route 53 zone, add an **A record** for `trellis.niteshkumar.xyz` pointing at the
   Elastic IP.
4. Check with `dig NS trellis.niteshkumar.xyz +short` (the four AWS name servers) and
   `dig trellis.niteshkumar.xyz +short` (the Elastic IP). It can take up to an hour.

| Option | Verdict |
|---|---|
| **Delegate only the subdomain to Route 53** | **Chosen.** The parent domain and anything else on it are untouched. Every Trellis record (the address now, the email records later) lives in AWS next to the rest of the setup. $0.50 a month |
| Keep everything at GoDaddy: one A record there | Free and the simplest. The fallback if Route 53 is not available on the free plan. The cost is that the SES records (about six) are added by hand at GoDaddy later |
| Move the whole domain's name servers to Route 53 | Rejected. It changes DNS for everything on `niteshkumar.xyz` to solve a problem only the subdomain has |

### HTTPS

**Caddy** asks Let's Encrypt for a certificate the first time it starts and renews it by
itself. It needs ports 80 and 443 open and the DNS record pointing at the server first.
Its data folder is a Docker volume, so certificates survive restarts (losing them on every
restart would hit Let's Encrypt's weekly limit).

The whole Caddy configuration is a few lines:

```
trellis.niteshkumar.xyz {
    encode zstd gzip
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
```

**Alternative:** Nginx with certbot. It works, with more configuration and a renewal job
to keep alive. Caddy was chosen because there is nothing to maintain.

## 5. Bedrock

| | |
|---|---|
| Model | GLM 5 by Z.AI, model id `zai.glm-5` |
| Region | **`ap-southeast-2` (Sydney)**, on the owner's call (14 Nov 2026): close to the hosting. It runs in-region; there is no cross-region profile for this model. GLM 5 is also active in Mumbai on this account, so switching back is `BEDROCK_REGION=ap-south-1` plus that region's prices |
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
| `ssm:GetParametersByPath` | `/trellis/prod/*` | Reading secrets at deploy |
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

Systems Manager Parameter Store, standard tier (free), as `SecureString` under
`/trellis/prod/`: `JWT_SECRET`, `POSTGRES_PASSWORD`, `NEO4J_PASSWORD`,
`GOOGLE_CLIENT_SECRET`.

At deploy, a short script on the server reads that path and writes
`/opt/trellis/.env.production` (owner-only permissions). Plain settings that are not
secret (ports, model id, limits) live in the compose file, in git.

- **Why:** secrets are in one audited place, not typed into a file by hand and forgotten.
- **Fallback:** write `.env.production` by hand on the server. Fine for week one; move to
  Parameter Store before anyone else gets access to the server.

### A deploy, start to finish

1. On the laptop: build both images for arm64, push to ECR.
2. On the server (through Session Manager): set the new tag, refresh the env file, then
   `docker compose pull` and `docker compose up -d`.
3. Compose starts things in order: Postgres → the one-shot `migrate` → the API; Neo4j →
   the one-shot `seed-graph`; then Next and Caddy. The API does **not** wait for Neo4j.
4. Check `https://trellis.niteshkumar.xyz/api/health`.

**Going back:** set the previous tag and run `up -d` again. Migrations only move forward,
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
| How | `pg_dump` in custom format, streamed straight to S3 by the server's role |
| When | Every night at 02:30 India time, by a timer on the server |
| Where | A private S3 bucket in `ap-south-1`: Block Public Access on, encrypted, versioning **off** |
| How long | A lifecycle rule deletes each backup after **14 days** |
| Not backed up | Neo4j (rebuilt from the files in git by the seed) and Caddy's certificates (re-issued) |

- **Why 14 days and versioning off:** design.md promises that "Delete everything" is gone
  from backups within 14 days. Versioning would quietly keep deleted backups.
- **What you can lose:** up to 24 hours of check-ins if the disk dies between backups.
  A managed database with point-in-time recovery would cut that to minutes; it does not
  fit the budget (§1).
- **A backup you have never restored is a guess.** As part of M7.3, restore last night's
  backup into a scratch database on the server, check the row counts, and write the exact
  commands that worked into this section.
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

1. Create a **domain identity** for `trellis.niteshkumar.xyz` in SES, in `ap-south-1`, with
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

Do them in this order. Each step says why it comes where it does. **Nothing here has been
done yet.**

1. **Sign in to the right account** and run the check in §2. Write the Account ID into §2.
   Turn on MFA for root, create the IAM user, set the account alias, and set the region to
   Mumbai.
2. **Find out what the plan allows, before building on it.** Try to: create a Route 53
   hosted zone, create an ECR repository, open Parameter Store, and make one GLM 5 call in
   the Bedrock playground. For each one that is refused, use its fallback:

   | Refused | Fallback |
   |---|---|
   | Route 53 | An A record at GoDaddy (§4) |
   | ECR | Build on the laptop, `docker save`, copy through S3, `docker load` on the server |
   | Parameter Store | A hand-written env file (§6) |
   | GLM 5 | `AI_PROVIDER=off` (§5) |

3. **Budgets and credits.** Create the $30 budget with its three alerts. Do the "Explore
   AWS" activities and delete what they created.
4. **The backup bucket**, with Block Public Access, encryption and the 14-day rule.
5. **The role** `trellis-ec2` with the permissions in §6.
6. **The security group**, then **the server** with every setting in §4, then **the
   Elastic IP**. Why now: DNS needs the address.
7. **Prepare the server** through Session Manager: the swap file, Docker with the compose
   plugin, the AWS CLI, automatic security updates, and the folder `/opt/trellis` holding
   the compose file and the Caddyfile.
8. **DNS** (§4). Wait until `dig` shows the Elastic IP. Why before the first start: Caddy
   asks for its certificate the moment it starts, and that fails if the name does not
   point here yet.
9. **Secrets** into Parameter Store. Add the production redirect URI to the Google OAuth
   client (backend-design.md §4).
10. **First deploy** (§6). Watch Caddy's log until the certificate is issued.
11. **Backups:** install the nightly timer, run it once by hand, and do the test restore
    (§7).
12. **Smoke test** on the real address:
    - sign up with a password; sign up with Google; log out and back in;
    - pick a subject, sort, see the map;
    - take a prompt, come back, answer "how did it go?";
    - type a message to the helper, save the card, undo it;
    - make a reset link and use it;
    - export; delete the account; confirm the rows are gone;
    - stop the Neo4j container and confirm the site still works.

### Resources (fill in as each is created)

| Resource | Name or id |
|---|---|
| Account ID | |
| IAM user | `nitesh` |
| Budget | `trellis-monthly` |
| S3 bucket | `trellis-backups-<account id>` |
| Role and instance profile | `trellis-ec2` |
| Security group | `trellis-web` · id: |
| EC2 instance | `trellis-prod` · id: |
| Elastic IP | |
| Route 53 hosted zone | `trellis.niteshkumar.xyz` · id: |
| ECR repositories | `trellis/backend`, `trellis/frontend` |
| Parameter Store path | `/trellis/prod/` |

## 10. When the six months end

| Date | What happens |
|---|---|
| 12 Nov 2026 | Account created |
| **15 Apr 2027** | **Decide**: upgrade, or stop |
| 12 May 2027 | The free plan ends, or earlier if the credits run out. The account closes and the site goes down |
| about 10 Aug 2027 | AWS deletes the account and its data |

**Option A: upgrade to the paid plan** (Billing console → Upgrade plan), before 12 May.

- Everything keeps running with no interruption, and unused credits carry over.
- From then on real money can be charged: about $17 to $22 a month at today's size.
- Before upgrading: confirm the budget alerts work, and check a card is on the account.
- After upgrading you can set up IAM Identity Center and Terraform (§2, §6), and there is
  no going back to the free plan.

**Option B: stop.**

1. Tell the users, with a date. Remind them of Export in Settings.
2. Download the last backup from S3 to somewhere you control.
3. Delete the resources in §9's table, newest first, and release the Elastic IP.
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
- 14 Nov 2026, checked on the account itself: GLM 5 is ACTIVE in both `ap-south-1` and
  `ap-southeast-2`; the Sydney prices come from the AWS Price List API. Structured output
  is NOT strictly enforced for GLM 5 (a reply had `"help": []` against the schema), so the
  backend's own check is what counts (`backend-design.md` §5).
- Lightsail's bundle prices, and that Mumbai bundles include half the data allowance.

**Not verified. Check in the console (§9, step 2)**

- Whether Route 53, ECR, Parameter Store and SES are usable on the free plan.
- Whether GLM 5 calls are covered by free-plan credits. The owner reports it is available.
- The exact EC2 and EBS prices in Mumbai. The $8 to $12 for t4g.small is an estimate; the
  one page read for Mumbai appeared to show US prices. Use the AWS pricing calculator.
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
