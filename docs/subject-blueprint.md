# Adding a subject: the blueprint

How to add a new subject to Trellis (MongoDB, Kubernetes, linear algebra, anything), from
nothing to a reviewed map in production. Written for the owner and for a Claude session
that starts with no context. Read it all once before starting; then work through §4 stage
by stage.

**Status:** rewritten 14 Nov 2026 (owner's decisions: official sources split by job,
roadmap.sh dropped for new subjects, a review panel of agents after every draft). No
subject has been built with it yet. The first one to follow it should fix whatever turns
out wrong, and add to §12.

## 0. The standard

The owner's words, 14 Nov 2026: *the best, most detailed, most carefully thought out and
best tested curriculum; nothing missed; it does not matter if one subject takes a whole
session's limit.* So:

- **Quality over speed.** Never shorten a stage or skip a gate to save time. If the session's limit runs out, stop at a gate, write
  where you are in the design record (§9), and the next session continues from there.
- **Search, don't remember.** Models are trained on older data. Every fact that can change
  (current version, new or deprecated features, exam content, recommended practice, tool
  names) is looked up on the web **during the session**, and recorded with its source and
  the date you checked. Example from writing this file: the model's memory said MongoDB
  8.0 was current; a search showed **9.0, released September 2026**.
- **Every stage is verified before the next starts**, and a problem found later is fixed
  at the stage it came from (§4, "Re-work").
- **Three agents review each draft** (§5). The owner asked for review by agents; it is a
  standing request for this work, so the usual "don't spawn agents unless asked" does not
  hold back here. **Keep it to three per round, two rounds per stage at most** (owner, 15
  Nov 2026): a panel of 14 used up most of a session's limit on one round, and its
  reports overlapped heavily (§13).

### How a session starts

The owner opens a session and says something like:

> Add MongoDB. Read docs/subject-blueprint.md.

Then:

1. Read `CLAUDE.md`, this file, and `docs/frontend.md` §6 ("Editing the topic graphs") and
   §7 ("The map").
2. Read `shared/data/redis.ts` end to end: the format and the care expected.
3. Run `cd backend && npm run subject -- redis` and skim it: that is how a finished subject
   looks from the outside.
4. Work through §4. Stop and ask the owner at every **Ask**.

## 1. What you are making

**A curriculum: the best path through the subject for a student, not a mirror of any
source.** A student who follows the map should learn the subject in a sensible order,
know what they can skip and why, and get unstuck. Sources tell you what exists, what is
current and what matters; the curriculum's shape is your design.

**Trellis never teaches.** The map says what to study, in what order, what can be skipped,
and why someone might be stuck. The student's own AI teaches, from a prompt Trellis
assembles. So every piece of text you write describes; it never explains:

| Field | Good | Bad (it teaches) |
|---|---|---|
| summary | "When related data lives inside a document and when it gets its own collection." | "Embed data when it is read together, because one read is faster than two." |
| mistake | "Embedding data that is shared and updated in many places" | "Don't embed shared data; reference it with an ObjectId instead." |

**A subject in Trellis:**

- **Big topics** (React Native has 19, Redis 24): the chunks of the subject. One box on the
  map until the student reaches it; then it opens into a frame of its subtopics.
