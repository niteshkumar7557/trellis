# The learning path — React, TypeScript, Next.js

**For:** the two teammates learning frontend from scratch.
**Run by:** Nitesh. Companion to [`learners.md`](./learners.md), which says what their work
is for. This file says what to learn, in what order, and how to know it worked.

**No backend in this path.** Not yet, and not by accident — adding it now would slow both
of you down and teach neither thing properly.

**The live version of this is the app in `~/Desktop/thread-learn`**, deployed to Vercel.
It carries the same path broken down to the exact timestamps of each course, with a test
at the end of every section and progress tracked per person. This file is the narrative
version; the app is the one to work from day to day.

---

## The resources, in the order to use them

| # | Course | When |
|---|---|---|
| 1 | [The Biggest React.js Course](https://youtu.be/qnwFpjIqsrA) | Phase 2 — watch to **6:45:00** and stop |
| 2 | [TypeScript course](https://youtu.be/kvP6hDXWy88) | Phase 3 — all of it |
| 1 | The React course again | Phase 4 — from **6:45:00** to the end |
| 3 | [The Biggest Next.js Course](https://youtu.be/QIDkK0FbXDc) | Phase 5 — all of it |

That order is deliberate: you learn enough React to be dangerous, then learn types on code
you already understand, then finish React with types in hand.

## The one rule of this path

**Video progress is not skill.**

A phase is not done when the video ends. It is done when you can build the thing with the
video **closed**. Nine hours of watching produces a person who recognises code. Two hours
of building produces a person who writes it.

So every phase below has three parts: what to watch, **what you must be able to do
without help**, and **something you build**. Only the last two count.

## Roughly how long

| Phase | Time |
|---|---|
| 0 · Setup | one evening |
| 1 · The JavaScript you need first | 4–6 days |
| 2 · React, first half | 2 weeks |
| 3 · TypeScript | 1 week |
| 4 · React, second half | 1.5 weeks |
| 5 · Next.js | 1.5 weeks |

Around seven weeks, which is roughly the length of the project. Slower is completely fine.
Skipping phase 1 is not.

---

# Phase 0 — Setup

One evening. Do it properly once and never think about it again.

- [ ] Node installed; `node -v` and `npm -v` both print a version
- [ ] VS Code installed
- [ ] Extensions: ES7 React snippets, Prettier, ESLint
- [ ] Prettier set to format on save
- [ ] A `practice/` folder, with `git init` and a first commit
- [ ] A GitHub account, and that first commit pushed
- [ ] Browser devtools: you can open the Console and the Elements tab
- [ ] You know how to read a red error in the console — file, line, message

**Done when** you can create a project, change a file, and push it, without looking
anything up.

---

# Phase 1 — The JavaScript you need first

**Do not skip this.** It is the single most common reason people bounce off React. React
is JavaScript; if the JavaScript is unfamiliar, React feels like magic, and magic cannot be
debugged.

You do not need *all* of JavaScript. You need exactly this list.

### Learn
- [ ] `let` and `const`, and why `var` is not used any more
- [ ] Arrow functions, and how they differ from `function`
- [ ] Template literals — backticks and `${ }`
- [ ] Destructuring, on objects **and** arrays
- [ ] Spread `...` and rest, on objects and arrays
- [ ] Array methods: `map`, `filter`, `find`, `reduce`, `includes`, `sort`
- [ ] Optional chaining `?.` and nullish coalescing `??`
- [ ] Ternaries, and short-circuit `&&` / `||`
- [ ] `Object.keys`, `Object.values`, `Object.entries`
- [ ] Truthy and falsy — and which values are falsy
- [ ] Promises, `async` / `await`, and `try` / `catch`
- [ ] `fetch`, and turning a response into JSON
- [ ] ES modules: `import` / `export`, default versus named
- [ ] **Copying instead of mutating** — why `[...arr, x]` rather than `arr.push(x)`

That last one matters more than it looks. React decides whether to re-render by checking
whether a value **changed identity**, not whether its contents differ. Mutate an array in
place and React sees the same array and does nothing, and you will spend an hour
convinced React is broken.

### Prove it — video closed
- [ ] Given an array of objects, produce a new array of just one field
- [ ] Given the same array, filter it and count what is left
- [ ] Add an item to an array **without** changing the original
- [ ] Update one field of an object **without** changing the original
- [ ] Write an `async` function that fetches JSON and handles a failure
- [ ] Explain to the other learner why `const` still lets you change an object's fields

**Done when** all six take you under ten minutes each, with nothing open but the editor.

---

# Phase 2 — React, to 6:45:00

Watch [the React course](https://youtu.be/qnwFpjIqsrA) up to **6:45:00**, then stop and
come back here.

### Learn
- [ ] What React is actually for: the screen is a function of your data
- [ ] JSX: one root element, `className`, `{ }` for expressions, self-closing tags
- [ ] Components, and why their names start with a capital letter
- [ ] Props — passing data down
- [ ] `props.children`
- [ ] `useState`: reading, setting, and the functional form `setX(prev => …)`
- [ ] **Never mutate state.** Copy, change the copy, set it
- [ ] Rendering a list with `map`
- [ ] Keys, and why an array index is usually a bad key
- [ ] Conditional rendering: `&&`, a ternary, or an early `return`
- [ ] Events: `onClick`, `onChange`, and passing arguments to a handler
- [ ] Controlled inputs, and a form that does not reload the page
- [ ] Lifting state up — when two components need the same value
- [ ] `useEffect`: when it runs, the dependency array, and the cleanup function
- [ ] Fetching data in an effect, with loading and error states
- [ ] `useRef`, for reaching a DOM node
- [ ] Pulling repeated logic into a custom hook
- [ ] Breaking a design into components — where the seams go

### Prove it — video closed
- [ ] A counter with plus, minus and reset
- [ ] A list you can add to and delete from, with sensible keys
- [ ] A search box that filters that list as you type
- [ ] A component that shows *loading*, *error* and *empty* states from fake data
- [ ] Explain the difference between props and state, out loud, in two sentences

### Build — for Thread's `ui-lab`
- [ ] A **waypoint row** that renders in three states: learn, check, skippable
- [ ] The **route list**, from a fake array
- [ ] The **three-number summary**: "7 to learn, 4 you can skip, 3 quick checks"
- [ ] An **empty state** for a brand-new account
- [ ] All four work at phone width
- [ ] None of them break when the array is empty

**Done when** you can rebuild the waypoint row from nothing, in under twenty minutes,
with the video closed.

---

# Phase 3 — TypeScript

All of [the TypeScript course](https://youtu.be/kvP6hDXWy88).

You are learning types on code you already wrote and already understand. That is why this
comes now and not first — learning types and React at the same time means learning
neither.

### Learn
- [ ] What a type actually buys you: the error you catch **before** you run it
- [ ] Primitives, arrays, and tuples
- [ ] `type` aliases and `interface`, and when each is normal
- [ ] Union types `A | B`, and literal types `"learn" | "check" | "skippable"`
- [ ] Optional properties `?` and `readonly`
- [ ] Typing a function's parameters and its return
- [ ] Generics, just enough: `<T>` on a function, and on a component
- [ ] Narrowing: `typeof`, `in`, truthiness, and discriminated unions
- [ ] `unknown` versus `any` — and why `any` is a promise you are lying about
- [ ] Utility types: `Partial`, `Pick`, `Omit`, `Record`
- [ ] Typing React props
- [ ] `ReactNode`, for children
- [ ] `useState<T>()` when the type cannot be inferred
- [ ] Event types: `ChangeEvent`, `MouseEvent`, `FormEvent`
- [ ] `tsconfig.json`: turn **strict on** and leave it on

### Prove it — video closed
- [ ] Type a function that takes an array of objects and returns a filtered array
- [ ] Model a waypoint as a type with a literal union for its state
- [ ] Use `Omit` or `Pick` to derive one type from another rather than retyping it
- [ ] Explain what red squiggle you would get if you passed the wrong prop

### Build
- [ ] Convert **every** Phase 2 component to TypeScript
- [ ] A shared `types.ts` for the shapes they all use
- [ ] **Zero `any`** in your own code
- [ ] Strict mode on, and no errors

**Done when** someone can pass a wrong prop to your component and the editor stops them
before the browser does.

---

# Phase 4 — React, 6:45:00 to the end

Back to [the React course](https://youtu.be/qnwFpjIqsrA), and finish it — now writing
everything in TypeScript rather than plain JavaScript.

### Learn
- [ ] `useContext` — and when it is overkill compared with just passing a prop
- [ ] `useReducer`, for state with several moving parts
- [ ] `useMemo` and `useCallback` — and **when not to use them**
- [ ] What actually causes a re-render
- [ ] React Router: routes, links, URL parameters, nested layouts
- [ ] Data fetching patterns, and always handling loading / error / empty
- [ ] Forms with several fields and validation
- [ ] Anything else the course covers — treat Redux or Tailwind as optional extras

### Prove it — video closed
- [ ] A small app with three routes and shared layout
- [ ] A piece of state shared across two routes without prop-drilling it through five files
- [ ] Explain why a component re-rendered, using the devtools

### Build — for Thread's `ui-lab`
- [ ] The **know / shaky / never-seen sorting card** from onboarding
- [ ] A **Kero message card** showing a prompt, with a copy button that works on a phone
- [ ] Both fully typed
- [ ] Both work with keyboard only — tab to them, activate with Enter

**Done when** you can add a new component to `ui-lab` without asking where anything goes.

---

# Phase 5 — Next.js

All of [the Next.js course](https://youtu.be/QIDkK0FbXDc).

### Learn
- [ ] What Next gives you that plain React does not
- [ ] The App Router: **folders are routes**
- [ ] `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- [ ] Server components by default — and what that actually means
- [ ] `"use client"`, and the signs you need it (state, effects, event handlers)
- [ ] `<Link>` and client-side navigation
- [ ] Dynamic routes `[slug]`, and reading params
- [ ] Metadata: page title and description
- [ ] `next/image` and `next/font`
- [ ] Static files in `public/`
- [ ] Deploying to Vercel

### Prove it — video closed
- [ ] Create a new route by making a folder, with no reference
- [ ] Say which of your components need `"use client"` and why
- [ ] Explain the difference between a server and a client component to the other learner

### Build — real, and shipped
- [ ] The **Thread landing page**: the problem, the four features, one screenshot
- [ ] An **about page** explaining what Thread deliberately does not do
- [ ] Correct page titles and descriptions
- [ ] Works on a phone
- [ ] **Deployed to a public URL**, and the link sent to Nitesh

**Done when** someone who has never heard of Thread reads your landing page and can say
what it does.

---

# Phase 6 — Ready

Not a phase to work through. A list of things that are now true.

- [ ] You can read an error message and know which file to open
- [ ] You can build a page from a written description, with no tutorial open
- [ ] You can explain props versus state, and server versus client components
- [ ] You can type a component's props without copying an example
- [ ] You have a deployed URL with your name on it
- [ ] Something you built is running in the real project

That last one is the real graduation, and it is the sentence you put in a CV.

---

# The habits that decide whether this works

More important than any list above. Every one of these is the difference between finishing
and quietly stopping in week three.

- [ ] **Type every line.** Never copy-paste from the video. Typing it wrong and fixing it
      is the learning; copying it right is not.
- [ ] **Pause and predict.** Before he shows the answer, say what you think it will be.
      Being wrong out loud is worth ten minutes of watching.
- [ ] **Close the video and rebuild one thing** at the end of every phase.
- [ ] **45 minutes most days beats five hours on Sunday.** Every time.
- [ ] **Commit every session**, even broken code. `git push` at the end.
- [ ] **Stuck for 20 minutes?** Read the error out loud, check the line it names, then ask.
      Not before twenty minutes, and not after forty.
- [ ] **Teach it to the other one.** The fastest way to discover you do not actually know
      something is to try to explain it.
- [ ] **Write down what confused you.** That list is worth more to the project than the
      code, because it is real user research on our own docs.

# How Nitesh runs this

- Fifteen minutes a week each, looking at code together. No more — this is not a course.
- **Review the build, never the video progress.** "Where are you in the video" is the
  wrong question; "show me the thing you made" is the right one.
- Never silently rewrite their code. Comment, and let them fix it.
- When something they built ships, tell them, and tell them where it is running.
- If a phase takes twice as long as the estimate, that is normal and is not a problem.
  Say so out loud, because they will assume it is.
