"use client";

// The client store: everything the screens show about the student, in two modes.
//
//   demo  a visitor who isn't signed in. The sample student, kept in localStorage, with the
//         rule-based helper running in the browser. Nothing leaves the page.
//   live  a signed-in student. Loaded from GET /api/state; every change is a request, and
//         the store applies what the server answers.
//
// On load the store tries one refresh (lib/api.ts). If the refresh cookie is good, it goes
// live; if not, demo. While it finds out, mode is "loading" and the app shell waits.
//
// Screens never ask which mode they're in. They call `act.*` (setGoal, editCheckIn, ...),
// and each action does the right thing for the mode. Derived facts (statuses, goal) are
// worked out here on every change, never stored: the same rule as the backend.

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { goalById, topicById } from "@shared/data";
import { TODAY, sampleCheckIns, sampleClaims, sampleExperiences, sampleMessages, student as sampleStudent } from "@shared/data/student";
import { deriveStatuses } from "@shared/graph";
import { checkInText } from "@shared/helper";
import type { ChatMessage, CheckIn, Claim, ClaimKind, Experience, Goal, PromptTake, Proposal, Status, Student, SubjectId } from "@shared/types";
import { ApiError, api, refreshAccessToken, setAccessToken, whenSignedOut } from "./api";

export interface State {
  student: Student;
  claims: Claim[];
  checkIns: CheckIn[];
  /** What the student told the helper about how things went. */
  experiences: Experience[];
  /** The helper conversations, every subject, oldest first. In live mode, the latest 50 per subject. */
  messages: ChatMessage[];
  /** Live mode: whether a subject has older messages to load. */
  moreMessages: Partial<Record<SubjectId, boolean>>;
  promptTakes: PromptTake[];
  subjectId: SubjectId;
  goalIds: Partial<Record<SubjectId, string>>;
  /** Big topics the student chose to look inside before reaching them. */
  opened: string[];
  /** The topic open in the map's side panel. Not saved. */
  selected: string | null;
  /** A question from search waiting for the helper to pick it up. Not saved. */
  asking?: string | null;
}

/** What GET /api/state answers (backend-design.md §4). */
interface ServerState {
  student: Student;
  goalIds: Partial<Record<SubjectId, string>>;
  claims: Claim[];
  checkIns: CheckIn[];
  experiences: Experience[];
  opened: string[];
  promptTakes: PromptTake[];
  messages: ChatMessage[];
  moreMessages: Partial<Record<SubjectId, boolean>>;
}

export type Action =
  | { type: "hydrate"; state: State }
  | { type: "select"; topicId: string | null }
  | { type: "ask"; text: string | null }
  | { type: "subject"; subjectId: SubjectId }
  | { type: "goal"; subjectId: SubjectId; goalId: string }
  | { type: "claims"; claims: Claim[] }
  | { type: "open"; topicId: string }
  | { type: "edit"; checkIn: CheckIn }
  | { type: "remove"; id: string }
  | { type: "say"; message: ChatMessage }
  /** Demo: save a confirm card's (possibly edited) proposal, making the rows here. */
  | { type: "save"; messageId: string; card: number; proposal: Proposal; at: string }
  | { type: "cancel"; messageId: string; card: number }
  | { type: "undo"; messageId: string; card: number }
  /** Live: the server saved a proposal; apply its answer. */
  | { type: "saved"; message: ChatMessage; followUp: ChatMessage; checkIns: CheckIn[]; experiences: Experience[] }
  /** Live: the server cancelled or undid a proposal; `removed` lists what an undo deleted. */
  | { type: "message"; message: ChatMessage; removed?: { checkIns: string[]; experiences: string[] } }
  /** Live: an older page of one subject's thread. */
  | { type: "older"; subjectId: SubjectId; messages: ChatMessage[]; more: boolean }
  | { type: "editExperience"; experience: Experience }
  | { type: "removeExperience"; id: string }
  /** Demo: the student took a prompt; count the experiences that were in it. */
  | { type: "used"; experienceIds: string[] }
  | { type: "took"; take: PromptTake }
  | { type: "student"; student: Student }
  | { type: "erase" }
  | { type: "reset" };