- **Subtopics** (2 to 10 per big topic): what the student studies and checks in on. Each is
  **core** (don't skip) or **optional** (safe to skip even when its big topic is on the goal).
- **Links between subtopics:** "needs" (can't really get it without) and "helps" (useful
  first, not required). **"Needs" links between big topics are never written**: they are
  worked out from the core subtopics' links (§7).
- **Goals**: sets of target big topics; everything they stand on comes with them (§8).
- **A difficulty** (easy, medium, hard) for every subtopic.

## 2. Sources, by job

Each job has its own kind of source. Use the best available for each; record every one in
the design record with its URL, the version it describes, and the date you checked it.

| Job | Where to look | Why this source |
|---|---|---|
| **What exists, what it is called, what is current** | The official documentation: its table of contents, the latest release notes, the "what's new" and deprecation pages, the version support schedule | Written by the people who make it; the only reliable word on names, versions and what was removed |
| **What a competent person must know (scope)** | Official certification exam guides and their objectives and weights; official courses and learning paths | The maker's own answer to "what matters", written for learners. Weights show what is central (MongoDB's developer exam puts about half its weight on CRUD) |
| **Order** | The "needs" test (§7); the official tutorial or getting-started path; how the official course orders its modules | Docs are ordered as a catalogue, not a course; tutorials are ordered for learning |
| **What is core, what people get stuck on** | Learner pain: Stack Overflow (the subject's tags, most-voted and most-viewed questions), official community forums, issue trackers, the docs' FAQ and troubleshooting pages | Where real students lose time; drives core vs optional, mistakes and difficulty |
| **What working people use** | Recent engineering blogs from teams that run it, conference talks, the maker's "best practices" and "anti-patterns" pages, recent job postings | Separates the essentials from what is in the docs but rarely used |
| **Subjects with no official owner** (maths, system design) | Standard textbooks, well-known university syllabi (MIT OpenCourseWare and similar), and a respected course | The nearest thing to an authority |

**Not a source:** roadmap.sh (dropped 14 Nov 2026 for new subjects; React Native and Redis
keep their credit because their topic lists did come from it), other people's study
notes, AI-written summaries, and your own memory for anything that can change. **Never
copy text** from any source: write your own sentences.

**How to read sources:** fetch pages directly (WebFetch, or the `web-fetch` agent). Use
the browser extension (load the `anthropic-skills:chrome-browser` skill) only for a site
that needs a real browser. Use extended web search for anything recent, niche or
version-dependent; standard search for plain lookups.

## 3. The design record

Every subject gets `docs/subjects/<id>.md`, started in stage 1 and kept up to date at
every stage. It is how the owner reviews the work, and how a later session continues or
updates the subject. Plain language, for a person:

```markdown
# <Subject>: design record

Status: <stage reached, date>. Versions: <product version the curriculum describes>.

## Sources
| Job | Source | URL | Version | Checked |

## What changed recently
<New, changed and deprecated in the last two or three major versions, each with its source.>

## Coverage
<The inventory (stage 3): every source item, and where it went or why it was left out.>

## Learners and goals
<Who studies this (stage 4), and every goal they might come with; which goals ship.>

## The plan
<Big topics, subtopics (core or optional), one line each on why it is there.>

## Decisions
<Every judgement call: what was cut, merged, split, made optional, and why.>

## Review log
<Each review round: who reviewed, every finding, accepted or rejected, and why.>

## Open questions
<Anything for the owner.>
```

## 4. The path

Ten stages. Each one lists what to **do**, what it **produces**, the **gate** that must pass
before the next stage, and how to **re-work**.

**Re-work rule, for every stage:** when a later stage finds a problem that started in an
earlier one (a missing source, a wrong scope, a bad link), go back to that stage, fix it
there, write what happened in the design record's Decisions, and re-run every gate from
that stage on. Never patch only the downstream symptom.

### Stage 1: set up

- **Do:** create the branch `feature/subject-<id>`. Pick the subject id (short,
  lowercase, hyphenated, permanent: it lives in students' records and URLs) and a
  two-letter topic prefix no subject uses yet (`rn-`, `rd-`; `mg-` for MongoDB). Start the
  design record from §3.
- **Produces:** the branch, `docs/subjects/<id>.md`.
- **Gate:** the id and prefix are unused (`grep -r '"<prefix>-' shared/`).

### Stage 2: research

- **Do:** fill every row of §2's table for this subject. Then search, specifically:
  - the latest stable version, its release date, and the support schedule;
  - the release notes of the last two or three major versions: what was added, changed,
    deprecated and removed;
  - every official certification and its current exam guide (objectives and weights);
  - the official learning paths and courses, and their module order;
  - the most-viewed questions and the common errors learners hit;
  - the maker's best-practice and anti-pattern pages.
  Open the primary page for every fact you will rely on; a search snippet is a lead, not
  a source.
- **Produces:** Sources and What changed recently, in the design record.
- **Gate:** every job in §2 has at least one source with URL, version and date; the
  current version is confirmed on the maker's own site; every deprecation you know of is
  confirmed or corrected by a source.

### Stage 3: inventory (so nothing is missed)

- **Do:** list everything the sources say belongs to the subject, as one table: every
  section of the docs' table of contents (to two levels), every exam objective, every
  module of the official course, every frequent learner problem. One row each, with where
  it came from.
- **Produces:** the Coverage table (its last column, "where it went", stays empty until
  stage 5).
- **Gate:** every docs section, exam objective and course module appears. Count them
  against the sources; don't eyeball it.

### Stage 4: learners and goals

- **Do:** decide who studies this subject, starting from the generic roster in §5 and
  adapting it (for MongoDB, "comes from SQL" is a real group; for linear algebra it isn't).
  Then list **every goal** a student could reasonably come with: build something, pass the
  certification, get a job, run it in production, migrate from a rival tool, a semester
  course, just the basics. For each: one line on what "done" means for that student.
- **Produces:** Learners and goals, in the design record.
- **Gate:** at least six personas and six candidate goals, each specific to this subject.
- **Ask:** which goals ship. Trellis shows each goal on /start, so ship few (two or three)
  and strong; every other candidate goal is still used to test the curriculum in stage 8.

### Stage 5: the plan

- **Do:** design the big topics and subtopics, as a list in the design record (no code
  yet): each big topic with its subtopics, core or optional, and one line on why it is
  there. Then fill the Coverage table's last column: every inventory row goes to a
  subtopic, or is left out with a reason ("deprecated in 9.0", "a reference list, folded
  into X", "operations-only, outside every goal").

  Shape rules, from the existing subjects and the map's limits:
  - **15 to 25 big topics**; **2 to 10 subtopics** each, at least one core.
  - **At most 6 subtopics that need the same one** inside a big topic (the map draws them
    side by side; past 6 or 7 a frame is too wide to read). More means two big topics.
  - **Each subtopic is one sitting**: 10 to 90 minutes for a first pass. A prerequisite the
    subject assumes ("JavaScript basics") may be longer.
  - **Fold reference lists into jobs.** Not one box per data type or operator: "the types
    that bite", "comparison and logical operators".
  - **Core** = a student with the main goal can't do without it. **Optional** = useful,
    but the goal can be reached without it. Would a good teacher let a student skip it to
    ship their first real thing? Then optional.
  - **Names the way students search** ("Embed or reference"), API names as written
    (`$lookup`), at most about 28 characters (a map box's width).
  - **Order by "needs"**, not by the docs' table of contents.
- **Produces:** The plan, a complete Coverage table, Decisions.
- **Gate:** every inventory row has a destination or a reason; every shape rule holds or
  has a written exception; every certification objective maps to a subtopic.

### Stage 6: review the plan

- **Do:** run review round 1 (§5) on the design record: the plan-stage panel. Triage every
  finding; re-work; run the panel again until a round accepts no "must" or "should"
  finding (§5, "Stopping").
- **Produces:** a revised plan; the Review log.
- **Gate:** the stopping rule is met.
- **Ask:** show the owner the plan and the review log. Do not write the subject file
  before the owner agrees: a big topic is cheap to move in a list and expensive in code.

### Stage 7: write the subject file

- **Do:** write `shared/data/<id>.ts` (§6): topics, the difficulty table, links (§7), goals
  (§8). Wire it in (§10). Then check your own work field by field against §6's table
  before anyone else sees it.
- **Produces:** the file; `npm run subject -- <id>` prints it.
- **Gate:**
  - `cd backend && npm test` passes (§11 says what each test watches);
  - `npm run subject -- <id>`: every worked-out big-topic link reads sensibly aloud
    ("Aggregation needs Querying"); "Worth a second look" is empty, or every line has a
    reason in Decisions;
  - every subtopic in the plan exists in the file, and nothing is in the file that isn't
    in the plan.

### Stage 8: review the file

- **Do:** run review round 2 (§5) on the file: the file-stage panel, whose walker walks
  per candidate goal from stage 4 (shipped or not). Triage, re-work, re-run until the
  stopping rule holds.
- **Produces:** the revised file; the Review log.
- **Gate:** the stopping rule is met, and stage 7's gate passes again after the last
  change.

### Stage 9: look at it

- **Do:** see the subject as a student does (§11, "Look at it"): the map fitted, with
  every big topic open, several hovers, one selected topic, the list view's route, /start
  with each shipped goal. Take screenshots; judge each one.
- **Produces:** screenshots described in the design record; fixes.
- **Gate:** no box, line or label problem; the route reads like a sensible course from
  start to end; each shipped goal's size on /start looks right.

### Stage 10: final verification

- **Do:**
  - **Freshness:** search again for anything released or deprecated since stage 2 (a
    session can be long, and a subject can wait days before review).
  - **Coverage:** re-check the Coverage table against the final ids: every "went to" names
    a subtopic that exists, with the same meaning.
  - Re-run every gate from stage 7 on; `cd frontend && npx tsc --noEmit && npx eslint . &&
    npm run lint:shared`; `cd backend && npm test && npm run test:integration`
    with the dev database up.
  - Update the docs (§10, step 4).
- **Produces:** a finished design record; the pull request (commit on the branch; push,
  merge and deploy only on the owner's say-so). Its description: the big topics, the
  shipped goals, the review rounds in numbers (findings raised, accepted, rejected), and
  the open questions.
- **Gate:** everything above passes.

## 5. The review panel

### How to run a round

**Three reviewers per round** (owner, 15 Nov 2026). Each is a **fresh agent** (the Agent
tool, `general-purpose`), all three started **in parallel** in one message. Agents start
with no context, so each one's brief must say everything it needs (template below).
Reviewers **read and search; they never edit files**. Every reviewer must **search the
web** for anything version-dependent it comments on, and cite what it found.

Why three, not one per persona: the first run (React Native, 15 Nov 2026) sent 14
reviewers at the plan. They used most of the session's limit before triage could start,
and their findings overlapped heavily (four of them found the same `localhost` trap, three
the same AsyncStorage version, three the same React Compiler default). One agent playing
several related roles finds nearly as much for a fraction of the cost.

**Plan stage (round 1):**

| | Reviewer | Plays | Looks hardest at |
|---|---|---|---|
| R1 | **Students** | P1 beginner, P2 student with a deadline, P9 very little time, P10 non-native English | Hidden assumptions; the first hour; what each shipped goal really requires and its total minutes; core vs optional; plain names |
| R2 | **Practitioner** | E1 practitioner, P3 builder shipping, P5 job seeker, P7 returning learner, P8 professional going deep | Currency against the maker's release notes; what working people use that is missing; what is obsolete; what a real release needs |
| R3 | **Teacher and auditor** | E2 teacher, E3 prerequisite auditor, E4 coverage auditor, P4 from a neighbouring tool | Order and cliffs; every "needs" link against §7; the Coverage table against the sources; false friends for the neighbouring group |

**File stage (round 2):** R2 again on the file, plus:

| | Reviewer | Looks hardest at |
|---|---|---|
| R4 | **Format auditor** (E5) | §6's rules on every field |
| R5 | **Goal walker** | Runs `npm run subject -- <id> --goal …` for **every** candidate goal from stage 4 (shipped or not) and walks each route |

Personas from the old roster that the subject needs (P6, a certification candidate, when
a certification exists) are added to the role list of the nearest reviewer, not given an
agent of their own.

### The roster

The personas and experts the three reviewers play. Adapt them to the subject in stage 4;
drop only the ones that truly don't apply, and say why in Decisions.

**Students** (each reads the plan or the route as that student, asking: can I follow
this? is anything I need missing, too late or too early? is anything forced on me that I
don't need?):

| | Persona | Looks hardest at |
|---|---|---|
| P1 | **A complete beginner** to the subject, with only the stated prerequisites | Hidden assumptions, jargon in names, the first hour |
| P2 | **A university student with a deadline** (a semester project or exam; Trellis's first users) | The shortest honest path; what can really be skipped |
| P3 | **A builder shipping a first real project** | Whether the practical goal gets them to something that works, safely |
| P4 | **Someone coming from a neighbouring tool** (SQL to MongoDB, Docker to Kubernetes) | What transfers, the false friends, the habits to unlearn |
| P5 | **A job seeker preparing for interviews** | What interviewers ask; the concepts behind the commands |
| P6 | **A certification candidate** (when a certification exists) | Every exam objective, at the right depth and weight |
| P7 | **A returning learner who knew an older version** | What changed; deprecated items that must not appear as current |
| P8 | **A professional going deep** (production, scale, operations) | The advanced areas: are they real, current and complete? |
| P9 | **A learner with very little time** | Whether core vs optional is honest; minutes that are believable |
| P10 | **A non-native English speaker** (many of Trellis's users) | Plain names and summaries; no idioms |

**Experts:**

| | Role | Checks |
|---|---|---|
| E1 | **Practitioner** of the subject | Correctness and currency of every topic; what working people use that is missing; what is obsolete |
| E2 | **Teacher and curriculum designer** | Order, size of each step, progression from simple to hard, no cliffs |
| E3 | **Prerequisite auditor** | Every "needs" link against the test in §7; core vs optional; the worked-out big-topic links; anything that should be a link and isn't |
| E4 | **Coverage auditor** | The Coverage table against the sources, row by row: nothing missed, every left-out reason sound |
| E5 | **Trellis format auditor** (file stage) | §6's rules: describes, never teaches; mistakes and keywords; names ≤ 28 characters; minutes; difficulty with reasons |
| G* | **Goal walkers** (file stage), one per candidate goal | Runs `npm run subject -- <id> --goal <big topic ids>`, walks the route as that student: everything needed is there and in order; nothing unneeded is required; the size is reasonable |

### The brief (fill in the brackets)

```text
You are reviewing a draft curriculum for [subject] in Trellis, a study app. Trellis shows a
student a map of topics, what to study next, what they can skip and why they might be
stuck; it never teaches (the student's own AI does). Big topics hold subtopics; each
subtopic is core or optional; "needs" links mean "can't really understand A without B".

Your role: [the reviewer (R1 to R5), with every persona or expert it plays and each one's
line from the roster]. Review as each of them in turn; label each finding with the one
that raised it.
[For a goal walker: your goal is "[goal]", meaning [what done looks like]. Run
`cd /Users/nitesh/Desktop/trellis/backend && npm run subject -- [id] --goal [ids]` and walk
the route it prints.]

Read: [docs/subjects/<id>.md, and at the file stage shared/data/<id>.ts and the output of
`npm run subject -- <id>`]. Do not edit any file.

Your training data is out of date. Search the web for anything that depends on a version,
a date or current practice, and cite the page.

Report up to 20 findings, most important first, each as:
- severity: must (wrong, or a student would be misled or blocked) / should (clearly
  better) / could (a matter of taste)
- where: a topic id, or a line of the plan
- problem: one or two sentences
- evidence: a URL, or your reasoning as this [persona]
- change: what you would do instead
Then, in three lines at most, what is good and should not change.
```

### Triage

The writing session decides every finding, and logs each one in the Review log:
**accepted** (and changed), **rejected** (with the reason), or **deferred** (an open
question for the owner). Rules:

- A "must" is never rejected without evidence at least as strong as the finding's.
- When personas disagree (the beginner wants it core, the student with no time wants it
  optional), decide by the shipped goals and write down the trade-off.
- A finding that would change an earlier stage's output is re-worked at that stage (§4).

### Stopping

Run the panel again after re-working. A stage's review is done when a whole round accepts
no "must" and no "should" finding. If two rounds don't get there, stop and **Ask** the
owner, with the open findings.

## 6. The subject file

`shared/data/<id>.ts`, in the shape of `shared/data/redis.ts`:

```ts
import type { Edge, Goal } from "../types";
import { big, edgesFrom, sub, type DifficultyTable, type RawTopic, type SubjectFile } from "./build";

const S = "mongodb" as const;
const B = big(S);
const t = sub(S);

export const mongodbTopics: RawTopic[] = [
  B("mg-schema", "Schema design", "How to shape documents around the way the app reads and writes them."),
  t("mg-embed-ref", "mg-schema", "Embed or reference", 40, false,
    "When related data lives inside a document and when it gets its own collection.",
    ["Embedding data that is shared and updated in many places"],
    ["embed", "embedding", "reference", "references"]),
  // ...
];
export const mongodbDifficulty: DifficultyTable = { "mg-embed-ref": "hard" /* , ... */ };
export const mongodbEdges: Edge[] = edgesFrom([/* needs */], [/* helps */]);
export const mongodbGoals: Goal[] = [/* §8 */];

export const mongodb: SubjectFile = {
  // No `source`: only subjects whose topic list started on someone else's page credit it.
  subject: { id: S, name: "MongoDB", shortName: "MongoDB", blurb: "…" },
  topics: mongodbTopics,
  difficulty: mongodbDifficulty,
  edges: mongodbEdges,
  goals: mongodbGoals,
};
```

Start the file with a comment naming the design record and the product version the
curriculum describes ("Checked against MongoDB 9.0, 14 Nov 2026; see
docs/subjects/mongodb.md").

Every field, where it is used, and how to write it:

| Field | Used by | How to write it |
|---|---|---|
| **id** | Records, links, URLs. **Permanent**: students' check-ins point at it | `<prefix>-<short-name>`, lowercase, hyphens. Never reuse or rename one after release |
| **name** | The map's boxes (about 28 characters fit), search, the helper (a name typed in a message picks the topic) | What the student would call it. Short. API names as written |
| **summary** | The topic sheet, search, and the prompt: *"Next I want to learn {name}: {summary}"*, first letter lowercased | One sentence, what it **covers**, never how it works. Must read well after a colon |
| **mistakes** | The topic sheet ("Where people slip"), the prompt (*"Watch for the usual traps: a, b and c."*, each lowercased), and the stuck ranking (it matches the student's words against them) | 1 to 3 short phrases, no full stop, starting with an -ing verb or a noun ("Forgetting the 16 MB document limit"). From learner pain (§2), not imagination |
| **minutes** | Screens; summed into a big topic's time and the landing page's "about N hours" | A student's first pass, not an expert's reading time |
| **optional** | Skippable for every goal; left out of the big topic's difficulty and of the big-topic links | §4, stage 5 |
| **keywords** | The helper (a typed message mentioning one points at this topic; whole words, the longer match wins) and search | Words a student would type about this topic **and no other**. Lowercase. No generic words ("database", "performance", "cache"). `npm run subject` flags a keyword shared by two topics |
| big topic **summary** | The big topic's sheet, the list view | One sentence: what the chunk is for |

**The difficulty table:** one line per subtopic, grouped by big topic, each group with a
comment saying why. Judge from learner pain, not from how hard it was for you. **Easy** =
it works the first time you try it; **medium** = a gotcha or a choice to make; **hard** = a
mental model people routinely get wrong (concurrency, distribution, failure). A big
topic's difficulty is worked out. `shared/types.ts`, `Difficulty`, says what it changes.

## 7. Links

Links decide the order of the route, what is ready, the stuck ranking (two steps down),
what a goal requires, and every line on the map.

`edgesFrom(needs, helps)` takes `[from, to]` pairs: **from** needs (or is helped by)
**to**. On the map, arrows point from `to` up to `from`.

**The test for "needs": could a student really understand A, having never seen B?** If
not, A needs B. Not "B is usually taught first"; not "B is related". If A is easier with
B but possible without, it is a "helps".

**Rules** (the data checks in `shared/data/index.ts` enforce them; `backend/test` fails on
any of them):

1. **"Needs" links between subtopics only.** A big topic needs another when one of its
   **core** subtopics needs something inside it (`bigNeedsFrom`), minus links a longer path
   implies.
2. **Optional subtopics don't create big-topic links.** An optional subtopic may need one
   in another big topic only if its own big topic already stands on that one; otherwise
   make it a "helps".
3. **Every subtopic has at least one link.**
4. **No redundant "needs"**: not A→C when A→B→C.
5. **No "helps" that a chain of "needs" already covers.**
6. **No loops; no links across subjects.**
7. **"Helps" may join two big topics** (written by hand, rare) **or two subtopics.**

**Comment every link that isn't obvious**, one line above it, with the reason
(`// You need to know what you are installing before you install it.`). A reviewer can't
check a link whose reason they have to guess.

## 8. Goals

- Ship **two or three** goals (stage 4 decides which, with the owner). Usually one
  practical goal ("Use MongoDB in my app"), and "The whole <subject>" whose targets are
  every big topic nothing else needs. A third only when a large group of students comes
  for something neither covers (the certification, say).
- `targets` lists **big topics**; everything they stand on comes with them. `blurb`: what
  the student will be able to do. Ids: `goal-<prefix>-<short>`.
- **Every candidate goal is tested, shipped or not**: `npm run subject -- <id> --goal
  <ids>` prints the route any set of targets would give.
- On /start, a goal shows "N topics to learn, M you can skip". If the practical goal
  requires nearly everything, its targets are too high, or too much is core.

## 9. Working across sessions

A subject may take more than one session. The design record is the hand-over: before a
session ends, or at any gate when the limit is close, write in its Status line the stage
reached, what is in progress, and the next step. A new session reads the design record
first and continues there. Commit at every gate on the branch.

## 10. Wiring it in

1. `shared/types.ts`: add the id to `SubjectId`.
2. `shared/data/index.ts`: import the file's object and add it to `files`. That list feeds
   the landing page (its subject count and list), /start, the "Coming soon" text, search,
   the helper, the backend's routes and the tests.
3. Optional: lines for single topics in `shared/data/instructions.ts` (extra prompt lines
   for a topic people often get stuck on; seeded into Postgres).
4. Docs: `CLAUDE.md` ("Decisions → Subjects", "Where things stand"), `README.md` ("v1
   subjects", the `data/` line), `docs/design.md` (§14's subjects line and its other
   mentions of the subjects). **Ask** before changing the decision line in CLAUDE.md:
   which subjects Trellis offers is the owner's call.

Nothing else: no migration (subject ids are free text in Postgres), no route, no screen.
If you find you need to change a screen, say why in the pull request.

## 11. Checks

**Tests** (`cd backend && npm test`):

- `data-checks.test.ts`: every check in `shared/data/index.ts`; its message names the topic.
- `big-links.test.ts`: the worked-out big-topic links.
- `map-layout.test.ts`: the drawn map of every subject, all closed and all open: no
  overlapping boxes, no line through a box or another frame, every arrowhead pointing up,
  every named line lit on hover. **A subject can pass the data checks and fail these**
  (a frame too crowded to route).

**`npm run subject -- <id>`** prints the curriculum as Trellis works it out: big topics in
route order with their worked-out prerequisites, every subtopic with its links, each
shipped goal's route with its size, and a "Worth a second look" list (crowded frames,
shared keywords, long names, long sittings). `--goal a,b` prints any goal's route.

**Look at it** (stage 9). Run the frontend (`cd frontend && npm run dev`), go to /start, pick
the subject and its whole-subject goal, sort the cards. To open every big topic at once,
in the browser console on /map (demo mode, signed out):

```js
const s = JSON.parse(localStorage.getItem("trellis-demo-v5"));
s.opened = [/* every big topic id */]; s.subjectId = "<id>";
localStorage.setItem("trellis-demo-v5", JSON.stringify(s)); location.reload();
```

Look at: the map fitted; hovers on a foundation, a big topic and a subtopic deep in a
chain; one selected topic with its path; the list view's route, read start to end as the
student; /start with each shipped goal.

**Review checklist** (the owner, on the pull request):

- [ ] The design record's sources are official and current, with versions and dates.
- [ ] The Coverage table accounts for every docs section and exam objective.
- [ ] Every big topic earns its place; nothing a working engineer needs is missing.
- [ ] Core vs optional: would a good teacher let a student skip each optional one?
- [ ] The worked-out big-topic links read sensibly aloud.
- [ ] Summaries describe, never explain; nothing is copied from a source.
- [ ] The review log shows every "must" resolved.
- [ ] The map, the route and /start look right.

## 12. Worked example: MongoDB

How the stages begin for MongoDB, with what was verified on 14 Nov 2026 while writing
this file. **The session that builds MongoDB redoes all of it**: this shows the method,
not the answer.

### Stage 2, started: sources found

| Job | Source | Notes (from search results on 14 Nov 2026; open each page to confirm) |
|---|---|---|
| Current version | [MongoDB 9.0 release notes](https://www.mongodb.com/docs/manual/release-notes/9.0/), [compatibility changes](https://www.mongodb.com/docs/manual/release-notes/9.0-compatibility/), [lifecycle](https://www.mongodb.com/legal/support-policy/lifecycles) | 9.0 announced 29 Sep 2026; supported to Oct 2031. 8.0 and 8.3 still supported |
| What changed | the same release notes | LDAP authentication and authorization deprecated; `mongocryptd` deprecated for the Automatic Encryption Shared Library; server-side JavaScript (`$where`, `$function`, `$accumulator`) no longer deprecated, now on a WebAssembly engine; a new schema validation level; Queryable Encryption gains prefix, suffix and substring queries |
| Scope | [Associate Developer exam](https://learn.mongodb.com/pages/mongodb-associate-developer-exam) | 53 questions, 75 minutes, in Node.js, C#, Java or Python. Reported weights: document model 8%, CRUD 51%, indexes 17%, data modelling 4%, tools 2%, drivers about 18% |
| Scope (schema design) | [Associate Data Modeler exam](https://learn.mongodb.com/courses/mongodb-associate-data-modeler-exam), [Data Modeling Skills for Developers path](https://learn.mongodb.com/learning-paths/mongodb-data-modeling-skills-for-developers) | A whole exam on data modelling: schema design is a first-class area, not a footnote |

Two lessons already: the version was not the one the model remembered, and the security
area changes shape (LDAP is on its way out, so it must not appear as a current choice).

### Stage 5, sketched: a possible shape

A sketch made before the research was complete, to show the kind of thinking stage 5
asks for. **Stage 3's inventory and the review rounds will change it.**

| Big topic | Holds (core; *optional*) |
|---|---|
| What is MongoDB? | documents and collections, when to choose it; *compared with SQL*, *Atlas or self-hosted* |
| Getting started | a free Atlas cluster or a local server, mongosh, connection strings; *Compass* |
| Documents and BSON | document shape and `_id`, the types that bite (numbers, dates, ObjectId), embedded documents and arrays, null vs missing; *BSON vs JSON*, *the 16 MB limit* |
| CRUD basics | insert, find by equality, update with `$set`/`$inc`/`$unset`, delete; *replace*, *upsert* |
| Querying | comparison and logical operators, nested fields, arrays (`$in`, `$all`, `$elemMatch`), projection, sorting and pagination; *regex*, *cursors* |
| Updating in depth | array updates, positional `$` and `arrayFilters`, `findOneAndUpdate`; *update pipelines*, *`bulkWrite`* |
| Schema design | in full below |
| Indexes | how a query uses an index, single field, compound and the equality-sort-range rule, `explain()`, multikey, unique; *partial*, *TTL*, *text*, *geospatial* |
| Aggregation | the pipeline, `$match`/`$project`/`$set`, `$group`, `$sort`/`$limit`, `$unwind`, `$lookup`; *`$facet`*, *`$out`/`$merge`*, *views* |
| MongoDB in your app | a driver, one client and its connection pool, ObjectId in app code, duplicate-key errors; *an ODM* |
| Transactions and consistency | single-document atomicity, multi-document transactions, write concern; *read concern*, *retryable writes* |
| Replica sets | elections and failover, read preference; *the oplog*, *change streams* |
| Performance | explain plans, the profiler and slow queries, the working set; *covered queries* |
| Security | users and roles, network access, TLS; *encryption at rest*, *Queryable Encryption* (LDAP left out: deprecated in 9.0) |
| Operations | backups, monitoring; *upgrades* |
| Sharding | when to shard, choosing a shard key, the balancer |
| Search | *Atlas Search*, *Vector Search* |

The exam weights back the spine: CRUD, querying, indexes, drivers and the document model
carry nearly all of the developer exam.

### Stage 7, for one big topic: Schema design

```ts
// ------------------------------------------------------------ schema design
// A whole MongoDB exam (Associate Data Modeler) covers it; it is where real projects most
// often go wrong.
B("mg-schema", "Schema design", "How to shape documents around the way the app reads and writes them."),
t("mg-schema-why", "mg-schema", "Design for your queries", 25, false,
  "Why a document schema starts from the app's reads and writes rather than from tables.",
  ["Copying a normalised SQL schema table for table", "Designing before listing the queries the app will run"],
  ["schema design", "data modeling", "data modelling", "access patterns"]),
t("mg-embed-ref", "mg-schema", "Embed or reference", 40, false,
  "When related data lives inside a document and when it gets its own collection and an id.",
  ["Embedding data that is shared and updated in many places", "Referencing everything and joining in app code"],
  ["embed", "embedding", "reference", "references", "denormalize", "denormalise"]),
t("mg-relations", "mg-schema", "One-to-many and many-to-many", 35, false,
  "Modelling each kind of relationship, including one-to-many where the many has no limit.",
  ["Arrays that grow without limit inside one document", "Forgetting the 16 MB document limit"],
  ["one-to-many", "one to many", "many-to-many", "many to many", "unbounded array"]),
t("mg-duplication", "mg-schema", "Duplicating data on purpose", 25, false,
  "Copying a few fields into another document to save a lookup, and keeping the copies in step.",
  ["Duplicating fields that change often", "Having no plan for updating the copies"],
  ["duplicate", "duplication", "extended reference"]),
t("mg-patterns", "mg-schema", "Common schema patterns", 45, true,
  "The bucket, computed, subset, outlier and attribute patterns, and the problem each one answers.",
  ["Applying a pattern before its problem shows up"],
  ["bucket pattern", "computed pattern", "subset pattern", "outlier pattern", "attribute pattern"]),
t("mg-versioning", "mg-schema", "Changing a schema over time", 20, true,
  "Marking documents with a version and moving them to a new shape gradually or all at once.",
  ["Assuming every document already has the new field"],
  ["schema version", "schema versioning", "schema migration"]),
t("mg-validation", "mg-schema", "Validating documents", 25, true,
  "Rules on a collection with $jsonSchema, and what the validation level and action decide.",
  ["Turning on strict validation over existing documents that break it"],
  ["validation", "$jsonschema", "jsonschema", "validator"]),
```

```ts
// Schema design: no single right answer, and a wrong one costs months later.
"mg-schema-why": "medium", "mg-embed-ref": "hard", "mg-relations": "medium",
"mg-duplication": "medium", "mg-patterns": "hard", "mg-versioning": "medium", "mg-validation": "easy",
```

Links (`mg-find`, `mg-embedded`, `mg-bson-types`, `mg-update-many` and `mg-lookup` are
subtopics of CRUD basics, Documents and BSON, Updating in depth and Aggregation in this
sketch):

```ts
// needs
// You can't design for queries you can't write yet.
["mg-schema-why", "mg-find"],
["mg-embed-ref", "mg-schema-why"],
["mg-embed-ref", "mg-embedded"],
["mg-relations", "mg-embed-ref"],
["mg-duplication", "mg-relations"],
["mg-patterns", "mg-relations"],
["mg-versioning", "mg-schema-why"],
// Validation rules are written in BSON types.
["mg-validation", "mg-bson-types"],
// helps
// Keeping copies in step is an updateMany; knowing it makes the cost concrete.
["mg-duplication", "mg-update-many"],
// $lookup is the read side of a reference.
["mg-relations", "mg-lookup"],
```

What comes out: Schema design needs CRUD basics (through "Design for your queries") and
Documents and BSON (through "Embed or reference"); if CRUD basics already stands on
Documents and BSON, the second link is implied and dropped. It does not need Aggregation:
`$lookup` helps, but you can design without it. "Validating documents" is optional and
needs a subtopic of Documents and BSON, which Schema design already stands on, so rule 2
holds. Every subtopic has a link. The widest row inside the frame is two boxes.

## 13. Learnings

What the subjects so far, and the 14 Nov 2026 map review, taught. Add to this list when
you learn something; date what you add.

- **A big panel costs more than it finds** (15 Nov 2026). React Native's plan went to 14
  reviewers; 8 reported before the owner stopped the round to save the session's limit,
  and most of their findings repeated each other. Three combined reviewers per round now
  (§5).
- **Check what `npx expo install` gives, not what is newest** (15 Nov 2026). AsyncStorage
  3 was out, but Expo SDK 58 installs 2.2: a summary naming the newest API would make the
  student's AI write code that doesn't run. Read the SDK's own library page
  (`docs.expo.dev/versions/vNN.0.0/sdk/<library>/`).
- **Learner pain from Stack Overflow** (15 Nov 2026): the site refuses fetches; the Stack
  Exchange API (`api.stackexchange.com/2.3/questions?sort=votes&tagged=<tag>`) works, with
  the owner's permission for the call.
- **Search first; memory is out of date** (14 Nov 2026). Writing this file, the model
  remembered MongoDB 8.0 as current; 9.0 had shipped six weeks earlier, deprecating LDAP
  and un-deprecating server-side JavaScript.
- **roadmap.sh was dropped for new subjects** (14 Nov 2026). Its boxes were drawn for a
  poster: its MongoDB roadmap has a box for each of 19 BSON types (some deprecated) and
  none for schema design, which MongoDB gives a whole exam to.
- **Official docs have the same trap**: they are a catalogue. Fold reference lists into
  jobs; order by "needs".
- **Two levels written by hand drift apart.** React Native's hand-written big-topic links
  disagreed with its subtopic links (9 had nothing behind them; 18 subtopic links skipped
  theirs), which broke the map's hover chains. Big-topic links are worked out now. If you
  want to "just add" one, a subtopic link is missing.
- **Worked-out links move the map.** One subtopic link can move a big topic or change what
  a goal requires. Always re-run `npm run subject` and look at the map after editing links.
- **"Needs" means "can't get it without", and it is easy to write "comes before".** Fetch
  in React Native was written as needing JavaScript basics *and* State; State already
  needs JavaScript basics.
- **Optional subtopics must not create big-topic links**, or a skippable topic holds back
  a whole area (Detox, optional, needs Running on a device: counted, it would make all of
  Testing wait on Development workflow).
- **Unlinked subtopics look random on the map.** Every subtopic needs a link; if there is
  truly none, ask whether it belongs in the subject.
- **Wide frames.** Subtopics that need the same one are drawn side by side; Core components,
  with a row of 5, is about 1,000px wide. Past 6 or 7, split the big topic.
- **Check the map, not just the data.** The data checks passed while the map drew lines
  through boxes and labels over names. The tests cover geometry now; they can't judge
  whether the order makes sense to a student.
- **Generic keywords make the helper pick the wrong topic.** `npm run subject -- redis`
  found "leaderboard" and "expiration" each pointing at two Redis topics.
- **Ids are permanent once released.** Rename the `name`, never the id.
