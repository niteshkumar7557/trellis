// MS.3: shared/graph.ts awaitingReport() and unsortedAreas() (design.md §7).

import { describe, expect, it } from "vitest";
import { goalById } from "@shared/data";
import { sampleClaims } from "@shared/data/student";
import { awaitingReport, requiredFor, unsortedAreas } from "@shared/graph";
import type { CheckIn, PromptTake } from "@shared/types";

const NOW = new Date("2026-11-14T12:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const take = (topicId: string, minutesAgo: number, id = topicId): PromptTake => ({ id, topicId, via: "copy", at: ago(minutesAgo) });
const checkIn = (topicId: string, minutesAgo: number): CheckIn => ({ id: `c-${topicId}`, topicId, outcome: "got", text: "", at: ago(minutesAgo) });

describe("awaitingReport", () => {
  it("asks about the latest prompt taken more than 10 minutes ago", () => {
    expect(awaitingReport([take("rn-state", 60), take("rn-flatlist", 30)], [], NOW)?.topicId).toBe("rn-flatlist");
  });

  it("waits 10 minutes, then falls back to the one before", () => {
    expect(awaitingReport([take("rn-state", 9)], [], NOW)).toBeNull();
    expect(awaitingReport([take("rn-state", 60), take("rn-flatlist", 5)], [], NOW)?.topicId).toBe("rn-state");
  });

  it("forgets prompts older than 14 days", () => {
    expect(awaitingReport([take("rn-state", 14 * 24 * 60 + 1)], [], NOW)).toBeNull();
    expect(awaitingReport([take("rn-state", 14 * 24 * 60 - 1)], [], NOW)?.topicId).toBe("rn-state");
  });

  it("skips a topic with a check-in after the take, but not one before it", () => {
    expect(awaitingReport([take("rn-state", 60)], [checkIn("rn-state", 30)], NOW)).toBeNull();
    expect(awaitingReport([take("rn-state", 60)], [checkIn("rn-state", 90)], NOW)?.topicId).toBe("rn-state");
    expect(awaitingReport([take("rn-state", 60), take("rn-flatlist", 30)], [checkIn("rn-flatlist", 20)], NOW)?.topicId).toBe("rn-state");
  });

  it("only asks about subtopics: a check-in can't be on a big topic", () => {
    expect(awaitingReport([take("rn-intro", 60)], [], NOW)).toBeNull();
  });

  it("is null with no takes", () => {
    expect(awaitingReport([], [], NOW)).toBeNull();
  });
});

describe("unsortedAreas", () => {
  const full = goalById.get("goal-rn-full")!;

  it("lists every big topic the goal needs when nothing was sorted", () => {
    const areas = unsortedAreas(full, []);
    expect(areas.every((t) => t.parentId === null && requiredFor(full).has(t.id))).toBe(true);
    expect(areas.length).toBeGreaterThan(0);
  });

  it("leaves out the ones the student already sorted", () => {
    const sorted = new Set(sampleClaims.map((c) => c.topicId));
    const areas = unsortedAreas(full, sampleClaims);
    expect(areas.some((t) => sorted.has(t.id))).toBe(false);
    expect(areas.length).toBeLessThan(unsortedAreas(full, []).length);
  });

  it("is empty when the goal's areas were all sorted", () => {
    const all = unsortedAreas(full, []).map((t) => ({ topicId: t.id, claim: "new" as const, at: "" }));
    expect(unsortedAreas(full, all)).toEqual([]);
  });
});
