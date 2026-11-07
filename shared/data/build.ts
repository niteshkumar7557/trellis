// Small helpers that keep the subject files readable.

import type { Edge, SubjectId, Topic } from "../types";

/** A big topic. Its minutes are the sum of its subtopics, filled in by ./index. */
export const big =
  (subjectId: SubjectId) =>
  (id: string, name: string, summary: string, keywords: string[] = []): Topic => ({
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
  ): Topic => ({ id, subjectId, parentId, name, summary, mistakes, minutes, optional, keywords });

export function edgesFrom(needs: [string, string][], helps: [string, string][]): Edge[] {
  return [
    ...needs.map(([from, to]) => ({ from, to, kind: "needs" as const })),
    ...helps.map(([from, to]) => ({ from, to, kind: "helps" as const })),
  ];
}
