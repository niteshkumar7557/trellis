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
    expect(suspectsFor("rn-flatlist", statuses)[0]?.topic.id).toBe("rn-state");
  });

  it("5. has no Redis goal, and every Redis topic is still new", () => {
    expect(student.goals.some((g) => g.subjectId === "redis")).toBe(false);
    const redis = topicsOf("redis");
    expect(redis).toHaveLength(129);
    expect(redis.every((t) => statusOf(statuses, t.id) === "new")).toBe(true);
  });
});

// ---------------------------------------------------------------- Task B (3 Nov)
// Remove `.skip` from each test and write its body. The facts are in your task file.
describe("golden: FlatList's prompt", () => {
  const flatList = topicById.get("rn-flatlist")!;

  it.skip("6. starts with the gap, uses FlatList's own experience, and keeps the base rules", () => {
    // TODO(Task B): build the prompt:
    //   const prompt = buildPrompt(flatList, statuses, sampleCheckIns, sampleExperiences, instructions);
    // and check three things:
    //   - prompt.instructions[0] is "Start with State, briefly, then connect it back to FlatList."
    //   - prompt.experienceIds equals ["e08"]
    //   - prompt.text contains "Don't lecture, and don't give me everything at once."
  });

  it.skip("7. leaves out a 'hard' experience once it has been used in 2 prompts", () => {
    // TODO(Task B): copy the experiences with e08 marked as used twice:
    //   const used = sampleExperiences.map((e) => (e.id === "e08" ? { ...e, uses: 2 } : e));
    // build the prompt with `used` instead, and check prompt.experienceIds equals [].
  });
});