const demoInitial: State = {
  student: sampleStudent,
  claims: sampleClaims,
  checkIns: sampleCheckIns,
  experiences: sampleExperiences,
  messages: sampleMessages,
  moreMessages: {},
  promptTakes: [],
  subjectId: "react-native",
  goalIds: Object.fromEntries(sampleStudent.goals.map((g) => [g.subjectId, g.goalId])),
  opened: [],
  selected: null,
};

/** A new open proposal retires older open ones in its subject (the server does the same). */
function retireOpen(messages: ChatMessage[], subjectId: SubjectId): ChatMessage[] {
  return messages.map((m) =>
    m.subjectId === subjectId && m.cards?.some((c) => c.type === "confirm" && c.state === "open")
      ? { ...m, cards: m.cards.map((c) => (c.type === "confirm" && c.state === "open" ? { ...c, state: "cancelled" as const } : c)) }
      : m,
  );
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...action.state, selected: null };
    case "select":
      return { ...state, selected: action.topicId };
    case "ask":
      return action.text ? { ...state, asking: action.text, selected: null } : { ...state, asking: null };
    case "subject":
      return { ...state, subjectId: action.subjectId, selected: null };
    case "goal":
      return { ...state, subjectId: action.subjectId, goalIds: { ...state.goalIds, [action.subjectId]: action.goalId } };
    case "claims": {
      const replaced = new Set(action.claims.map((c) => c.topicId));
      return { ...state, claims: [...state.claims.filter((c) => !replaced.has(c.topicId)), ...action.claims] };
    }
    case "open":
      return state.opened.includes(action.topicId) ? state : { ...state, opened: [...state.opened, action.topicId] };
    case "edit":
      return { ...state, checkIns: state.checkIns.map((c) => (c.id === action.checkIn.id ? action.checkIn : c)) };
    case "remove":
      return { ...state, checkIns: state.checkIns.filter((c) => c.id !== action.id) };
    case "say": {
      const proposes = action.message.cards?.some((c) => c.type === "confirm" && c.state === "open");
      const older = proposes ? retireOpen(state.messages, action.message.subjectId) : state.messages;
      return { ...state, messages: [...older, action.message] };
    }
    case "save": {
      const checkIns: CheckIn[] = action.proposal.updates.map((u) => ({
        id: newId("c"),
        at: action.at,
        text: checkInText(action.proposal, u),
        topicId: u.topicId,
        outcome: u.outcome,
        messageId: action.messageId,
      }));
      const experiences: Experience[] = action.proposal.experiences
        .filter((e) => e.text.trim())
        .map((e) => ({ id: newId("e"), at: action.at, ...e, messageId: action.messageId }));
      return {
        ...state,
        checkIns: [...state.checkIns, ...checkIns],
        experiences: [...state.experiences, ...experiences],
        messages: withCard(state.messages, action.messageId, action.card, (c) =>
          c.type === "confirm"
            ? { ...c, proposal: action.proposal, state: "saved", saved: { checkIns: checkIns.map((x) => x.id), experiences: experiences.map((x) => x.id) } }
            : c,
        ),
      };
    }
    case "cancel":
      return { ...state, messages: withCard(state.messages, action.messageId, action.card, (c) => (c.type === "confirm" ? { ...c, state: "cancelled" } : c)) };
    case "undo": {
      const card = state.messages.find((m) => m.id === action.messageId)?.cards?.[action.card];
      if (card?.type !== "confirm" || !card.saved) return state;
      const c = new Set(card.saved.checkIns);
      const e = new Set(card.saved.experiences);
      return {
        ...state,
        checkIns: state.checkIns.filter((x) => !c.has(x.id)),
        experiences: state.experiences.filter((x) => !e.has(x.id)),
        messages: withCard(state.messages, action.messageId, action.card, (x) => (x.type === "confirm" ? { ...x, state: "undone" } : x)),
      };
    }
    case "saved":
      return {
        ...state,
        checkIns: [...state.checkIns, ...action.checkIns],
        experiences: [...state.experiences, ...action.experiences],
        messages: [...replaceMessage(state.messages, action.message), action.followUp],
      };
    case "message": {
      const c = new Set(action.removed?.checkIns ?? []);
      const e = new Set(action.removed?.experiences ?? []);
      return {
        ...state,
        checkIns: state.checkIns.filter((x) => !c.has(x.id)),
        experiences: state.experiences.filter((x) => !e.has(x.id)),
        messages: replaceMessage(state.messages, action.message),
      };
    }
    case "older": {
      // The page arrives oldest first and goes in front of what is already here.
      const known = new Set(state.messages.map((m) => m.id));
      const fresh = action.messages.filter((m) => !known.has(m.id));
      return { ...state, messages: [...fresh, ...state.messages], moreMessages: { ...state.moreMessages, [action.subjectId]: action.more } };
    }
    case "editExperience":
      return { ...state, experiences: state.experiences.map((e) => (e.id === action.experience.id ? action.experience : e)) };
    case "used": {
      const ids = new Set(action.experienceIds);
      return { ...state, experiences: state.experiences.map((e) => (ids.has(e.id) ? { ...e, uses: (e.uses ?? 0) + 1 } : e)) };
    }
    case "took":
      return { ...state, promptTakes: [action.take, ...state.promptTakes] };
    case "removeExperience":
      return { ...state, experiences: state.experiences.filter((e) => e.id !== action.id) };
    case "student":
      return { ...state, student: action.student };
    case "erase":
      return { ...demoInitial, claims: [], checkIns: [], experiences: [], messages: [], goalIds: {}, subjectId: state.subjectId };
    case "reset":
      // A copy, so the save effect below still runs.
      return { ...demoInitial };
  }
}

function replaceMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return messages.map((m) => (m.id === message.id ? message : m));
}

function withCard(
  messages: ChatMessage[],
  messageId: string,
  index: number,
  change: (c: NonNullable<ChatMessage["cards"]>[number]) => NonNullable<ChatMessage["cards"]>[number],
): ChatMessage[] {
  return messages.map((m) => (m.id === messageId && m.cards ? { ...m, cards: m.cards.map((c, i) => (i === index ? change(c) : c)) } : m));
}

// v5: State gained student, moreMessages and promptTakes. Bumped so older saves don't load.
const KEY = "trellis-demo-v5";

export type Mode = "loading" | "demo" | "live";

/** What the screens call. Each works in both modes; in live mode it waits for the server. */
export interface Actions {
  setGoal: (subjectId: SubjectId, goalId: string) => Promise<void>;
  addClaims: (claims: { topicId: string; claim: ClaimKind }[]) => Promise<void>;
  open: (topicId: string) => Promise<void>;
  editCheckIn: (checkIn: CheckIn) => Promise<void>;
  removeCheckIn: (id: string) => Promise<void>;
  editExperience: (experience: Experience) => Promise<void>;
  removeExperience: (id: string) => Promise<void>;
  /** The student copied a prompt or opened it in an AI. */
  tookPrompt: (topicId: string, via: PromptTake["via"], experienceIds: string[]) => Promise<void>;
  rename: (name: string) => Promise<void>;
  /** "Learning something else?" on /start. Live: saved for the operator to see demand. */
  requestSubject: (text: string) => Promise<void>;
  loadOlder: (subjectId: SubjectId) => Promise<void>;
  /** Live: after sign-up or login, load the student's record. */
  goLive: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the record (and in live mode the account). Throws ApiError on a wrong password. */
  erase: (password?: string) => Promise<void>;
  /** Demo only: put the sample student back. */
  reset: () => void;
}

