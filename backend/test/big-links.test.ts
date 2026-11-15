// The "needs" links between big topics are worked out from the links between subtopics
// (shared/data/index.ts, bigNeedsFrom). These tests pin the rules, so a later change to that
// function can't quietly let the two levels of the map drift apart again.

import { describe, expect, it } from "vitest";
import { edges, isBig, topicById } from "@shared/data";

const bigNeeds = edges.filter((e) => e.kind === "needs" && isBig(topicById.get(e.from)!));
const subNeeds = edges.filter((e) => e.kind === "needs" && !isBig(topicById.get(e.from)!));
const parent = (id: string) => topicById.get(id)!.parentId!;

/** Can `to` be reached from `from` along big-topic needs links, skipping the direct one? */
function reaches(from: string, to: string, skipDirect = false): boolean {
  const stack = bigNeeds.filter((e) => e.from === from && !(skipDirect && e.to === to)).map((e) => e.to);
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...bigNeeds.filter((e) => e.from === cur).map((e) => e.to));
  }
  return false;
}

describe("big-topic needs links", () => {
  it("each one has a core subtopic link behind it", () => {
    for (const b of bigNeeds) {
      const behind = subNeeds.some((e) => parent(e.from) === b.from && parent(e.to) === b.to && !topicById.get(e.from)!.optional);
      expect(behind, `${b.from} → ${b.to}`).toBe(true);
    }
  });

  it("none is implied by a longer path (the map would draw a line saying nothing new)", () => {
    for (const b of bigNeeds) expect(reaches(b.from, b.to, true), `${b.from} → ${b.to}`).toBe(false);
  });

  it("every subtopic link that leaves its big topic is covered by a path between the big topics", () => {
    for (const e of subNeeds) {
      if (parent(e.from) === parent(e.to)) continue;
      expect(reaches(parent(e.from), parent(e.to)), `${e.from} → ${e.to}`).toBe(true);
    }
  });

  it("matches what the subtopics say on a few known cases", () => {
    const has = (from: string, to: string) => bigNeeds.some((e) => e.from === from && e.to === to);
    // View needs Components and Running on your phone (in Getting set up).
    expect(has("rn-core", "rn-react")).toBe(true);
    expect(has("rn-core", "rn-env")).toBe(true);
    // Loading states are Views, so Data from a server stands on Core components, and its
    // need of Getting set up (environment variables) is implied by that longer path.
    expect(has("rn-network", "rn-core")).toBe(true);
    expect(has("rn-network", "rn-env")).toBe(false);
    // Detox and Maestro (optional) need Running on your phone, but an optional subtopic
    // never adds a link: Testing stands only on Core components.
    expect(has("rn-testing", "rn-env")).toBe(false);
    expect(has("rn-testing", "rn-core")).toBe(true);
  });
});
