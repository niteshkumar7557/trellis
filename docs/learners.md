# The practice track

**For:** the two teammates learning frontend from scratch — React, then Next.js, then
TypeScript, then backend.
**Run by:** Nitesh.

They own nothing on the critical path. That is not a demotion, it is what makes the
arrangement honest: nobody is waiting on someone who is learning `useState`, so they can
take three weeks over a task and the project does not notice.

---

## The rules of this track

1. **Their work never merges into a core file.** It lives in its own folder —
   `ui-lab/` — with its own fake data. Nothing in `design.md` depends on it.
2. **One task at a time**, with a soft deadline that genuinely does not matter.
3. **Review everything; rewrite nothing silently.** Leave comments and let them fix it.
   Silently rewriting someone's first component teaches them that their work is
   decorative.
4. **Say honestly which pieces shipped.** Some will. That is the whole reward, and
   pretending everything shipped is worse than nothing shipping.
5. **They are the only real test users we have besides ourselves.** From week 5 they use
   Thread properly, and what they report matters more than what they build.

## What they can honestly claim afterwards

Not "built Thread". Something true and specific: *"built the component library and the
networking topic dataset for Thread, a study-continuity platform"*, or *"wrote and
verified the 60-topic prerequisite graph the product's routing is built on"*.

A precise small claim survives an interview. A vague large one does not.

**The day-to-day tracker is the `thread-learn` app** (`~/Desktop/thread-learn`, deployed
to Vercel): every course broken into sections by timestamp, something to build in each,
and a test at the end that you check. The stages below are what their work is *for*; the
app is how they get there.

## Stage 1 — React (roughly weeks 1–3)

Components, in `ui-lab/`, against a fake JSON file. No API, no backend, no routing.

| Task | Teaches | Can it ship? |
|---|---|---|
| A waypoint row that renders in three states — learn, check, skippable | props, conditional rendering | Yes |
| The route list, from a fake array | lists, keys | Yes |
| The three-number summary: *"7 to learn, 4 you can skip, 3 checks"* | composition | Yes |
| An empty state for a brand-new account | thinking about the unhappy path | Yes |
| The know / shaky / never-seen sorting card | state, events | Likely |
| A card showing something Kero said, with a copyable prompt | state, clipboard | Likely |

**Done means:** it renders correctly from fake data, it works at phone width, and it does
not break when the array is empty.

## Stage 2 — Next.js (roughly weeks 3–5)

Pages and routing. Still no backend.

| Task | Teaches | Can it ship? |
|---|---|---|
| A landing page for Thread — the problem, the four features, one screenshot | pages, layout, deployment | Yes, and it is genuinely useful |
| An about page explaining what the product does not do | writing, which is half of design | Yes |
| A demo page rendering their Stage 1 components from a static file | file-based routing, imports | As a demo |

The landing page is real work with a real audience. Give it to whoever is more interested
in how things look.

## Stage 3 — TypeScript (roughly weeks 5–6)

| Task | Teaches | Can it ship? |
|---|---|---|
| Add types to their own components, using a shared types file we hand them | types on code they already understand | Yes |
| Turn one loose fake-data file into a properly typed one | modelling data | Yes |

Learning types on code you already wrote is far easier than learning both at once. This
is why the order matters.

## Stage 4 — Backend and data (roughly weeks 6–8)

Start with the non-code task, because it is the most valuable thing either of them can
give the project.

| Task | Teaches | Can it ship? |
|---|---|---|
| **Write Canon pages** — networking, and React, which they are learning as they write | the domain itself, and what good data looks like | **Yes — this is real project data** |
| **Check prerequisite links**, rejecting any they cannot justify in one sentence | precision, and reading a graph | **Yes** |
| Add three aliases per topic, including how someone types it at 11pm | how real input differs from textbook terms | Yes |
| One read-only endpoint returning topics from the database | request → query → response | Maybe |

The Canon work deserves emphasis. It requires no code, it teaches them networking while
they do it, and Feature 1 is only as good as those links. A wrong prerequisite sends a
real person to study something they did not need — so their judgement genuinely matters,
and they should be told that.

## Stage 5 — from week 5, being users

Both of them use Thread for their own learning. **This is why React is one of the two
seed subjects** rather than a second backend topic: it is what they are actually studying,
so their use of Thread is real rather than performed. Nitesh and Teammate 2 use the
networking subject for the same reason.

What we want from them:

- Every place they got confused, in their words, before we explain anything.
- Whether the daily question matched what they typed when they wrote it casually, or in
  Hinglish. They are the only people who will test this honestly.
- Every message from Kero that felt like nagging.
- The moment they nearly stopped answering the daily question, and why.
- Anything they wanted to tell Thread and could not.

**If either of them mutes Kero, that is the most valuable finding of the semester.**
Write down exactly what it did beforehand.

## How Nitesh runs this

- Hand out the next task when the last one is done, not on a schedule.
- Fifteen minutes a week each, looking at their code together. No more — this is not a
  course.
- When something they built ships, tell them, and tell them where it is running.
- When something does not ship, say why in one sentence, without softening it into
  nonsense.