export interface Store extends State {
  mode: Mode;
  statuses: Map<string, Status>;
  goal: Goal | null;
  /** "Today" for relative dates: the sample's fixed day in demo mode, the real one live. */
  today: string;
  /** The last request that failed, for the shell to show. Null when all is well. */
  error: string | null;
  clearError: () => void;
  /** Shows a failed request in the error bar (for requests made outside `act`). */
  fail: (err: unknown) => void;
  dispatch: (a: Action) => void;
  act: Actions;
}

const Ctx = createContext<Store | null>(null);

function loadDemo(): State {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return clean({ ...demoInitial, ...JSON.parse(saved) });
  } catch {
    // Private window or blocked storage: the sample data is fine.
  }
  return demoInitial;
}

function fromServer(s: ServerState, subjectId: SubjectId): State {
  return { ...s, subjectId, selected: null };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, demoInitial);
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState<string | null>(null);
  // The latest state, for actions that read it after an await.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  const goLive = useCallback(async () => {
    const s = await api<ServerState>("/state");
    // Open the subject they have a goal in, if the current one has none.
    const subjectId = s.goalIds[latest.current.subjectId] ? latest.current.subjectId : ((Object.keys(s.goalIds)[0] as SubjectId | undefined) ?? "react-native");
    dispatch({ type: "hydrate", state: fromServer(s, subjectId) });
    setMode("live");
  }, []);

  const goDemo = useCallback(() => {
    setAccessToken(null);
    dispatch({ type: "hydrate", state: loadDemo() });
    setMode("demo");
  }, []);

  // On load: signed in (live) or a visitor (demo)?
  useEffect(() => {
    let cancelled = false;
    refreshAccessToken().then(async (signedIn) => {
      if (cancelled) return;
      if (!signedIn) return goDemo();
      try {
        await goLive();
      } catch {
        // Signed in, but the record didn't load (the server is down). Show the demo
        // rather than an empty app, and say so.
        goDemo();
        setError("Couldn't load your map. You're seeing the sample until it's back.");
      }
    });
    whenSignedOut(() => goDemo());
    return () => {
      cancelled = true;
      whenSignedOut(null);
    };
  }, [goDemo, goLive]);

  // Demo mode keeps its state in this browser. Live mode never does: the record lives on
  // the server, and a copy in localStorage would outlive signing out on a shared computer.
  useEffect(() => {
    if (mode !== "demo" || state === demoInitial) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, selected: undefined, asking: undefined }));
    } catch {
      // Not saved; the demo still works for this visit.
    }
  }, [state, mode]);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof ApiError ? err.message : "Something went wrong.");
  }, []);

  /** Runs a live request; on failure shows the message and stops (returns null). */
  const live = useCallback(
    async <T,>(request: () => Promise<T>): Promise<T | null> => {
      try {
        return await request();
      } catch (err) {
        fail(err);
        return null;
      }
    },
    [fail],
  );

  const act = useMemo<Actions>(() => {
    const isLive = () => mode === "live";
    return {
      async setGoal(subjectId, goalId) {
        if (isLive() && !(await live(() => api(`/goals/${subjectId}`, { method: "PUT", body: { goalId } })))) return;
        dispatch({ type: "goal", subjectId, goalId });
      },
      async addClaims(claims) {
        if (!isLive()) {
          const at = new Date().toISOString();
          dispatch({ type: "claims", claims: claims.map((c) => ({ ...c, at })) });
          return;
        }
        const saved = await live(() => api<Claim[]>("/claims", { method: "POST", body: { claims } }));
        if (saved) dispatch({ type: "claims", claims: saved });
      },
      async open(topicId) {
        if (isLive() && (await live(() => api("/opened", { method: "POST", body: { topicId } }))) === null) return;
        dispatch({ type: "open", topicId });
      },
      async editCheckIn(c) {
        if (!isLive()) return dispatch({ type: "edit", checkIn: c });
        const saved = await live(() =>
          api<CheckIn>(`/check-ins/${c.id}`, { method: "PATCH", body: { topicId: c.topicId, outcome: c.outcome, text: c.text } }),
        );
        if (saved) dispatch({ type: "edit", checkIn: saved });
      },
      async removeCheckIn(id) {
        if (isLive() && (await live(() => api(`/check-ins/${id}`, { method: "DELETE" }))) === null) return;
        dispatch({ type: "remove", id });
      },
      async editExperience(e) {
        if (!isLive()) return dispatch({ type: "editExperience", experience: e });
        // The server rebuilds the clean line from the text itself.
        const saved = await live(() => api<Experience>(`/experiences/${e.id}`, { method: "PATCH", body: { text: e.text, kind: e.kind } }));
        if (saved) dispatch({ type: "editExperience", experience: saved });
      },
      async removeExperience(id) {
        if (isLive() && (await live(() => api(`/experiences/${id}`, { method: "DELETE" }))) === null) return;
        dispatch({ type: "removeExperience", id });
      },
      async tookPrompt(topicId, via, experienceIds) {
        if (!isLive()) {
          if (experienceIds.length) dispatch({ type: "used", experienceIds });
          dispatch({ type: "took", take: { id: newId("p"), topicId, via, at: new Date().toISOString() } });
          return;
        }
        const take = await live(() => api<PromptTake>("/prompt-takes", { method: "POST", body: { topicId, via } }));
        if (take) dispatch({ type: "took", take });
      },
      async rename(name) {
        if (!isLive()) return dispatch({ type: "student", student: { ...latest.current.student, name } });
        const student = await live(() => api<Student>("/me", { method: "PATCH", body: { name } }));
        if (student) dispatch({ type: "student", student });
      },
      async requestSubject(text) {
        // Demo: nothing to save it to. The page shows the same "Coming soon" either way.
        if (isLive()) await live(() => api("/subject-requests", { method: "POST", body: { text } }));
      },
      async loadOlder(subjectId) {
        const first = latest.current.messages.find((m) => m.subjectId === subjectId);
        if (!isLive() || !first) return;
        const page = await live(() => api<{ messages: ChatMessage[]; more: boolean }>(`/helper/${subjectId}/messages?before=${first.id}&limit=50`));
        if (page) dispatch({ type: "older", subjectId, ...page });
      },
      goLive,
      async signOut() {
        await api("/auth/logout", { method: "POST" }).catch(() => undefined);
        goDemo();
      },
      async erase(password) {
        if (!isLive()) return dispatch({ type: "erase" });
        // Not through live(): the settings page shows a wrong password next to the field.
        await api("/me", { method: "DELETE", body: password ? { password } : {} });
        goDemo();
      },
      reset() {
        if (!isLive()) dispatch({ type: "reset" });
      },
    };
  }, [mode, live, goLive, goDemo]);

  const value = useMemo<Store>(() => {
    const goalId = state.goalIds[state.subjectId];
    return {
      ...state,
      mode,
      statuses: deriveStatuses(state.claims, state.checkIns),
      goal: goalId ? (goalById.get(goalId) ?? null) : null,
      today: mode === "live" ? new Date().toISOString().slice(0, 10) : TODAY,
      error,
      clearError: () => setError(null),
      fail,
      dispatch,
      act,
    };
  }, [state, mode, error, act, fail]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Drop anything a saved demo state says about topics or goals that no longer exist. */
function clean(s: State): State {
  return {
    ...s,
    student: s.student ?? sampleStudent,
    claims: s.claims.filter((c) => topicById.has(c.topicId)),
    checkIns: s.checkIns.filter((c) => topicById.has(c.topicId)),
    experiences: (s.experiences ?? []).filter((e) => topicById.has(e.topicId)),
    messages: s.messages ?? [],
    moreMessages: {},
    promptTakes: s.promptTakes ?? [],
    goalIds: Object.fromEntries(Object.entries(s.goalIds).filter(([, g]) => g && goalById.has(g))),
    opened: (s.opened ?? []).filter((id) => topicById.has(id)),
    subjectId: s.subjectId === "redis" ? "redis" : "react-native",
  };
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore outside StoreProvider");
  return store;
}

export function newId(prefix = "c"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
