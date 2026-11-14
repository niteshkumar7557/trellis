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
