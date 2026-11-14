# Trellis: ideation and product design

> You do not quit because the topic was too hard.
> You quit because you lost the thread and never found it again.

**Version:** 7 · 12 Nov 2026

This is the ideation doc: what Trellis is, who it is for, how people use it, and every
product decision with its reason. It is the source of truth for the product. If the code
disagrees with it, fix one of them the same day.

**What changed in v7** (a design review on 12 Nov 2026; the reasons are in §16):

- Trellis now asks "how did it go?" when you come back after taking a prompt (§5, §7).
- The stuck guess now also suspects topics you marked done (§8).
- Prompts carry what worked on the topics underneath, and a hard note stays until the topic
  is done instead of being counted (§9).
- The AI is one model, **GLM 5 on Amazon Bedrock**. Jev, DeepSeek and OpenRouter are gone (§12).
- Sign-in with Google is in v1. A forgotten password is reset by the admin (§5, §14).
- The privacy promise is reworded to match what the system really does (§11).
- Trellis is hosted on AWS (§13; the details are in `docs/aws.md`).

**The other docs:** `docs/backend-design.md` (how the backend is built), `docs/aws.md` (where
it runs and what it costs), `docs/frontend.md` (how the screens are built).

---

## 1. The idea in one paragraph

Pick a subject. Trellis shows you its **map**: the big topics first, what depends on what,
what you can skip, and what to study next. Each big topic opens into its smaller topics
when you reach it, so the map starts small and grows with you. For each topic it gives you
a ready-made **prompt** to paste into your own AI. After studying, you tell the helper how
it went. When you are stuck, Trellis points to the **earlier topic that is probably the
real problem**. And it **remembers what confused you and what helped** on each topic, so
your next prompt already knows.

## 2. The problem

- **Subjects feel endless.** There is always more, so you never feel close to done, so
  stopping costs nothing.
- **Being stuck is often not about the topic in front of you.** It is usually an earlier
  topic you rushed. Another explanation of the current topic does not fix that.
- **Nothing remembers you.** Every AI chat starts from zero. You explain the same
  confusion again and nobody notices it is the same one.

## 3. The one rule

**Trellis never teaches.** It never explains a concept. Explanations are free and
everywhere, and your AI is good at them. Trellis does the part your AI cannot: it knows the
shape of the subject and your history inside it.

## 4. Who it is for

Students and self-learners studying a subject where **ideas build on each other**, where
topic B stays hard until topic A is solid.

Not for: memorisation subjects (anatomy, law, vocabulary), pure practice skills (drawing,
music), or cramming for an exam next week.

**The first real users** are the owner's classmates and juniors, most of them near Delhi.
People from outside may sign up, but the first rounds of feedback come from people the
owner can talk to. That is why the first version is hosted in Mumbai, is free, and has no
payment or growth features.

