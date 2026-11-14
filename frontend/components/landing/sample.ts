// Everything the landing page shows about "a student" comes from here, and all of it is
// worked out by the same shared code the app runs, on the sample student's record
// (shared/data/student.ts). Nothing on the landing page is typed in by hand:
//
//   - the hero map is the real React Native graph, with the sample student's statuses;
//   - the "stuck" trace is suspectsFor() on that record, the rule the app uses;
//   - the prompt is buildPrompt() on that record, the prompt the app would hand over.
//
// Why: a landing page with invented screenshots drifts away from the product the first
// time the product changes. This one can't. If the ranking rule or the prompt wording
// changes in shared/, the landing page changes with it.

import { bigTopicsOf, goalsOf, subtopicsOf, topicById } from "@shared/data";
import { instructions } from "@shared/data/instructions";
import { sampleCheckIns, sampleClaims, sampleExperiences, TODAY } from "@shared/data/student";
import { daysBetween, deriveStatuses, lastCheckIn, needsOf, statusOf, suspectsFor } from "@shared/graph";
import { buildPrompt } from "@shared/prompt";
import type { Status, SubjectId, Topic } from "@shared/types";

export const SUBJECT: SubjectId = "react-native";
export const statuses = deriveStatuses(sampleClaims, sampleCheckIns);
export const goals = goalsOf(SUBJECT);

// ---------------------------------------------------------------- the stuck trace

/** The topic the sample student is stuck on. */
export const STUCK_ID = "rn-flatlist";
export const stuckTopic = topicById.get(STUCK_ID)!;
const stuckAt = lastCheckIn(sampleCheckIns, STUCK_ID, "stuck");
/** What they said when they got stuck, in their own words. */
export const stuckWords = stuckAt?.text ?? "";
/** How long they have been stuck, counted to the sample record's "today". */
export const stuckDays = stuckAt ? daysBetween(stuckAt.at, TODAY) : 0;

export interface Traced {
  topic: Topic;
  status: Status;
  /** 1 = the stuck topic needs it directly; 2 = one step further down. */
  step: 1 | 2;
  /** The topic above it on the trace (the stuck topic, or a step-1 topic). */
  under: string;
  /** Its place among the suspects, 0 first; null when it is done cleanly and so not a suspect. */
  place: number | null;
  /** The evidence, in the words the app uses. */
  evidence: string;
}

const suspects = suspectsFor(STUCK_ID, statuses, sampleCheckIns, sampleExperiences);

function traced(id: string, step: 1 | 2, under: string): Traced {
  const topic = topicById.get(id)!;
  const status = statusOf(statuses, id);
  const place = suspects.findIndex((s) => s.topic.id === id);
  const suspect = suspects[place];
  let evidence = "Done";
  if (status === "shaky") evidence = "Said shaky";
  else if (status === "new") evidence = "Not studied yet";
  else if (status === "learning") evidence = "Partly done";
  else if (status === "stuck") evidence = "Stuck too";
  else if (suspect?.doubt) evidence = "Done, but it was hard";
  if (suspect?.matched) evidence += ". Your words agree.";
  return { topic, status, step, under, place: place === -1 ? null : place, evidence };
}

/** Every prerequisite of the stuck topic, up to two steps down: what the rule looks at. */
export const trace: Traced[] = (() => {
  const out: Traced[] = [];
  const seen = new Set<string>();
  for (const a of needsOf(STUCK_ID)) {
    if (!seen.has(a)) out.push(traced(a, 1, STUCK_ID));
    seen.add(a);
  }
  for (const a of needsOf(STUCK_ID)) {
    for (const b of needsOf(a)) {
      if (!seen.has(b)) out.push(traced(b, 2, a));
      seen.add(b);
    }
  }
  return out;
})();

/** The one the rule names first. */
export const likely = suspects[0];

// ---------------------------------------------------------------- the prompt

export const prompt = buildPrompt(stuckTopic, statuses, sampleCheckIns, sampleExperiences, instructions);

// ---------------------------------------------------------------- the subjects

/** Real sizes of a subject's graph, for the "two subjects" section. */
export function sizeOf(subjectId: SubjectId) {
  const subs = subtopicsOf(subjectId);
  return {
    big: bigTopicsOf(subjectId).length,
    small: subs.length,
    hours: Math.round(subs.reduce((sum, t) => sum + t.minutes, 0) / 60),
  };
}
