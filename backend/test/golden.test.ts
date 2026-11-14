// THE GOLDEN TEST: the sample student's answers, pinned.
//
// A golden test (also called a characterisation test) doesn't check a formula. It records
// what the system answers TODAY for a known input, then fails if a change alters any
// answer. Here the known input is the sample student in shared/data/student.ts, and the
// answers are what the map screen shows them: "Next: State", "Stuck: FlatList · may be State".
//
// The frontend and the backend both import these same shared/ files, so this one test
// covers both apps. If it fails, a change in shared/ altered what students are told: find
// out why before "fixing" the test.

import { describe, expect, it } from "vitest";
import { goalById, topicById, topicsOf } from "@shared/data";
import { instructions } from "@shared/data/instructions";
import { sampleCheckIns, sampleClaims, sampleExperiences, student } from "@shared/data/student";
import { deriveStatuses, nextTopic, statusOf, suspectsFor } from "@shared/graph";
import { buildPrompt } from "@shared/prompt";

// Statuses are DERIVED, never stored: worked out every time from what the student said at
// the sort (claims) and what happened since (check-ins). Same input, same map.
const statuses = deriveStatuses(sampleClaims, sampleCheckIns);
const rnGoalId = student.goals.find((g) => g.subjectId === "react-native")?.goalId;

// We compare ids ("rn-state"), not names ("State"): names can be reworded, ids are fixed.
describe("golden: the sample student", () => {
  it("1. has the 'first app' goal in React Native", () => {
    expect(rnGoalId).toBe("goal-rn-first-app");
  });

  it("2. is told to study State next", () => {
    const goal = goalById.get(rnGoalId!)!;
    expect(nextTopic(goal, statuses)?.id).toBe("rn-state");
  });

  it("3. is stuck on FlatList", () => {
    expect(statusOf(statuses, "rn-flatlist")).toBe("stuck");
  });

  it("4. is told State may be why FlatList is stuck", () => {
    // Suspects = prerequisites up to two steps below the stuck topic, weakest first.
    expect(suspectsFor("rn-flatlist", statuses, sampleCheckIns, sampleExperiences)[0]?.topic.id).toBe("rn-state");
  });

  it("5. has no Redis goal, and every Redis topic is still new", () => {
    expect(student.goals.some((g) => g.subjectId === "redis")).toBe(false);
    const redis = topicsOf("redis");
    expect(redis).toHaveLength(129);
    expect(redis.every((t) => statusOf(statuses, t.id) === "new")).toBe(true);
  });
});

describe("golden: FlatList's prompt", () => {
  const flatList = topicById.get("rn-flatlist")!;

  it("6. starts with the gap, uses FlatList's own note, and keeps the base rules", () => {
    const prompt = buildPrompt(flatList, statuses, sampleCheckIns, sampleExperiences, instructions);
    expect(prompt.instructions[0]).toBe("Start with State, briefly, then connect it back to FlatList.");
    expect(prompt.experiences[0]).toBe("FlatList was hard: I push the new item into the array and nothing re-renders.");
    expect(prompt.text).toContain("Don't lecture, and don't give me everything at once.");
    // MS.2: every prompt ends by asking for two lines to paste back.
    expect(prompt.instructions.at(-1)).toMatch(/^When we finish, end with two short lines I can paste back into Trellis/);
  });

  it("7. drops FlatList's 'hard' note once FlatList is done (MS.2)", () => {
    const done = new Map(statuses).set("rn-flatlist", "done");
    const prompt = buildPrompt(flatList, done, sampleCheckIns, sampleExperiences, instructions);
    expect(prompt.experiences.some((l) => l.startsWith("FlatList was hard"))).toBe(false);
  });

  it("8. adds what worked underneath: Props clicked, ScrollView easy, never Props' hard note (MS.2)", () => {
    const prompt = buildPrompt(flatList, statuses, sampleCheckIns, sampleExperiences, instructions);
    expect(prompt.experiences.slice(1)).toEqual([
      "Props clicked when the parent owns the data; the child calls a function the parent passed down.",
      "ScrollView felt easy: fine for short screens; just wrap the content.",
    ]);
  });
});
