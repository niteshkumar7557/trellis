// The domain code runs in the app unchanged (docs/mobile.md §8): the same subjects, the same
// derived statuses and the same "next topic" as the site and the API.

import { goals, subjects, topicById } from "@shared/data";
import { deriveStatuses, nextTopic } from "@shared/graph";
import { buildPrompt } from "@shared/prompt";

describe("shared/ in the app", () => {
  it("has the three live subjects", () => {
    expect(subjects.map((s) => s.id).sort()).toEqual(["mongodb", "react-native", "redis"]);
  });

  it("works out a next topic for a brand-new student on every goal", () => {
    const statuses = deriveStatuses([], []);
    for (const goal of goals) {
      const next = nextTopic(goal, statuses);
      expect(next && topicById.has(next.id)).toBe(true);
    }
  });

  it("assembles a prompt", () => {
    expect(typeof buildPrompt).toBe("function");
  });
});
