// MS.1: the stuck ranking in shared/graph.ts suspectsFor() (design.md §8,
// backend-design.md §7). FlatList stands on ScrollView, "Conditional rendering, lists" and
// "Objects and arrays in state" (one step) and on View, Components, State and Modern
// JavaScript syntax (two steps); the cases
// below play with their statuses. (Rewritten for the redesigned React Native, 15 Nov 2026:
// same rules, new prerequisites.)

import { describe, expect, it } from "vitest";
import { suspectsFor } from "@shared/graph";
import type { CheckIn, Experience, Status } from "@shared/types";

const ALL = ["rn-scrollview", "rn-jsx-lists", "rn-state-updates", "rn-view", "rn-components", "rn-js-modern", "rn-state"];

/** Every candidate done cleanly, except the ones given. */
function statuses(over: Record<string, Status> = {}): Map<string, Status> {
  return new Map<string, Status>([...ALL.map((id) => [id, "done"] as [string, Status]), ["rn-flatlist", "stuck"], ...Object.entries(over)]);
}
const checkIn = (topicId: string, outcome: CheckIn["outcome"], at: string, text = ""): CheckIn => ({ id: `${topicId}-${at}`, topicId, outcome, at, text });
const hardNote = (topicId: string, text: string): Experience => ({ id: `e-${text}`, topicId, kind: "hard", text, line: text, at: "2026-11-01T00:00:00Z" });
const ids = (list: { topic: { id: string } }[]) => list.map((s) => s.topic.id);
const stuckOn = (text: string) => [checkIn("rn-flatlist", "stuck", "2026-11-05T00:00:00Z", text)];

describe("suspectsFor: the ranking", () => {
  it("orders by weakness: new, stuck, shaky, learning, know", () => {
    const s = statuses({ "rn-scrollview": "know", "rn-jsx-lists": "learning", "rn-view": "shaky", "rn-components": "stuck", "rn-js-modern": "new" });
    expect(ids(suspectsFor("rn-flatlist", s, [], []))).toEqual(["rn-js-modern", "rn-components", "rn-view", "rn-jsx-lists", "rn-scrollview"]);
  });

  it("breaks ties by fewer steps, then file order", () => {
    const s = statuses({ "rn-view": "new", "rn-scrollview": "new", "rn-jsx-lists": "new", "rn-components": "new" });
    // One step (lists in JSX, ScrollView) before two (Components, View), each group in file order.
    expect(ids(suspectsFor("rn-flatlist", s, [], []))).toEqual(["rn-jsx-lists", "rn-scrollview", "rn-components", "rn-view"]);
  });

  it("never suspects a topic done cleanly", () => {
    expect(suspectsFor("rn-flatlist", statuses(), [], [])).toEqual([]);
    // A got with nothing hard before it is clean.
    expect(suspectsFor("rn-flatlist", statuses(), [checkIn("rn-jsx-lists", "got", "2026-11-01T00:00:00Z")], [])).toEqual([]);
  });
});

describe("suspectsFor: done, with doubt (rank 5)", () => {
  it("suspects a done topic that has a hard note", () => {
    const [s] = suspectsFor("rn-flatlist", statuses(), [], [hardNote("rn-jsx-lists", "keys confused me")]);
    expect(s).toMatchObject({ topic: { id: "rn-jsx-lists" }, status: "done", rank: 5, doubt: true });
  });

  it("suspects a done topic the student was stuck or partway on before its got", () => {
    const history = [checkIn("rn-scrollview", "partly", "2026-11-01T00:00:00Z"), checkIn("rn-scrollview", "got", "2026-11-02T00:00:00Z")];
    expect(suspectsFor("rn-flatlist", statuses(), history, [])[0]).toMatchObject({ topic: { id: "rn-scrollview" }, rank: 5, doubt: true });
  });

  it("still puts weaker evidence first", () => {
    const s = statuses({ "rn-scrollview": "know" });
    expect(ids(suspectsFor("rn-flatlist", s, [], [hardNote("rn-jsx-lists", "hard")]))).toEqual(["rn-scrollview", "rn-jsx-lists"]);
  });
});

describe("suspectsFor: the student's own words", () => {
  it("lift a candidate they name by three ranks", () => {
    const s = statuses({ "rn-scrollview": "know", "rn-jsx-lists": "learning" });
    // Without words: lists in JSX (learning, 3) before ScrollView (know, 4).
    expect(ids(suspectsFor("rn-flatlist", s, [], []))).toEqual(["rn-jsx-lists", "rn-scrollview"]);
    // "scroll view" names ScrollView: it moves up to rank 1.
    const lifted = suspectsFor("rn-flatlist", s, stuckOn("I put it inside a scroll view and it's empty"), []);
    expect(lifted[0]).toMatchObject({ topic: { id: "rn-scrollview" }, rank: 1, matched: true });
  });

  it("make a cleanly done topic a suspect at rank 3 when they echo its common mistake", () => {
    // A mistake of lists in JSX: "Using the array index as the key". No name or keyword in
    // the words, only the phrase "the array index as the key".
    const notes = [hardNote("rn-flatlist", "I used the array index as the key and rows jump around")];
    expect(suspectsFor("rn-flatlist", statuses(), [], notes)[0]).toMatchObject({ topic: { id: "rn-jsx-lists" }, status: "done", rank: 3, matched: true, doubt: false });
  });

  it("need three words in a row to echo a mistake; two are not enough", () => {
    const notes = [hardNote("rn-flatlist", "after the array changed it broke")]; // "the array" is in a mistake of lists in JSX
    expect(suspectsFor("rn-flatlist", statuses(), [], notes)).toEqual([]);
  });

  it("come from the LATEST stuck check-in only, plus the hard notes", () => {
    const history = [
      checkIn("rn-flatlist", "stuck", "2026-11-01T00:00:00Z", "something about a scroll view"),
      checkIn("rn-flatlist", "stuck", "2026-11-03T00:00:00Z", "the list is blank"),
    ];
    expect(suspectsFor("rn-flatlist", statuses(), history, [])).toEqual([]);
  });

  it("never go below rank 0", () => {
    const s = statuses({ "rn-jsx-lists": "new" });
    expect(suspectsFor("rn-flatlist", s, stuckOn("the keys are wrong"), [])[0]).toMatchObject({ topic: { id: "rn-jsx-lists" }, rank: 0 });
  });
});

describe("the helper explains the new reasons", () => {
  // shared/helper.ts weakBecause(), reached through "why am I stuck?".
  it("says a done suspect was hard going, or that the student's words point at it", async () => {
    const { goalById } = await import("@shared/data");
    const { replyFor } = await import("@shared/helper");
    const ctx = (checkIns: CheckIn[], experiences: Experience[]) => ({
      subjectId: "react-native" as const,
      goal: goalById.get("goal-rn-first-app")!,
      statuses: statuses(),
      claims: [],
      checkIns,
      experiences,
      messages: [],
      selected: null,
      opened: [],
    });
    const why = { path: "why_stuck" as const, topicIds: [], bigId: null, outcome: null, experiences: [], help: null, said: "" };

    expect(replyFor(why, ctx([], [hardNote("rn-jsx-lists", "keys")])).text).toMatch(/may be Conditional rendering, lists .* you marked it done, but it was hard going\.$/);
    expect(replyFor(why, ctx([], [hardNote("rn-flatlist", "I used the array index as the key")])).text).toMatch(
      /may be Conditional rendering, lists .* what you said about being stuck sounds like it\.$/,
    );
  });
});
