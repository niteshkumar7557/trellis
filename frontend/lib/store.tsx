"use client";

// One client store for the dummy-data build. When the API exists, these actions
// become requests and the initial state comes from the server; screens stay as they are.

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { goalById, topicById } from "@shared/data";
import { sampleCheckIns, sampleClaims, sampleExperiences, sampleMessages, student } from "@shared/data/student";
import { deriveStatuses } from "@shared/graph";
import type { ChatMessage, CheckIn, Claim, Experience, Goal, Proposal, Status, SubjectId } from "@shared/types";

interface State {
  claims: Claim[];
  checkIns: CheckIn[];
  /** What the student told the helper about how things went. */
  experiences: Experience[];
  /** The helper conversations, every subject, oldest first. */
  messages: ChatMessage[];
  subjectId: SubjectId;
  goalIds: Partial<Record<SubjectId, string>>;
  /** Big topics the student chose to look inside before reaching them. */
  opened: string[];
  /** The topic open in the map's side panel. Not saved. */
  selected: string | null;
  /** A question from search waiting for the helper to pick it up. Not saved. */
  asking?: string | null;
}

type Action =
  | { type: "hydrate"; state: State }
  | { type: "select"; topicId: string | null }
  | { type: "ask"; text: string | null }
  | { type: "subject"; subjectId: SubjectId }
  | { type: "goal"; subjectId: SubjectId; goalId: string }
  | { type: "claims"; claims: Claim[] }
  | { type: "open"; topicId: string }
  | { type: "add"; checkIn: CheckIn }
  | { type: "edit"; checkIn: CheckIn }
  | { type: "remove"; id: string }
  | { type: "say"; message: ChatMessage }
  /** Save a confirm card's (possibly edited) proposal. The only way the helper's changes are kept. */
  | { type: "save"; messageId: string; card: number; proposal: Proposal; at: string }
  | { type: "cancel"; messageId: string; card: number }
  | { type: "undo"; messageId: string; card: number }
  | { type: "editExperience"; experience: Experience }
  | { type: "removeExperience"; id: string }
  /** The student took a prompt (copied or opened it): count the experiences that were in it. */
  | { type: "used"; experienceIds: string[] }
  | { type: "erase" }
  | { type: "reset" };

const initial: State = {
  claims: sampleClaims,
  checkIns: sampleCheckIns,
  experiences: sampleExperiences,
  messages: sampleMessages,
  subjectId: "react-native",
  goalIds: Object.fromEntries(student.goals.map((g) => [g.subjectId, g.goalId])),
  opened: [],
  selected: null,
};

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
    case "add":
      return { ...state, checkIns: [...state.checkIns, action.checkIn] };
    case "edit":
      return { ...state, checkIns: state.checkIns.map((c) => (c.id === action.checkIn.id ? action.checkIn : c)) };
    case "remove":
      return { ...state, checkIns: state.checkIns.filter((c) => c.id !== action.id) };
    case "say": {
      // A new proposal retires any older one still waiting, so a stale one can't be saved later.
      const proposes = action.message.cards?.some((c) => c.type === "confirm" && c.state === "open");
      const older = proposes
        ? state.messages.map((m) =>
            m.subjectId === action.message.subjectId && m.cards?.some((c) => c.type === "confirm" && c.state === "open")
              ? { ...m, cards: m.cards.map((c) => (c.type === "confirm" && c.state === "open" ? { ...c, state: "cancelled" as const } : c)) }
              : m,
          )
        : state.messages;
      return { ...state, messages: [...older, action.message] };
    }
    case "save": {
      const checkIns: CheckIn[] = action.proposal.updates.map((u) => ({
        id: newId("c"),
        at: action.at,
        text: action.proposal.said || `${OUTCOME_LABEL[u.outcome]}: ${topicById.get(u.topicId)?.name ?? ""}`,
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
    case "editExperience":
      return { ...state, experiences: state.experiences.map((e) => (e.id === action.experience.id ? action.experience : e)) };
    case "used": {
      const ids = new Set(action.experienceIds);
      return { ...state, experiences: state.experiences.map((e) => (ids.has(e.id) ? { ...e, uses: (e.uses ?? 0) + 1 } : e)) };
    }
    case "removeExperience":
      return { ...state, experiences: state.experiences.filter((e) => e.id !== action.id) };
    case "erase":
      return { claims: [], checkIns: [], experiences: [], messages: [], subjectId: state.subjectId, goalIds: {}, opened: [], selected: null };
    case "reset":
      // A copy, so the save effect below still runs.
      return { ...initial };
  }
}

const OUTCOME_LABEL = { got: "Got it", partly: "Partly", stuck: "Stuck" } as const;

function withCard(
  messages: ChatMessage[],
  messageId: string,
  index: number,
  change: (c: NonNullable<ChatMessage["cards"]>[number]) => NonNullable<ChatMessage["cards"]>[number],
): ChatMessage[] {
  return messages.map((m) => (m.id === messageId && m.cards ? { ...m, cards: m.cards.map((c, i) => (i === index ? change(c) : c)) } : m));
}

// v4: the helper chat and experiences. Bumped so older saves (with follow-ups) don't load.
const KEY = "trellis-demo-v4";

interface Store extends State {
  statuses: Map<string, Status>;
  goal: Goal | null;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) dispatch({ type: "hydrate", state: clean({ ...initial, ...JSON.parse(saved) }) });
    } catch {
      // Private window or blocked storage: the sample data is fine.
    }
  }, []);

  useEffect(() => {
    // The untouched starting state is never saved: in development React runs effects twice,
    // and saving it here would overwrite what the student saved before the load reads it.
    if (state === initial) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, selected: undefined, asking: undefined }));
    } catch {
      // Not saved; the demo still works for this visit.
    }
  }, [state]);

  const value = useMemo<Store>(() => {
    const goalId = state.goalIds[state.subjectId];
    return {
      ...state,
      statuses: deriveStatuses(state.claims, state.checkIns),
      goal: goalId ? goalById.get(goalId) ?? null : null,
      dispatch,
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Drop anything a saved state says about topics or goals that no longer exist. */
function clean(s: State): State {
  return {
    ...s,
    claims: s.claims.filter((c) => topicById.has(c.topicId)),
    checkIns: s.checkIns.filter((c) => topicById.has(c.topicId)),
    experiences: (s.experiences ?? []).filter((e) => topicById.has(e.topicId)),
    messages: s.messages ?? [],
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
