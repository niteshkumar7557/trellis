# Knowledge — Nitesh

**Owns:** Feature 1 (a subject made finite) and the third step of Feature 4 (the reroute
to the prerequisite they actually missed). Canon, the graph, mastery, routes, skip
analysis, prompts, and the screens that show them.

Read `design.md` first. Numbers live here; change them here, with a date and a reason.

---

## What you answer

| Question | For |
|---|---|
| `resolveTopic(text)` | Feature 2 — what topic is this sentence about? |
| `applyStudyEvent(event)` | Update what we believe |
| `routeFor(goalId)` / `skipAnalysis(goalId)` | Feature 1 |
| `nextStep(userId)` | What to do next, and why |
| `weakPrerequisite(userId, topicId)` | Feature 4, step three |
| `compilePrompt(userId, topicId, intent)` | Every prompt Kero hands over |

You never send a message and never decide when to speak.

## The ideas

**The graph.** Topics joined by needed-before links, each **hard** (genuinely impossible
without) or **soft** (helps). Not a tree — a topic can need several others, and that is
the point.

**Mastery.** 0 to 1, per person per topic. Never entered by hand, never edited. Always
calculated from study events. **Continuity writes `study_events`; you own
`topic_mastery` and nobody else writes to it.**

**Declared versus evidence.** What they claim at signup is declared: believed, held
loosely, starts lower and fades faster until real evidence replaces it.

**Learn versus check.** An unseen topic is work. A topic they said they know is a short
*check* placed late. Getting this wrong undoes the whole point of onboarding.

**Active.** Only the next three unfinished waypoints. Continuity may only stall on those.

**Criticality.** Relative to a goal: **required** (reachable through hard links only),
**optional** (every path to it crosses a soft link), **skippable** (not needed for this
goal at all).

## The laws

1. **Every answer is explainable in one sentence.** If you cannot say why a topic is on
   a route, it does not go on the route. Feature 1 is worthless if the four skippable
   topics cannot be justified.
2. **Mastery is only ever derived.** Delete the table, replay the log, get identical
   numbers.
3. **Never match silently.** Unsure means offer choices or say honestly we do not know
   it. A wrong silent match corrupts the record permanently and the user never finds out.
4. **Declared is always weaker than observed.**
5. **Time is a parameter.** Nothing here reads the clock.
6. **Skipping is relative to a goal.** Change the goal, recompute, and skipped topics may
   return.

## The numbers

First guesses. Because mastery is recalculated from the log, changing them later is
cheap — that is why the schema is built this way.

**Bands.** Known ≥ 0.70 (off the route). Shaky 0.30–0.69 (a check). Unseen < 0.30 (a
learn).

**A study event adds**, scaled by `min(minutes, 60) / 60`:

| Felt like | Adds |
|---|---|
| applied — used it, not just read it | 0.30 |
| easy | 0.25 |
| ok | 0.18 |
| hard | 0.10 |
| bounced | 0.00 |

Second and later events on the same topic the same day count at 25%. **A single day can
never add more than 0.30 to one topic** — eight hours in one evening does not make
someone an expert, and if we pretend otherwise we drop the topic off their route and
they forget it in a week. `bounced` adds nothing but is recorded as a difficulty signal,
which Feature 3 reads.

**Reading is not knowing.** A maths or CS learner who read the chapter and solved nothing
does not understand the topic — but our formula happily walks them to 0.7 and drops it off
the route. So the check-in offers a fifth answer, **applied** — *I used it, solved with
it, built with it* — worth **0.30**, and:

**Mastery from reading alone is capped at 0.60.** It cannot cross into "known" until
either an `applied` event or a recall check (post-v1) exists for that topic.

Say the limitation out loud rather than hiding it: **v1 mastery measures exposure, not
competence.** The cap is what keeps that honest; recall checks are the real fix later.

**Onboarding declares:** know it → 0.55, shaky → 0.30, never seen → 0.00.

0.55, not 0.90, deliberately. Above shaky, below known, so it becomes a check that gets
confirmed rather than a claim taken on trust. People overestimate what they know, and
they are not lying when they do.

**Fading.** Half-life 14 days after one study day, multiplied by the number of distinct
study days, capped at 180. Declared-only mastery uses half the half-life until evidence
arrives.

**Matching.** ≥ 0.80 accept. 0.55–0.79 offer up to three choices. < 0.55 say honestly we
do not know that topic, and keep the text.

**Canon.** Two subjects — **computer networking, and React and frontend fundamentals**.
The second is chosen deliberately: it is what the two learners are studying, so all four
of us use Thread on our own real work from week 5. A product nobody on the team can use
never gets dogfooded.

Around 60 pages, all hand-reviewed. Aliases: at least **four** per topic — the formal
name, the abbreviation, how someone types it at 11pm, and **how our actual users type**,
which here includes Hinglish and code-mixed English: *"aaj sliding window padha"* has to
find the same topic as *"read about sliding windows"*. An embedding built on English prose
will not do that on its own; the aliases have to carry it. Sticking
points: one to three, specific. More than five prerequisites usually means the topic is
two topics.

## The hard parts

**Skip analysis.** Walking back from the goal is easy. The hard/soft marking is what
makes the answer right, and that lives in Canon — which you also own, so there is nobody
to blame. This is Feature 1, so it gets the most care.

**Matching messy text.** "did some stuff on how routers decide where to send things".
Aliases catch the easy cases, meaning catches the rest, and the safe direction is always
to ask rather than assume.

**Fading.** Easy to write, hard to be right about. Do not chase accuracy — build it so it
can be replaced, then move on.

## Your eight weeks

| Week | You |
|---|---|
| 1 | Together: tables, migrations, login, deploy, fakes. Interfaces frozen. Start writing Canon pages by hand — it teaches you the domain and the data shape at once. |
| 2 | Route computation on seed data, ignoring mastery. Canon reaches ~40 pages, with embeddings. |
| 3 | Mastery from events. Prove the rebuild gives identical numbers on a large random log. |
| 4 | Text matching, with candidates and honest off-map. |
| 5 | Join it up with Continuity. Start using it daily. |
| 6 | **Skip analysis**, and "why is this on my route". Onboarding. |
| 7 | Fading, and the weak-prerequisite lookup for Feature 4. |
| 8 | Stop. Tune explanations against your own real data. Write up which numbers you changed. |

## How you know it is right

- Replaying the log twice gives identical mastery.
- No route contains a topic before something it depends on. Test on generated graphs,
  not only the seed data.
- Every route position has an explanation naming real topics.
- Keep a file of 50 real sentences **written the way our users actually write** — messy,
  abbreviated, some of them Hinglish — with the topic you meant. It is the accuracy
  measure for the whole project, and a corpus of tidy English sentences would flatter us
  into shipping something that fails on first contact.
- Nothing here reads the clock.

## Traps

- **Trusting declared knowledge.** People say they know things they do not.
- **Letting anything else write mastery.** The rebuild guarantee dies quietly and you
  notice weeks later.
- **Accepting a 0.6 match because it is probably right.** It is. The times it is not are
  permanent.
- **Making fading clever.** A model you cannot explain in the viva is worse than a simple
  one you can.
- **Patching a bad prerequisite in code.** Fix the page.

## Viva questions

- Why a graph and not a tree?
- Why is mastery calculated rather than stored as truth?
- Why does "I know this" start at 0.55 and become a check rather than work?
- Why is mastery from reading alone capped, and what does that admit about what you are
  measuring?
- Which subjects does this design deliberately not suit, and why?
- Why is cramming capped?
- How do you know your text matching is good — what is your measure?
- Which four topics can this user skip, and why exactly those?
