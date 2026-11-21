// How the record on the phone changes (docs/mobile.md §8). The web store's live half
// (frontend/lib/store.tsx), with the demo removed: the phone is signed-in only.
//
// A reducer is a pure function (record, action) → new record. Every change to what the
// screens show goes through it, so it can be tested without a phone or a server, and a
// change can never half-happen. What's derived (statuses, the goal, next) isn't kept here:
// it's worked out from this record by shared/graph.ts on every change, like the server does.

import type { AiUsage, ChatMessage, CheckIn, Claim, Experience, PromptTake, Student, SubjectId } from "@shared/types";

/** Named with an underscore because `Record` is a TypeScript built-in. */
export interface Record_ {
  student: Student | null;
  claims: Claim[];
  checkIns: CheckIn[];
  experiences: Experience[];
  /** The helper threads, every subject, oldest first (the latest 50 per subject at load). */
  messages: ChatMessage[];
  moreMessages: Partial<Record<SubjectId, boolean>>;
  promptTakes: PromptTake[];
  /** The subject on screen. Kept on the phone only. */
  subjectId: SubjectId;
  goalIds: Partial<Record<SubjectId, string>>;
  /** Big topics opened early with "Look inside now". */
  opened: string[];
  usage: AiUsage | null;
}

export const initial: Record_ = {
  student: null,
  claims: [],
  checkIns: [],
  experiences: [],
  messages: [],
  moreMessages: {},
  promptTakes: [],
  subjectId: "react-native",
  goalIds: {},
  opened: [],
  usage: null,
};

export type Action =
  | { type: "hydrate"; record: Record_ }
  | { type: "subject"; subjectId: SubjectId }
  | { type: "goal"; subjectId: SubjectId; goalId: string }
  | { type: "claims"; claims: Claim[] }
  | { type: "open"; topicId: string }
  | { type: "edit"; checkIn: CheckIn }
  | { type: "remove"; id: string }
  /** A message from the helper or the student, as the server answered it. */
  | { type: "say"; message: ChatMessage }
  /** The server saved a proposal. */
  | { type: "saved"; message: ChatMessage; followUp: ChatMessage; checkIns: CheckIn[]; experiences: Experience[] }
  /** The server cancelled or undid a proposal; `removed` lists what an undo deleted. */
  | { type: "message"; message: ChatMessage; removed?: { checkIns: string[]; experiences: string[] } }
  | { type: "older"; subjectId: SubjectId; messages: ChatMessage[]; more: boolean }
  | { type: "editExperience"; experience: Experience }
  | { type: "removeExperience"; id: string }
  | { type: "took"; take: PromptTake }
  | { type: "student"; student: Student }
  | { type: "usage"; usage: AiUsage }
  /** Signed out or account deleted: nothing of the record stays on the phone. */
  | { type: "clear" };

export function reducer(state: Record_, action: Action): Record_ {
  switch (action.type) {
    case "hydrate":
      return action.record;
    case "subject":
      return { ...state, subjectId: action.subjectId };
    case "goal":
      return { ...state, subjectId: action.subjectId, goalIds: { ...state.goalIds, [action.subjectId]: action.goalId } };
    case "claims": {
      // The latest claim on a topic is the one that counts; the server keeps history, the
      // phone only needs the latest.
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
      // At most one open proposal per subject (the server does the same): a new one
      // retires the older ones, so two confirm cards can't both be saved.
      const proposes = action.message.cards?.some((c) => c.type === "confirm" && c.state === "open");
      const older = proposes ? retireOpen(state.messages, action.message.subjectId) : state.messages;
      return { ...state, messages: [...older, action.message] };
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
      // The page arrives oldest first and goes in front of what's already here.
      const known = new Set(state.messages.map((m) => m.id));
      const fresh = action.messages.filter((m) => !known.has(m.id));
      return { ...state, messages: [...fresh, ...state.messages], moreMessages: { ...state.moreMessages, [action.subjectId]: action.more } };
    }
    case "editExperience":
      return { ...state, experiences: state.experiences.map((e) => (e.id === action.experience.id ? action.experience : e)) };
    case "removeExperience":
      return { ...state, experiences: state.experiences.filter((e) => e.id !== action.id) };
    case "took":
      return { ...state, promptTakes: [action.take, ...state.promptTakes] };
    case "student":
      return { ...state, student: action.student };
    case "usage":
      return { ...state, usage: action.usage };
    case "clear":
      return initial;
  }
}

function replaceMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return messages.map((m) => (m.id === message.id ? message : m));
}

function retireOpen(messages: ChatMessage[], subjectId: SubjectId): ChatMessage[] {
  return messages.map((m) =>
    m.subjectId === subjectId && m.cards?.some((c) => c.type === "confirm" && c.state === "open")
      ? { ...m, cards: m.cards.map((c) => (c.type === "confirm" && c.state === "open" ? { ...c, state: "cancelled" as const } : c)) }
      : m,
  );
}
