// Small helpers that keep the subject files readable.

import type { Difficulty, Edge, Goal, Subject, SubjectId, Topic } from "../types";

/**
 * A topic as a subject file writes it: everything but its difficulty. The difficulty
 * lives in a separate table per subject (redisDifficulty, reactNativeDifficulty), so all the ratings
 * sit together and can be reviewed side by side; ./index joins the two.
 */
export type RawTopic = Omit<Topic, "difficulty">;

/** Subtopic id → how hard it usually is. Every subtopic must have one (./index checks). */
export type DifficultyTable = Record<string, Difficulty>;

/**
 * Everything one subject file gives ./index: the subject itself and its content. One object
 * per file, so adding a subject is one line in ./index's list (docs/subject-blueprint.md).
 */
export interface SubjectFile {
  subject: Subject;
  topics: RawTopic[];
  difficulty: DifficultyTable;
  /** Links between subtopics, and "helps" links between big topics. Never big-topic "needs". */
  edges: Edge[];
  goals: Goal[];
  /** One-tap answers for the sort (/start/sort); see Shortcut. */
  shortcuts?: Shortcut[];
}

/**
 * A one-tap answer at the sort: "I already know React" marks a whole set of topics known.
 *
 * Why: the sort asks one question per big topic, but what a student already knows doesn't
 * follow big-topic lines. A web React developer knows React basics and also the React-only
 * boxes in State management, Forms and Performance; making them find and claim each one
 * was the web-React reviewer's complaint (docs/subjects/react-native.md, round 1). The
 * claims it makes are ordinary claims (big topics and subtopics), so nothing new is stored.
 */
export interface Shortcut {
  /** Stable id, `<prefix>-knows-<what>`. Not stored anywhere; it keys the toggle. */
  id: string;
  /** The toggle's text, in the student's voice: "I already know React". */
  label: string;
  /** One line under it saying what it marks. */
  note: string;
  /** Topics it marks "know": big topics (their subtopics follow) and single subtopics. */
  topics: string[];
}

/** A big topic. Its minutes are the sum of its subtopics, filled in by ./index. */
export const big =
  (subjectId: SubjectId) =>
  (id: string, name: string, summary: string, keywords: string[] = []): RawTopic => ({
    id,
    subjectId,
    parentId: null,
    name,
    summary,
    mistakes: [],
    minutes: 0,
    optional: false,
    keywords,
  });

/** A subtopic: what you study and check in on. */
export const sub =
  (subjectId: SubjectId) =>
  (
    id: string,
    parentId: string,
    name: string,
    minutes: number,
    optional: boolean,
    summary: string,
    mistakes: string[],
    keywords: string[],
  ): RawTopic => ({ id, subjectId, parentId, name, summary, mistakes, minutes, optional, keywords });

export function edgesFrom(needs: [string, string][], helps: [string, string][]): Edge[] {
  return [
    ...needs.map(([from, to]) => ({ from, to, kind: "needs" as const })),
    ...helps.map(([from, to]) => ({ from, to, kind: "helps" as const })),
  ];
}
