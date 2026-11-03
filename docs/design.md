# Trellis — design

> You do not quit because the topic was too hard.
> You quit because you lost the thread and never found it again.

**Version:** 6 · 3 Nov 2026 (v6: the helper chat; prompts assembled from three parts, no AI. v5: React Native and Redis; big topics that open as you reach them; skip or don't skip)

This document is the truth. If the code disagrees with it, fix one of them the same day.

---

## 1. The idea in one paragraph

Pick a subject. Trellis shows you its **map**: the big topics first, what depends on what,
what you can skip, and what to study next. Each big topic opens into its smaller topics
when you reach it, so the map starts small and grows with you. For each topic it gives you a ready-made **prompt** to
paste into your own AI. After studying, you tell the helper how it went. When
you are stuck, Trellis points to the **earlier topic that is probably the real problem**.
And it **remembers what confused you and what helped**, so you never explain yourself
twice — not even when you start the next subject.

## 2. The problem

- **Subjects feel endless.** There is always more, so you never feel close to done, so
  stopping costs nothing.
- **Being stuck is often not about the topic in front of you.** It is usually an earlier
  topic you rushed. Another explanation of the current topic does not fix that.
- **Nothing remembers you.** Every AI chat starts from zero. You hit the same wall in the
  next subject and nobody notices it is the same wall.

## 3. The one rule

**Trellis never teaches.** It never explains a concept. Explanations are free and
everywhere — your AI is good at them. Trellis does the part your AI cannot: it knows the
shape of the subject and your history inside it.

## 4. Who it is for

Students and self-learners studying a subject where **ideas build on each other** —
where topic B stays hard until topic A is solid.

Not for: memorisation subjects (anatomy, law, vocabulary), pure practice skills (drawing,
music), or cramming for an exam next week.

**v1 subjects:** **React Native** and **Redis**. Their topic lists are adapted from the
roadmaps at [roadmap.sh](https://roadmap.sh) (topic names and grouping); the links between
topics, what is core or optional, the summaries and the common mistakes are ours, and a
person reviews every one. The two subjects are not linked. Asking for any other subject
gets a fixed *"coming soon"*.

---

## 5. How it works

1. **Sign up and pick a subject and a goal.** Each subject has a few ready-made goals,
   like *"Build and ship my first app"*.
2. **Sort the big topics.** For each big topic on your goal: *I know it · I'm shaky · New
   to me.* About a minute. Its smaller topics inherit your answer. Trellis believes you,
   but loosely.
3. **See your map.** *"31 topics to learn · 48 you can skip for this goal."* It starts
   small: only the big topic you are in is open. One topic is highlighted as **next**.
4. **Study.** Open a topic. Trellis gives you a prompt. Copy it, or open it straight in
   ChatGPT, Claude or Gemini. Learn there.
5. **Tell the helper.** Back on Trellis, tell the helper in the side panel: *"my flatlist
   doesn't update when I add an item."* It marks FlatList stuck, asks what's confusing,
   and hands you a prompt for what's probably underneath.
6. **Repeat.** The map updates, the next topic lights up, and new big topics open as you
   reach them. By the end the map is big, and all of it is yours.

## 6. The map (the knowledge graph)

The heart of Trellis. It has two parts:

**The subject graph — the same for everyone.** Written by us, checked by a person.

- **Two levels.** A subject is a handful of **big topics** (React Native has 19, Redis 24).
  Each big topic holds **smaller topics** — the things you actually study and check in on.
- **Topics.** Each smaller topic has a name, a one-line description of what it covers,
  the common mistakes people make with it, roughly how long it takes, and whether it is
  **core** or **optional** inside its big topic.
- **"Needs" links.** Topic B *needs* topic A: you cannot really get B without A. Links join
  two big topics, or two smaller ones. A smaller topic may need one in another big topic
  only if its own big topic stands on that one.
- **"Helps" links.** A *helps* with B, but you can manage without it.
- **Goals.** A goal is a set of target big topics. It needs those, every big topic they
  stand on, the core smaller topics inside them, and anything those need in turn.
  Everything else — optional topics, and big topics the goal doesn't stand on — is
  **skippable for this goal**: never "unimportant", just not required for what you chose.

**The map starts small.** A big topic stays closed — one node, with a count of what is
inside — until you reach it. It opens when the next topic is inside it, when you check in
on something inside it, when it holds the likely reason you are stuck, or when you choose
to look inside. Once open it stays open, so the map only grows. A big topic you said you
know stays closed until you open it.

**Skip or don't skip.** Every topic says plainly which it is, and why:

- *Don't skip* — it is core to your goal, or later topics on your goal build on it (they
  are named).
- *Can skip* — it is optional and nothing on your goal needs it, or its whole big topic
  isn't needed for this goal.

This matters most when you are stuck: you can see at once whether to push through or move
on.

**Your layer — only yours.** Your status on each topic:

| Status | Meaning |
|---|---|
| New | Not started |
| Said I know / Said shaky | From your sort at signup — not yet proven. A smaller topic inherits what you said about its big topic |
| Learning | You have reported working on it |
| Stuck | You tried and got nowhere |
| Done | You reported it made sense |

A big topic's status is summed up from its smaller ones: done when every core topic inside
is done or known, stuck if any is stuck, learning if any is under way.

Plus your **experiences** on each topic: what felt easy, what felt hard, what made it
click (§7).

**Stuck is the most useful thing you can tell us.** "I tried and got nowhere" is a
different fact from "I didn't study".

## 7. The helper (chat)

Trellis has many parts — the map, prompts, statuses, skip or not. The helper is the easy
way to use all of them. It lives in the map's side panel, one conversation per subject,
and it looks like a study diary that answers back, not like ChatGPT.

**What it does:**

- **Updates your map for you.** *"Finished FlatList"*, *"stuck on Lists"*, *"kind of get
  Expo"* — the helper marks the topic done, stuck or learning. You never have to find the
  topic and click it yourself.
- **Confirms before it saves anything.** Nothing reaches your record until you say yes.
  The helper first asks its one question (below), then shows a single card with
  everything it will save — *"FlatList → Stuck · Hard: 'I push the new item and nothing
  re-renders'"* — which you can change before pressing **Save**, or cancel. After saving,
  the card keeps an **Undo**. When a message could mean several topics (*"finished
  lists"*), it asks which instead of guessing.
- **Asks one question about how it went** — the moment Trellis learns about you:
  - stuck → *"What's confusing about it?"*
  - partly → *"What's still unclear?"*
  - done → *"What felt easy, and was anything hard?"*
  - done after being stuck → *"What made it click?"*

  One question per update, never repeated. If your message already says why (*"got
  flatlist, keys confused me"*), it skips the question and goes straight to the confirm
  card. If you'd rather not answer, the card still comes, with just the status.
- **Once you've saved, it tells you what to do,** with a ready prompt: the next topic after a done, the
  likely real problem after a stuck (§8), the same topic after a partly.
- **Answers questions about your map** — *"what next?"*, *"can I skip Streams?"*, *"why am
  I stuck?"*, *"what does faded mean?"*. The answers come from the map, never from the
  model's own opinion.
- **Never explains a topic.** *"Explain FlatList keys"* gets a prompt for your own AI,
  built for where you are.

**What it saves.** Each answer becomes an **experience** on that topic: what felt easy,
what felt hard, what made it click. It keeps your exact words (you can see, edit and
delete them) and a clean one-line version for prompts. Experiences are what make your
next prompts yours.

The topic panel keeps *Got it · Partly · Stuck* buttons; they go through the helper too,
so the question still follows.

## 8. When you are stuck

Trellis looks at the topics this one **needs** (up to two steps back) and picks the
weakest one: never studied, then stuck, then "said shaky", then "said I know".

> **You may be stuck because of State.** FlatList needs it, and you said React basics was
> shaky at signup. Try this first → *[prompt]*

Always *"may be"*. It is a good guess, never a verdict. And if going back a step worked
for you before, Trellis says so: *"Last time, going back to Components got you through
Props."*

The stuck card also says whether the topic is one to push through (*"Don't skip this.
Tuning FlatList builds on it."*) or one you can leave for now.

## 9. The prompt

A prompt is **assembled, not generated** — no AI call. It is built from the database in
three parts, so it is instant, free, and the same facts always give the same prompt:

1. **Known topics** — template text filled in from your statuses: the topic and its big
   topic, which of its prerequisites you're solid on, which are shaky or new, and, when
   stuck, the likely gap (§8).
2. **Your experiences** — what you told the helper before about **this topic only**.
   Newest first, at most four lines. This part changes after every chat. **A bad experience (what
   felt hard) goes into at most two prompts the student takes** — copied or opened in their
   AI; just looking doesn't count — then it is left out, so an old difficulty doesn't
   follow them around.
3. **Instructions** — fixed text kept in the database, in layers: a base set for every
   prompt (always including: *use my notes to shape how you teach, but don't remind me of
   past mistakes or of what I found hard*), a set for the topic's status (stuck: *"start with my gap"*; done: *"quiz me
   first"*), and the topic's own (its common mistakes, plus any extra lines).

> **Known:** I'm learning React Native (Lists) and I'm stuck on FlatList. I'm comfortable
> with ScrollView and Props. I'm shaky on State, and I think it's my real gap.
> **My experiences:** FlatList was hard: I push the new item into the array and nothing
> re-renders.
> **Instructions:** Start with State, briefly, then connect it back to FlatList. Watch for
> the usual traps: missing or unstable keys, and changing the data array in place. Go in
> small steps and ask me a question after each one. Don't lecture.

Every sentence comes from the map or from your own words. None of it is an explanation.

## 10. Coming back after a break

The easiest moment to get wrong. Someone stops for six weeks, then opens Trellis again.

- **One thing to do.** The smallest useful next step, from where they left off.
- **No guilt.** No "it's been 43 days", no streak lost, no list of what they forgot.
- **No backlog.** Nothing is presented as owed.

The map remembers where they were, so they do not have to.

## 11. Our promises

1. **Your record is private.** Nobody else sees it — not a teacher, not an admin, not a
   group you study with. If you thought someone was watching, you would stop writing
   "I got nowhere", and the map would fill up with nice-sounding lies.
2. **You can see and edit everything** Trellis has recorded about you.
3. **You can delete everything**, permanently, from inside the app.
4. **No streaks, no guilt, no judging.** We never tell you what kind of person we think
   you are.
5. **We can explain everything we say** — why a topic is skippable, why we think you
   are stuck.

---

## 12. Where AI is used

| When | What | Safety net |
|---|---|---|
| Before launch, by us | Drafting summaries, mistakes and links for the roadmap.sh topic lists | A person checks every one |
| The helper | Reading what you say: which topic, how it went, your answer as a clean line; wording replies from facts the map works out | Nothing is saved until you confirm, and you can change it first; Undo after; the topic buttons work without AI |

**Two models, cheapest first.** Every message to the helper first goes to **Jev**
(TypeSafe AI), a model that doesn't write text but returns a typed decision with a
confidence: which *path* the message takes.

| Path | Who handles it |
|---|---|
| Asking what's next · can I skip · why am I stuck · how Trellis works · "explain X" (→ a prompt) | Our code and templates. No text model called |
| Reporting a topic (done / partly / stuck) · answering the helper's question | DeepSeek: finds the topic, reads how it went, writes the clean line |
| Low confidence, or anything else | DeepSeek, or the helper asks |

Most messages never reach DeepSeek, which is what keeps it cheap. Both models come through
OpenRouter (the backend already uses its SDK); if Jev fails, DeepSeek does the routing too.
The stand-in in `frontend/lib/helper.ts` routes the same way, with patterns where Jev will
be.

**Prompts never use AI** (§9). The AI is called only when you talk to the helper. It never
decides statuses, the next topic, skip or not, or why you're stuck — Trellis works those
out and the AI only words them. What you tell the helper is sent to DeepSeek through
OpenRouter to be read; nothing else is.



## 13. Tech

| Part | Choice |
|---|---|
| Frontend | Next.js, GSAP for motion; the map is laid out with dagre and drawn in SVG |
| Backend | Node.js, Express |
| Graph | **Neo4j**: topics, links and goals, seeded from the reviewed files; loaded into memory for the derived logic (backend-design.md §2). Statuses are derived, never stored |
| Accounts & history | **Postgres**: users, login, goals, claims, check-ins, experiences and helper conversations (the record of truth) |
| AI | Through OpenRouter: **Jev** (TypeSafe AI) to route each helper message to a path; **DeepSeek** to read and word the ones that need language (§12) |

---

## 14. v1 — the boundary

**In v1:**

- Sign up / log in
- Two subjects (React Native, Redis), each with a few ready-made goals; any other subject
  gets a fixed "coming soon"
- The sort at signup, one card per big topic
- The map: big topics that open as you reach them, statuses, skippable topics, the next
  topic
- "Don't skip" or "Can skip" on every topic, with the reason
- Topic page: description, common mistakes, your notes, the prompt, open-in-AI buttons
- The helper in the map's side panel: asks one question, confirms before saving any
  update, hands back prompts, answers questions about the map
- Experiences saved from the helper, used in prompts
- Prompts assembled from three parts (known topics, experiences, instructions)
- "You may be stuck because of…"
- See, edit and delete your data

**Not in v1** — no matter how tempting:

- Reminders, notifications, emails, bots
- Streaks, points, badges, leaderboards
- Teaching, explaining or quizzes — the helper hands back a prompt instead
- A general chat outside a subject
- Students adding their own subjects or topics
- Any view of other students, individually or in groups
- An admin panel — content lives in files in the repo

**Build order.** If time runs out, cut from the bottom:

1. The map with statuses and the next topic
2. Topic page with the prompt
3. The helper (topic buttons first, the AI reading messages on top)
4. Stuck suggestion
5. The helper's question and experiences in prompts
6. Big topics opening as you reach them (until then, every big topic is open)

## 15. v2 — later

- **Reminders** — a daily message on Telegram or email; reply to check in.
- **Noticing avoidance** — you keep studying around one topic for a week. Trellis
  notices, quietly, and offers a smaller step instead of a louder message.
- **The shrinking step** — ignored? Fifteen minutes → one idea → the earlier topic →
  permission to drop it, with what that costs.
- **Linked subjects** — topics finished in one subject count in another that stands on
  them (v4 had this for Networking and Express).
- **The map grows from what you say** — when you check in, Trellis asks whether you also
  covered topics you haven't reached (people learn more from their AI than they planned),
  and opens them if you did. When you're confused, it brings in the topic underneath.
- **Maps for new subjects on request** — instead of "coming soon", a drafted map, clearly
  marked as a draft until a person reviews it.
- **Concepts across subjects** — ideas shared by many subjects (e.g. *backpressure*:
  TCP flow control, Node streams, rate limiting), so what you learnt in one subject
  helps in a very different one.
- **Group view** — a study group or club sees anonymous totals only (*"38% got stuck on
  FlatList this month"*), never individuals, never groups smaller than five.
- **Learning from everyone** — when many students get unstuck on A by going back to B,
  suggest a new link for a person to review.
- **A general chat** — for goals and anything outside one subject.
- **Richer check-ins** — paste a summary from your AI chat, or connect your AI directly
  so it reports to Trellis for you.
- **Forgetting** — topics slowly fade and come back for a short review.
- **More subjects** — chosen for how much they share with the ones we have.
