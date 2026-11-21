# Trellis docs: start here

Every doc in this folder, what question it answers, and the order to read them in. Each
doc makes sense on its own; this page only tells you which one to open.

Last checked against the code: **17 Nov 2026** (production runs the merge of `chore/drop-graph-database`, released 21 Nov 2026, live at
https://trellis.niteshkumar.xyz).

## If you are new: read in this order

1. **[`codebase.md`](codebase.md)**: a tour of the whole codebase. What Trellis is, every
   folder, how a request flows, sign-in, the AI, the data, the conventions, and where to
   make common changes. About an hour. After it you can find your way anywhere.
2. **[`design.md`](design.md)**: the product, **the source of truth**. Read §1 to §9 (what
   it does and why), skim §14 (the v1 boundary) and §16 (every decision and its reason).
3. The doc for the part you'll work on:
   - backend → [`backend-design.md`](backend-design.md)
   - frontend → [`frontend.md`](frontend.md)
   - tests → [`testing.md`](testing.md)
   - hosting and AWS → [`aws.md`](aws.md) (**run its §2 account check before any AWS
     action**)
   - a new subject → [`subject-blueprint.md`](subject-blueprint.md)
4. [`../CLAUDE.md`](../CLAUDE.md): the owner's rules for every coding session and "where
   things stand". It's written for AI coding sessions, but it's the shortest summary of the
   rules and the current state.

## Which doc answers what

| Question | Doc |
|---|---|
| What is Trellis for, and what will it never do? | `design.md` §1 to §3, §14 |
| How does a student use it, step by step? | `design.md` §5 |
| How are statuses, "next", "skip" and "why stuck" decided? | `design.md` §6 and §8; `backend-design.md` §7; the code is `shared/graph.ts` |
| How does the helper chat behave? | `design.md` §7; `backend-design.md` §5; `frontend.md` §8 |
| How is a prompt built? | `design.md` §9; `backend-design.md` §6; `shared/prompt.ts` |
| Where does AI run, what does it cost, and what stops it overspending? | `design.md` §12; `backend-design.md` §5 ("The model call", "Cost limits"); `aws.md` §5 |
| How does sign-in work (passwords, Google, tokens, resets)? | `backend-design.md` §4; `codebase.md` §9 |
| What tables are there? | `backend-design.md` §3; the files in `backend/src/db/migrations/` are the truth |
| What does each API route take and return? | `backend-design.md` §4 and §5 |
| What shape is the data the frontend uses? | `shared/types.ts`; `frontend.md` §12 |
| How are the screens built, and the map drawn? | `frontend.md` §3 to §11 |
| How do I run, write or debug a test? | `testing.md` |
| What tools and versions are used? | `tech-stack.md` |
| Where does it run, how is it released, how are backups made? | `aws.md` §4, §6, §7, §9 |
| How do I add a subject? | `subject-blueprint.md`; one record per subject in `subjects/` |
| What's known to be missing or weak? | `backend-design.md` §11 "Known gaps" and §12; `testing.md` §12 |
| What was built when? | `backend-design.md` §10 and §11; `git log` |

## Every file here

| File | What it is |
|---|---|
| `README.md` | This page |
| `codebase.md` | The whole codebase for someone new |
| `design.md` | The product (v7): ideas, flows, the map, the helper, stuck, prompts, promises, AI, the v1 boundary, decisions |
| `backend-design.md` | The backend with its reasons: architecture, data model, API and auth, the helper and the AI, prompts, derived logic, config, security, logging, tests, the build plan and progress |
| `frontend.md` | The frontend: look and rules, screens, code map, the map's layout and canvas, the helper and prompts, the store, the API client, the data contract |
| `testing.md` | The backend's two test suites, each technique with real files, how to write a new test, how to debug one, and the gaps |
| `aws.md` | Hosting: the account check, the free plan, the server, CloudFront, Bedrock, deploy, secrets, backups, every resource id |
| `tech-stack.md` | The tools in one table |
| `subject-blueprint.md` | The procedure for adding a subject from official sources, with review gates |
| `subjects/react-native.md`, `subjects/mongodb.md` | The design record of each subject built with the blueprint: sources, inventory, decisions, review findings |

## Keeping the docs true

The owner's rule: **docs are for people and for sessions that start with no context**, so
after every change the docs describe the code as it is. When you change code, change the
doc that describes it in the same commit. If a doc and the code disagree, fix one of them
the same day, and say which one was wrong.
