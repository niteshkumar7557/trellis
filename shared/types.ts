// The shapes every screen consumes. The backend will serve these same shapes;
// see docs/frontend.md for the contract.

export type SubjectId = "react-native" | "redis";

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  blurb: string;
}

/**
 * The map has two levels. A big topic (`parentId: null`) is a chunk of the subject;
 * its subtopics are what you actually study and check in on. A big topic's subtopics
 * stay hidden until the student reaches it.
 */
export interface Topic {
  id: string;
  subjectId: SubjectId;
  /** The big topic this belongs to; null for a big topic. */
  parentId: string | null;
  name: string;
  /** What the topic covers. Never an explanation of it. */
  summary: string;
  /** Where people commonly slip. Empty for big topics. */
  mistakes: string[];
  minutes: number;
  /**
   * Subtopics only: safe to skip, even when its big topic is on your goal.
   * Core subtopics (false) are the ones not to skip.
   */
  optional: boolean;
  /** Words a check-in line might use for this topic. */
  keywords: string[];
}

/**
 * `from` needs (or is helped by) `to`. Arrows point from the dependent to its prerequisite.
 * Edges join two big topics, or two subtopics (which may sit in different big topics).
 */
export interface Edge {
  from: string;
  to: string;
  kind: "needs" | "helps";
}

export interface Goal {
  id: string;
  subjectId: SubjectId;
  name: string;
  blurb: string;
  /** Big topics the goal is for. Everything they need comes with them. */
  targets: string[];
}

export type ClaimKind = "know" | "shaky" | "new";

/** What the student said at the sort. Usually about a big topic; its subtopics inherit it. */
export interface Claim {
  topicId: string;
  claim: ClaimKind;
  at: string;
}

export type Outcome = "got" | "partly" | "stuck";

/** A status change on a subtopic. Statuses are worked out from these. */
export interface CheckIn {
  id: string;
  /** ISO date-time. */
  at: string;
  /** What the student said, or a short label when it came from a button. */
  text: string;
  /** Always a subtopic. */
  topicId: string;
  outcome: Outcome;
  /** The chat message that made it, if any. */
  messageId?: string;
}

export type ExperienceKind = "easy" | "hard" | "clicked";

/** What the student told the helper about how a topic went. Used in prompts. */
export interface Experience {
  id: string;
  at: string;
  topicId: string;
  kind: ExperienceKind;
  /** Exactly what the student said. They can see, edit and delete it. */
  text: string;
  /** A clean one-line version for prompts. (The AI writes it; the stand-in tidies the text.) */
  line: string;
  messageId?: string;
  /** How many prompts the student took (copied or opened) with this in them. A "hard" one stops at 2. */
  uses?: number;
}

/**
 * The student copied a prompt or opened it in an AI. Lets the helper ask "how did State
 * go?" when they come back (design.md §7).
 */
export interface PromptTake {
  id: string;
  topicId: string;
  via: "copy" | "chatgpt" | "claude";
  at: string;
}

/** Fixed prompt text kept in the database, in layers. */
export interface Instruction {
  id: string;
  /** base: every prompt. status: prompts for topics in that status. topic: one topic's prompts. */
  scope: "base" | "status" | "topic";
  status?: Status;
  topicId?: string;
  /** May use {topic} and {gap}. */
  text: string;
}

/** A change the helper proposes. Nothing is saved until the student confirms it. */
export interface Proposal {
  /** Status updates, one per subtopic. */
  updates: { topicId: string; outcome: Outcome }[];
  /** What the student said about how it went. */
  experiences: { topicId: string; kind: ExperienceKind; text: string; line: string }[];
  /** The student's words that led to it, kept as the check-in text. */
  said: string;
}

/** Something a helper reply carries besides its text. */
export type Card =
  /**
   * "Here's what I'll save": the student can change it, then Save or Cancel.
   * Once saved it records the ids it made, so Undo can take them back.
   */
  | {
      type: "confirm";
      /** Set by the API: Save, Cancel and Undo are addressed by it. The demo store has none. */
      proposalId?: string;
      proposal: Proposal;
      state: "open" | "saved" | "cancelled" | "undone";
      saved?: { checkIns: string[]; experiences: string[] };
    }
  /** A ready prompt for a topic, built when shown so it is always current. */
  | { type: "prompt"; topicId: string }
  /** The helper couldn't tell which topic: one tap picks. */
  | { type: "choose"; outcome: Outcome; options: { label: string; topicIds: string[]; outcome?: Outcome }[] }
  /** Things the student might say next. */
  | { type: "suggest"; options: string[] };

export interface ChatMessage {
  id: string;
  subjectId: SubjectId;
  at: string;
  role: "student" | "helper";
  text: string;
  cards?: Card[];
  /**
   * The question this helper message asked. The student's next message is taken as the
   * answer, and the pending update rides along until they confirm.
   */
  asks?: { kind: ExperienceKind; pending: Proposal };
}

export interface Student {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  /** False for an account that signs in with Google only. Deleting it then asks no password. */
  hasPassword: boolean;
  goals: { subjectId: SubjectId; goalId: string; since: string }[];
}

/** Derived from claims and check-ins; never stored. */
export type Status = "new" | "know" | "shaky" | "learning" | "stuck" | "done";
