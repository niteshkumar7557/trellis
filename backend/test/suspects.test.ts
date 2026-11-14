// MS.1: the stuck ranking in shared/graph.ts suspectsFor() (design.md §8,
// backend-design.md §7). FlatList stands on ScrollView, Props and State (one step) and on
// View and Components (two steps); the cases below play with their statuses.

import { describe, expect, it } from "vitest";
import { suspectsFor } from "@shared/graph";
import type { CheckIn, Experience, Status } from "@shared/types";

const ALL = ["rn-scrollview", "rn-props", "rn-state", "rn-view", "rn-components"];

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
    const s = statuses({ "rn-scrollview": "know", "rn-props": "learning", "rn-state": "shaky", "rn-view": "stuck", "rn-components": "new" });
    expect(ids(suspectsFor("rn-flatlist", s, [], []))).toEqual(["rn-components", "rn-view", "rn-state", "rn-props", "rn-scrollview"]);
  });

  it("breaks ties by fewer steps, then file order", () => {
    const s = statuses({ "rn-view": "new", "rn-scrollview": "new", "rn-state": "new", "rn-props": "new" });
    // One step (ScrollView, Props, State) before two (View), each group in file order.
    expect(ids(suspectsFor("rn-flatlist", s, [], []))).toEqual(["rn-props", "rn-state", "rn-scrollview", "rn-view"]);
  });

  it("never suspects a topic done cleanly", () => {
    expect(suspectsFor("rn-flatlist", statuses(), [], [])).toEqual([]);
    // A got with nothing hard before it is clean.
    expect(suspectsFor("rn-flatlist", statuses(), [checkIn("rn-state", "got", "2026-11-01T00:00:00Z")], [])).toEqual([]);
  });
});

describe("suspectsFor: done, with doubt (rank 5)", () => {
  it("suspects a done topic that has a hard note", () => {
    const [s] = suspectsFor("rn-flatlist", statuses(), [], [hardNote("rn-state", "hooks confused me")]);
    expect(s).toMatchObject({ topic: { id: "rn-state" }, status: "done", rank: 5, doubt: true });
  });

  it("suspects a done topic the student was stuck or partway on before its got", () => {
    const history = [checkIn("rn-props", "partly", "2026-11-01T00:00:00Z"), checkIn("rn-props", "got", "2026-11-02T00:00:00Z")];
    expect(suspectsFor("rn-flatlist", statuses(), history, [])[0]).toMatchObject({ topic: { id: "rn-props" }, rank: 5, doubt: true });
  });

  it("still puts weaker evidence first", () => {
    const s = statuses({ "rn-scrollview": "know" });
    expect(ids(suspectsFor("rn-flatlist", s, [], [hardNote("rn-state", "hard")]))).toEqual(["rn-scrollview", "rn-state"]);
  });
});

describe("suspectsFor: the student's own words", () => {
  it("lift a candidate they name by three ranks", () => {
    const s = statuses({ "rn-props": "know", "rn-state": "learning" });
    // Without words: State (learning, 3) before Props (know, 4).
    expect(ids(suspectsFor("rn-flatlist", s, [], []))).toEqual(["rn-state", "rn-props"]);
    // "props" names Props: it moves up to rank 1.
    const lifted = suspectsFor("rn-flatlist", s, stuckOn("I pass the data in as props and it's empty"), []);
    expect(lifted[0]).toMatchObject({ topic: { id: "rn-props" }, rank: 1, matched: true });
  });

  it("make a cleanly done topic a suspect at rank 3 when they echo its common mistake", () => {
    // State's mistake: "Mutating state in place, so nothing re-renders". No name or
    // keyword in the words, only the phrase "nothing re-renders" plus one word.
    const notes = [hardNote("rn-flatlist", "I push the item and then nothing re renders at all")];
    expect(suspectsFor("rn-flatlist", statuses(), [], notes)[0]).toMatchObject({ topic: { id: "rn-state" }, status: "done", rank: 3, matched: true, doubt: false });
  });

  it("need three words in a row to echo a mistake; two are not enough", () => {
    const notes = [hardNote("rn-flatlist", "right after lunch it broke")]; // "right after" is in a State mistake
    expect(suspectsFor("rn-flatlist", statuses(), [], notes)).toEqual([]);
  });

  it("come from the LATEST stuck check-in only, plus the hard notes", () => {
    const history = [
      checkIn("rn-flatlist", "stuck", "2026-11-01T00:00:00Z", "something about props"),
      checkIn("rn-flatlist", "stuck", "2026-11-03T00:00:00Z", "the list is blank"),
    ];
    expect(suspectsFor("rn-flatlist", statuses(), history, [])).toEqual([]);
  });

  it("never go below rank 0", () => {
    const s = statuses({ "rn-state": "new" });
    expect(suspectsFor("rn-flatlist", s, stuckOn("state is lost"), [])[0]).toMatchObject({ topic: { id: "rn-state" }, rank: 0 });
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

    expect(replyFor(why, ctx([], [hardNote("rn-state", "hooks")])).text).toMatch(/may be State .* you marked it done, but it was hard going\.$/);
    expect(replyFor(why, ctx([], [hardNote("rn-flatlist", "nothing re renders when I push")])).text).toMatch(
      /may be State .* what you said about being stuck sounds like it\.$/,
    );
  });
});