**v1 subjects:** **React Native** and **Redis**. Their topic lists are adapted from the
roadmaps at [roadmap.sh](https://roadmap.sh) (topic names and grouping). The links between
topics, what is core or optional, the summaries and the common mistakes are ours, and a
person reviews every one. The two subjects are not linked. Asking for any other subject
gets a fixed *"coming soon"*, and Trellis keeps the request so we know which map to make
next.

---

## 5. How people use it (the user flows)

### Flow 1: the first visit

1. **Sign up** with Google, or with a name, email and password. The sign-up page says in
   one line that helper messages are read by an AI model (§12).
2. **Pick a subject and a goal.** Each subject has a few ready-made goals, like *"Build and
   ship my first app"*.
3. **Sort the big topics.** For each big topic on your goal: *I know it · I'm shaky · New to
   me.* About a minute. Its smaller topics inherit your answer. Trellis believes you, but
   loosely: a topic you only *said* you know can still be named as a likely cause when you
   are stuck later (§8).
4. **See your map.** *"31 topics to learn · 48 you can skip for this goal."* It starts
   small: only the big topic you are in is open. One topic is highlighted as **next**.

### Flow 2: the study loop

1. **Open a topic and take its prompt.** Copy it, or open it straight in ChatGPT or Claude.
   Any other AI works with Copy.
2. **Learn there.** Trellis is not involved.
3. **Come back.** Trellis remembers which prompt you took. When you return it asks one
   line: *"How did State go? Got it · Partly · Stuck · Not yet."* One tap answers it.
4. **Or tell the helper in your own words.** *"my flatlist doesn't update when I add an
   item."* The helper works out the topic and how it went, asks one question, and shows
   what it will save. Nothing is saved until you press Save (§7).
5. **The map updates.** The next topic lights up, and new big topics open as you reach
   them.

Step 3 exists because the loop breaks without it. The learning happens somewhere else, so
a student has no natural reason to return and report. If they do not report, the map goes
stale and everything Trellis says is wrong.

### Flow 3: being stuck

1. You tap **Stuck**, or tell the helper something is not working.
2. The helper asks *"What's confusing about it?"* and saves your answer when you confirm.
3. Trellis names the earlier topic that **may be** the real problem, says why it thinks so,
   and hands you a prompt that starts there (§8).
4. It also says whether this is a topic to push through (*"Don't skip this. Tuning FlatList
   builds on it."*) or one you can leave for now.

### Flow 4: coming back after a break

One thing to do, no guilt, no backlog (§10). If the last prompt you took was never
reported, the one line from Flow 2 is waiting. If you forgot your password, see Flow 6.

### Flow 5: changing your goal

Use the goal menu at the top of the map. Your progress stays. If the new goal adds big
topics you never sorted, Trellis offers a short sort for just those.

### Flow 6: forgotten password (v1)

The login page says: *"Forgot your password? Email the admin from the address you signed
up with."* The admin runs a script that makes a one-time reset link and sends it back. The
admin never sees or sets a password. People who signed up with Google never need this.
Reset by email code comes later (§15).

### Flow 7: seeing, changing and deleting your record

- The **Check-ins** page lists every update and note. Each can be edited or deleted.
- **Settings** has Export (everything as one file) and Delete everything.
- Delete removes the account and every row tied to it at once. Backups that still hold it
  expire within 14 days, and the page says so.

## 6. The map (the knowledge graph)

The heart of Trellis. It has two parts.

**The subject graph, the same for everyone.** Written by us, checked by a person.

- **Two levels.** A subject is a handful of **big topics** (React Native has 19, Redis 24).
  Each big topic holds **smaller topics**, the things you actually study and check in on.
- **Topics.** Each smaller topic has a name, a one-line description of what it covers, the
  common mistakes people make with it, roughly how long it takes, and whether it is
  **core** or **optional** inside its big topic.
- **"Needs" links.** Topic B *needs* topic A: you cannot really get B without A. Links join
  two big topics, or two smaller ones. A smaller topic may need one in another big topic
  only if its own big topic stands on that one.
- **"Helps" links.** A *helps* with B, but you can manage without it.
- **Goals.** A goal is a set of target big topics. It needs those, every big topic they
  stand on, the core smaller topics inside them, and anything those need in turn.
  Everything else is **skippable for this goal**: never "unimportant", just not required
  for what you chose.

**The map starts small.** A big topic stays closed (one node, with a count of what is
inside) until you reach it. It opens when the next topic is inside it, when you check in
on something inside it, when it holds the likely reason you are stuck, or when you choose
to look inside. Once open it stays open, so the map only grows. A big topic you said you
know stays closed until you open it.

**Skip or don't skip.** Every topic says plainly which it is, and why:

- *Don't skip*: it is core to your goal, or later topics on your goal build on it (they are
  named).
- *Can skip*: it is optional and nothing on your goal needs it, or its whole big topic
  isn't needed for this goal.

This matters most when you are stuck: you can see at once whether to push through or move
on.

**Your layer, only yours.** Your status on each topic:

| Status | Meaning |
|---|---|
| New | Not started |
| Said I know / Said shaky | From your sort at signup, not yet proven. A smaller topic inherits what you said about its big topic |
| Learning | You have reported working on it |
| Stuck | You tried and got nowhere |
| Done | You reported it made sense |

A big topic's status is summed up from its smaller ones: done when every core topic inside
is done or known, stuck if any is stuck, learning if any is under way.

Plus your **experiences** on each topic: what felt easy, what felt hard, what made it
click (§7).

**Statuses are worked out, never stored.** Trellis stores only what you said (the sort,
the check-ins, the experiences) and computes the rest each time. So editing or deleting an
old check-in always gives a correct map, with nothing to repair.

**Stuck is the most useful thing you can tell us.** "I tried and got nowhere" is a
different fact from "I didn't study".

## 7. The helper (chat)

Trellis has many parts: the map, prompts, statuses, skip or not. The helper is the easy
way to use all of them. It lives in the map's side panel, one conversation per subject,
and it looks like a study diary that answers back, not like ChatGPT.

**What it does:**

- **Updates your map for you.** *"Finished FlatList"*, *"stuck on Lists"*, *"kind of get
  Expo"*: the helper marks the topic done, stuck or learning. You never have to find the
  topic and click it yourself.
- **Asks how the last prompt went.** If you took a prompt and have not reported on that
  topic since, the helper shows one line when you come back: *"How did State go?"* with
  Got it, Partly, Stuck and Not yet. It shows only the latest such topic, only once at
  least ten minutes have passed, and never mentions how long ago it was.
- **Confirms before it saves anything.** Nothing reaches your record until you say yes.
  The helper first asks its one question (below), then shows a single card with everything
  it will save, for example *"FlatList → Stuck · Hard: 'I push the new item and nothing
  re-renders'"*. You can change it before pressing **Save**, or cancel. After saving, the
  card keeps an **Undo**. When a message could mean several topics (*"finished lists"*), it
  asks which instead of guessing.
- **Asks one question about how it went**, the moment Trellis learns about you:
  - stuck → *"What's confusing about it?"*
  - partly → *"What's still unclear?"*
  - done → *"What felt easy, and was anything hard?"*
  - done after being stuck → *"What made it click?"*

  One question per update, never repeated. If your message already says why (*"got
  flatlist, keys confused me"*), it skips the question and goes straight to the confirm
  card. If you'd rather not answer, the card still comes, with just the status.
- **Once you've saved, it tells you what to do,** with a ready prompt: the next topic after
  a done, the likely real problem after a stuck (§8), the same topic after a partly.
- **Answers questions about your map**: *"what next?"*, *"can I skip Streams?"*, *"why am I
  stuck?"*, *"what does faded mean?"*. The answers come from the map, never from the
  model's own opinion.
- **Never explains a topic.** *"Explain FlatList keys"* gets a prompt for your own AI,
  built for where you are.

**What it saves.** Each answer becomes an **experience** on that topic: what felt easy,
what felt hard, what made it click. It keeps your exact words (you can see, edit and
delete them) and a clean one-line version for prompts. Experiences are what make your
next prompts yours.

The topic panel keeps *Got it · Partly · Stuck* buttons. They go through the helper too,
so the question still follows.

There is no general chat in v1.

## 8. When you are stuck

Trellis looks at the topics this one **needs**, up to two steps back, and ranks them by
how weak the evidence is that you really have them:

| Rank | The earlier topic is… | Why it is suspected |
|---|---|---|
| 1 | Never studied | You have not been there at all |
| 2 | Stuck | You are stuck there too |
| 3 | Said shaky | Your own words at the sort |
| 4 | Learning (partly) | Not finished |
| 5 | Said I know | Claimed, never checked |
| 6 | Done, with doubt | You marked it done, but it was hard: you were stuck or partway on it first, or you left a "hard" note |
| – | Done, cleanly | Not suspected |

**Your own words count too.** If what you said about being stuck uses a suspect's name, its
keywords or the words of its common mistakes, that suspect moves up three ranks. Say *"I
push the new item into the array and nothing re-renders"* about FlatList, and State moves
up, because *"nothing re-renders"* is State's best-known trap.

> **You may be stuck because of State.** FlatList needs it, and you said React basics was
> shaky at signup. Try this first → *[prompt]*

Always *"may be"*. It is a good guess, never a verdict. And if going back a step worked
for you before, Trellis says so: *"Last time, going back to Components got you through
Props."*

If nothing underneath is suspected, Trellis says so honestly and gives a prompt for the
same topic that tries a different way in.

The stuck card also says whether the topic is one to push through (*"Don't skip this.
Tuning FlatList builds on it."*) or one you can leave for now.

This ranking is a fixed rule in the code, not an AI's opinion, so Trellis can always
explain it (§11, promise 5).

## 9. The prompt

A prompt is **assembled, not generated**: no AI call. It is built in three parts, so it is
instant, free, and the same facts always give the same prompt.

1. **Known topics.** Template text filled in from your statuses: the topic and its big
   topic, which of its prerequisites you're solid on, which are shaky or new, and, when
   stuck, the likely gap (§8).
2. **Your experiences.**
   - What you told the helper about **this topic**: newest first, at most four lines.
   - Plus **what worked on the topics right underneath it**: at most two lines, "clicked"
     notes first, then "easy" ones. So the first prompt for a new topic already knows how
     you learn.
   - **A hard note stays while its topic is not done.** Once you mark the topic done, its
     hard notes leave the prompt. Hard notes from other topics are never used. An old
     difficulty does not follow you around.
3. **Instructions.** Fixed text kept in the database, in layers:
   - a base set for every prompt, always including *use my notes to shape how you teach,
     but don't remind me of past mistakes or of what I found hard*, and *when we finish,
     end with two lines I can paste back into Trellis: what I understood, and what is
     still unclear*;
   - a set for the topic's status (stuck: *"start with my gap"*; done: *"quiz me first"*);
   - the topic's own (its common mistakes, plus any extra lines).

> **Known:** I'm learning React Native (Lists) and I'm stuck on FlatList. I'm comfortable
> with ScrollView and Props. I'm shaky on State, and I think it's my real gap.
> **My experiences:** FlatList was hard: I push the new item into the array and nothing
> re-renders. Props clicked when I saw the parent owns the data.
> **Instructions:** Start with State, briefly, then connect it back to FlatList. Watch for
> the usual traps: missing or unstable keys, and changing the data array in place. Go in
> small steps and ask me a question after each one. Don't lecture.

Every sentence comes from the map or from your own words. None of it is an explanation.

**Taking a prompt is recorded.** "Taken" means copied or opened in an AI; just looking does
not count. Trellis keeps the topic and the time, which is how it knows what to ask about
when you come back (§7).

## 10. Coming back after a break

The easiest moment to get wrong. Someone stops for six weeks, then opens Trellis again.

- **One thing to do.** The smallest useful next step, from where they left off. If a
  prompt was taken and never reported, that one question comes first.
- **No guilt.** No "it's been 43 days", no streak lost, no list of what they forgot.
- **No backlog.** Nothing is presented as owed.
- **They can get back in.** Sign-in lasts 60 days from the last visit. Google sign-in has
  no password to forget. A forgotten password is one email away (§5, Flow 6).

The map remembers where they were, so they do not have to.

## 11. Our promises

1. **Your record is private.** No other student, teacher or group sees it, and Trellis has
   no screen that shows one person's record to another. To be exact about the limits:
   - The person who runs Trellis can technically reach the database, as on any hosted
     service. They do not read records, and there is no admin screen for it.
   - What you type to the helper is read by an AI model inside our own AWS account. It is
     not used to train models and is not shared with the model's maker (§12).

   If you thought someone was watching, you would stop writing "I got nowhere", and the
   map would fill up with nice-sounding lies. So we say plainly what is true.
2. **You can see and edit everything** Trellis has recorded about you.
3. **You can delete everything** from inside the app. It is gone from the live system at
   once and from backups within 14 days.
4. **No streaks, no guilt, no judging.** We never tell you what kind of person we think
   you are.
5. **We can explain everything we say**: why a topic is skippable, why we think you are
   stuck.

---

## 12. Where AI is used

| When | What | Safety net |
|---|---|---|
| Before launch, by us | Drafting summaries, mistakes and links for the roadmap.sh topic lists | A person checks every one |
| The helper | Reading what you type: which topic, how it went, your answer as a clean line | Nothing is saved until you confirm, and you can change it first; Undo after; the topic buttons work without AI |

**One model, one call.** The model is **GLM 5** (by Z.AI), used through **Amazon Bedrock**
in the Mumbai region.

| What you do | Who handles it |
|---|---|
| Tap a button (Got it, Partly, Stuck, a choice card) | Our code. No model is called |
| Type a message | One GLM 5 call reads it and returns a small typed answer: what kind of message it is, which topic, how it went, and a clean line. Our code then decides the reply |
| The model is slow, fails, or today's AI budget is spent | Our rule-based reader (`shared/helper.ts`, `shared/parse.ts`) reads the message instead. The helper keeps working, just less cleverly |

**The AI never decides.** Statuses, the next topic, skip or not, and why you are stuck are
worked out by our code from the map. The model only reads your words.

**Prompts never use AI** (§9).

**What is sent to the model:** your message, the helper's pending question if there is
one, and the subject's topic names. Never your name, email or anyone else's data. Amazon
Bedrock does not use it to train models and does not share it with the model's maker.

**Cost control.** There is a daily message limit per student and a daily spending limit
for the whole site. On the AWS free plan, running out of credits closes the account, so
these limits protect the site itself (`docs/aws.md`).

## 13. Tech

| Part | Choice |
|---|---|
| Frontend | Next.js, GSAP for motion; the map is laid out with dagre and drawn in SVG |
| Backend | Node.js, Express, TypeScript |
| Graph | **Neo4j**: topics, links and goals, seeded from the reviewed files. The site keeps working when it is down (backend-design.md §2) |
| Accounts and history | **Postgres**: users, sign-in, goals, claims, check-ins, experiences, prompts taken and helper conversations |
| AI | **GLM 5 on Amazon Bedrock**, one call per typed helper message (§12) |
| Hosting | **AWS**, Mumbai: one small EC2 server running Docker Compose, backups in S3, DNS in Route 53 (`docs/aws.md`) |

---

## 14. v1: the boundary

**In v1:**

- Sign up and log in with Google, or with email and password
- Password reset through the admin (a one-time link)
- Two subjects (React Native, Redis), each with a few ready-made goals; any other subject
  gets a fixed "coming soon", and the request is kept
- The sort at signup, one card per big topic; a short sort for new big topics after a goal
  change
- The map: big topics that open as you reach them, statuses, skippable topics, the next
  topic
- "Don't skip" or "Can skip" on every topic, with the reason
- Topic page: description, common mistakes, your notes, the prompt, open-in-AI buttons
- The helper in the map's side panel: asks how the last prompt went, asks one question,
  confirms before saving any update, hands back prompts, answers questions about the map
- Experiences saved from the helper, used in prompts
- Prompts assembled from three parts (known topics, experiences, instructions)
- "You may be stuck because of…"
- See, edit, export and delete your data

**Not in v1**, no matter how tempting:

- Reminders, notifications, emails, bots
- Streaks, points, badges, leaderboards
- Teaching, explaining or quizzes; the helper hands back a prompt instead
- A general chat outside a subject
- Students adding their own subjects or topics
- Any view of other students, individually or in groups
- An admin panel; content lives in files in the repo
- Trying Trellis before signing up (the demo on the landing page stays on sample data)

**Build order.** If time runs out, cut from the bottom:

1. The map with statuses and the next topic
2. Topic page with the prompt
3. The helper (topic buttons first)
4. Stuck suggestion
5. The helper's question and experiences in prompts
6. The "how did it go?" line on return
7. Google sign-in
8. The AI reading typed messages (the rule-based reader covers for it)
9. Big topics opening as you reach them (until then, every big topic is open)

## 15. v2: later

- **Password reset by email code**, sent with Amazon SES. The design already leaves room
  for it (backend-design.md §4, aws.md §8).
- **Reminders**: a daily message on Telegram or email; reply to check in.
- **Try before you sign up**: sort and see your map first, then sign up to keep it.
- **The model helps rank the stuck guess**, choosing only among the suspects the map
  already found.
- **Noticing avoidance**: you keep studying around one topic for a week. Trellis notices,
  quietly, and offers a smaller step instead of a louder message.
- **The shrinking step**: ignored? Fifteen minutes → one idea → the earlier topic →
  permission to drop it, with what that costs.
- **Linked subjects**: topics finished in one subject count in another that stands on them.
- **The map grows from what you say**: when you check in, Trellis asks whether you also
  covered topics you haven't reached, and opens them if you did.
- **Maps for new subjects on request**, clearly marked as a draft until a person reviews
  them.
- **Concepts across subjects**: ideas shared by many subjects (e.g. *backpressure*), so
  what you learnt in one subject helps in a very different one. This is where memory
  would carry from one subject to the next.
- **Group view**: a study group sees anonymous totals only (*"38% got stuck on FlatList
  this month"*), never individuals, never groups smaller than five.
- **Learning from everyone**: when many students get unstuck on A by going back to B,
  suggest a new link for a person to review.
- **A general chat**, for goals and anything outside one subject.
- **Richer check-ins**: connect your AI directly so it reports to Trellis for you.
- **Forgetting**: topics slowly fade and come back for a short review.
- **More subjects**, chosen for how much they share with the ones we have.

---

## 16. Decisions and why

Each row is a choice we made, what else we could have done, and why we did not.

### Product

| Decision | Alternatives we rejected | Why |
|---|---|---|
| Trellis never teaches | An AI tutor inside the app | Explanations are free everywhere. A tutor would compete with ChatGPT and lose. The map and your history are what nobody else has |
| Prompts are assembled, not generated | Ask a model to write each prompt | Instant, free, and the same facts always give the same prompt, so we can explain every line |
| Statuses are derived, never stored | A status column per topic | Editing or deleting an old check-in cannot leave a wrong status behind |
| Nothing is saved without a confirm card | Save straight from the message | The reader (a model or the rules) can misread. A wrong record quietly makes every later answer wrong |
| Ask "how did it go?" on return (v7) | Reminders; hoping students report | The learning happens elsewhere, so nothing brought students back. One tap is cheap for them and keeps the map true. Reminders are still out of v1 |
| Each prompt asks the AI to end with two lines to paste back (v7) | Nothing | It gives the student ready words for the helper, in the place where they just finished learning |
| Done topics can be suspects (v7) | Only suspect topics not marked done | The whole idea is "an earlier topic you rushed". A rushed topic is one you marked done. The old rule left out exactly those |
| The student's words move a suspect up (v7) | Status only; or let the model pick | The words often name the trap. A keyword rule stays explainable. Letting the model pick is on the v2 list |
| A hard note stays until its topic is done (v7) | "At most 2 prompts taken" | Copy then Open counted as two, so the note vanished while the student was still stuck. Tying it to status also removes the only stored counter |
| Prompts include what worked underneath (v7) | This topic's notes only | A new topic has no notes of its own, so the first prompt for every topic had no memory in it |
| One goal per subject, changeable any time | Several goals at once | One route keeps "next" unambiguous |
| "Coming soon" requests are kept (v7) | Throw them away | It costs one small table and tells us which map to build next |
| Sign-up stays before the sort | Sort first, sign up to keep it | Less to build this week. Revisit after the first feedback (§15) |

### Accounts and privacy

| Decision | Alternatives we rejected | Why |
|---|---|---|
| Google sign-in plus email and password (v7) | Password only; Google only | Google has no password to forget. Password stays for people who do not want to use Google |
| Admin makes a one-time reset link (v7) | No reset at all; email reset now | Without any reset, a forgotten password loses the whole record. Email needs Amazon SES approval, which takes time we do not have this week. With a link, the admin never knows a password |
| The privacy promise names its limits (v7) | "Nobody else sees it, not even an admin" | That was not true of any hosted system. A promise that is slightly less grand and fully true is worth more |
| No admin tool for reading records | pgAdmin in production | It made the promise false and was one more door to guard |
| Backups expire after 14 days (v7) | Keep backups forever | "Delete everything" has to mean it within a stated time |

### AI

| Decision | Alternatives we rejected | Why |
|---|---|---|
| AI only reads helper messages | AI decides statuses, next topic or the stuck cause | Those must be explainable and the same every time |
| One model call per typed message (v7) | Jev routes, then DeepSeek reads | Two calls in a row could take up to 16 seconds and made the helper clever on some messages and not others. The saving was a fraction of a cent per message |
| GLM 5 on Amazon Bedrock (v7) | DeepSeek through OpenRouter | No second bill and no second company: it runs inside the AWS account, on the free-plan credits, in Mumbai. Bedrock does not train on or share the messages |
| Bedrock in Sydney, `ap-southeast-2` (14 Nov 2026) | Mumbai, beside the users | The owner's call: close to the hosting. GLM 5 runs in both; Sydney is also a little cheaper. Costs about 0.2 seconds more per message from India |
| Rules as the fallback, not the first step (v7) | Rules first, model only when unsure | One path for all typed text keeps behaviour consistent and is easier to debug |
| Daily limits on AI use (v7) | Per-minute limit only | On the free plan, spent credits close the account. A cost limit is an uptime limit |

### Hosting (details in `docs/aws.md`)

| Decision | Alternatives we rejected | Why |
|---|---|---|
| AWS, Mumbai region (v7) | Cloudflare Tunnel to a home machine; a US region | The owner has a six-month AWS free plan, and the users are near Delhi |
| One EC2 server with Docker Compose (v7) | Lightsail; managed database (RDS); containers on ECS | It fits the credits, and EC2 is what production jobs use. RDS alone would use most of the budget |
| Neo4j kept, but the site runs without it (v7) | Neo4j required at start; dropping Neo4j | It is kept for the course and for v2. Nothing a student sees needs it, so it must not be able to take the site down |
| Only the subdomain's DNS moves to Route 53 (v7) | Move the whole domain; keep everything at GoDaddy | The parent domain is untouched, and every Trellis record lives next to the rest of the setup |

## 17. Open questions

Nothing blocks the build. These are to be decided from what the first users do:

- Does the "how did it go?" line get answered, or dismissed? If dismissed, the wording or
  the timing is wrong.
- How often is the stuck guess right? The check-ins will show whether a student went to
  the suspected topic and then got unstuck.
- Should sign-up move after the sort (§15)?
- Before the free plan ends on 12 May 2027: upgrade to a paid AWS account, or stop
  (`docs/aws.md` §10).
