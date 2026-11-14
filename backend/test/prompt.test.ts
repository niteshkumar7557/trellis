// MS.2: which notes go into a prompt (shared/prompt.ts experiencesFor, design.md §9).
// FlatList directly needs ScrollView, Props and State.

import { describe, expect, it } from "vitest";
import { topicById } from "@shared/data";
import { experiencesFor } from "@shared/prompt";
import type { Experience, Status } from "@shared/types";

const flatList = topicById.get("rn-flatlist")!;
let n = 0;
const note = (topicId: string, kind: Experience["kind"], day: number): Experience => ({
  id: `e${++n}`,
  topicId,
  kind,
  text: `${kind} ${day}`,
  line: `${kind} ${day}`,
  at: `2026-11-${String(day).padStart(2, "0")}T00:00:00Z`,
});
const ids = (list: Experience[]) => list.map((e) => `${e.topicId}:${e.kind}:${e.at.slice(8, 10)}`);
const learning = new Map<string, Status>([["rn-flatlist", "learning"]]);

describe("experiencesFor", () => {
  it("takes at most 4 of the topic's own notes, newest first", () => {
    const own = [1, 2, 3, 4, 5].map((d) => note("rn-flatlist", "easy", d));
    expect(ids(experiencesFor(flatList, own, learning))).toEqual(["rn-flatlist:easy:05", "rn-flatlist:easy:04", "rn-flatlist:easy:03", "rn-flatlist:easy:02"]);
  });

  it("keeps a hard note while the topic isn't done, and drops it once it is", () => {
    const own = [note("rn-flatlist", "hard", 1), note("rn-flatlist", "easy", 2)];
    expect(ids(experiencesFor(flatList, own, learning))).toEqual(["rn-flatlist:easy:02", "rn-flatlist:hard:01"]);
    const done = new Map<string, Status>([["rn-flatlist", "done"]]);
    expect(ids(experiencesFor(flatList, own, done))).toEqual(["rn-flatlist:easy:02"]);
  });

  it("adds at most 2 notes from the topics right underneath: clicked first, then easy, newest first", () => {
    const below = [note("rn-props", "easy", 9), note("rn-state", "clicked", 3), note("rn-scrollview", "clicked", 5), note("rn-props", "easy", 8)];
    expect(ids(experiencesFor(flatList, below, learning))).toEqual(["rn-scrollview:clicked:05", "rn-state:clicked:03"]);
  });

  it("never brings a hard note from another topic, and nothing from further down", () => {
    const other = [note("rn-props", "hard", 9), note("rn-components", "clicked", 9)]; // Components is two steps down
    expect(experiencesFor(flatList, other, learning)).toEqual([]);
  });

  it("puts the topic's own notes before the ones from underneath", () => {
    const mixed = [note("rn-state", "clicked", 9), note("rn-flatlist", "hard", 1)];
    expect(ids(experiencesFor(flatList, mixed, learning))).toEqual(["rn-flatlist:hard:01", "rn-state:clicked:09"]);
  });
});
