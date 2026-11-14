// The helper's replies, pinned (a characterisation test, like golden.test.ts).
//
// M4.1 split shared/helper.ts respond() into readByRules() (what does the message say?)
// and replyFor() (what do we answer?), with no change in behaviour. This file proves it:
// the snapshot in __snapshots__/helper.test.ts.snap was recorded from respond() BEFORE the
// split, and the split must reproduce every reply exactly.
//
// If a later change to the helper's rules alters a reply on purpose, look at the diff,
// then update the snapshot with `npx vitest run test/helper.test.ts -u`.

import { describe, expect, it } from "vitest";
import { goalById } from "@shared/data";
import { sampleCheckIns, sampleClaims, sampleExperiences, sampleMessages } from "@shared/data/student";
import { deriveStatuses } from "@shared/graph";
import { readByRules, readTap, replyFor, respond, type HelperContext, type Reading } from "@shared/helper";
import type { ChatMessage, Proposal, SubjectId } from "@shared/types";

const statuses = deriveStatuses(sampleClaims, sampleCheckIns);

function ctx(over: Partial<HelperContext> = {}): HelperContext {
  const subjectId: SubjectId = over.subjectId ?? "react-native";
  return {
    subjectId,
    goal: subjectId === "react-native" ? goalById.get("goal-rn-first-app")! : null,
    statuses,
    claims: sampleClaims,
    checkIns: sampleCheckIns,
    experiences: sampleExperiences,
    messages: sampleMessages.filter((m) => m.subjectId === subjectId),
    selected: null,
    opened: [],
    ...over,
  };
}

/** A thread whose last helper message asked a question about one topic. */
function asking(kind: "easy" | "hard" | "clicked", topicId: string, outcome: "got" | "partly" | "stuck"): ChatMessage[] {
  const pending: Proposal = { updates: [{ topicId, outcome }], experiences: [], said: "" };
  return [{ id: "q", subjectId: "react-native", at: "2026-11-03T10:00:00Z", role: "helper", text: "?", asks: { kind, pending } }];
}

// Messages that reach every branch: reports with and without a reason, a big topic
// without a subtopic, questions about the map, "explain" requests, app help, and noise.
const SAID = [
  "I finished State",
  "I'm stuck on FlatList",
  "flatlist kind of makes sense",
  "got flatlist, but the keys confused me a lot",
  "finished it",
  "I'm stuck",
  "done with components",
  "finished lists",
  "what should I do next?",
  "what's next",
  "can I skip animations?",
  "can I skip it",
  "why am I stuck?",
  "explain props",
  "what is a FlatList?",
  "explain it",
  "explain",
  "why are some topics faded?",
  "how do I change my goal",
  "how are prompts made?",
  "how do I delete my data",
  "what can you do",
  "State",
  "hello",
  "asdf qwerty",
  "Components and Props",
];

describe("respond(): the rule-based helper", () => {
  it.each(SAID)("%s", (text) => {
    expect(respond({ kind: "say", text }, ctx())).toMatchSnapshot();
  });

  it.each(SAID.slice(0, 8))("with FlatList open in the panel: %s", (text) => {
    expect(respond({ kind: "say", text }, ctx({ selected: "rn-flatlist" }))).toMatchSnapshot();
  });

  it.each(["what should I do next?", "can I skip animations?", "I finished State", "why am I stuck?"])("with no goal: %s", (text) => {
    expect(respond({ kind: "say", text }, ctx({ goal: null }))).toMatchSnapshot();
  });

  it.each(["I finished strings", "what's next", "stuck on lists"])("in the Redis thread: %s", (text) => {
    expect(respond({ kind: "say", text }, ctx({ subjectId: "redis" }))).toMatchSnapshot();
  });

  describe("answering the helper's question", () => {
    const cases: [string, ChatMessage[]][] = [
      ["the keys prop confused me", asking("hard", "rn-flatlist", "stuck")],
      ["no", asking("hard", "rn-flatlist", "stuck")],
      ["the setup was easy, but styling took ages", asking("easy", "rn-state", "got")],
      ["it was all easy", asking("easy", "rn-state", "got")],
      ["once I drew it out it clicked", asking("clicked", "rn-flatlist", "got")],
      ["what's next?", asking("hard", "rn-flatlist", "stuck")], // moved on: a question
      ["I finished State", asking("hard", "rn-flatlist", "stuck")], // moved on: another topic
    ];
    it.each(cases)("%s", (text, messages) => {
      expect(respond({ kind: "say", text }, ctx({ messages }))).toMatchSnapshot();
    });
  });

  describe("taps", () => {
    it.each([
      ["got", ["rn-state"]],
      ["stuck", ["rn-flatlist"]],
      ["partly", ["rn-state", "rn-flatlist"]],
      ["got", ["rn-intro"]], // a big topic: filtered out, nothing left
    ] as const)("%s %j", (outcome, topicIds) => {
      expect(respond({ kind: "pick", outcome, topicIds: [...topicIds] }, ctx())).toMatchSnapshot();
    });
  });
});

// The seam the model reader (M5) plugs into. A model can return readings the rules never
// produce; replyFor() must still answer sensibly.
describe("readByRules() and replyFor()", () => {
  const blank: Reading = { path: "other", topicIds: [], bigId: null, outcome: null, experiences: [], help: null, said: "" };

  it("reads a report with its reason as an experience", () => {
    expect(readByRules("I finished State, the hooks part was tricky", ctx())).toMatchObject({
      path: "report",
      topicIds: ["rn-state"],
      outcome: "got",
      experiences: [{ kind: "hard", text: "the hooks part was tricky", line: "The hooks part was tricky." }],
    });
  });

  it("is only as good as its keywords (why M5 adds a model)", () => {
    // "confused" is a stuck word, so the rules miss that FlatList was finished.
    expect(readByRules("got flatlist, but the keys confused me a lot", ctx()).outcome).toBe("stuck");
  });

  it("reads a tap as a report with no words", () => {
    expect(readTap("stuck", ["rn-state"])).toEqual({ ...blank, path: "report", topicIds: ["rn-state"], outcome: "stuck" });
  });

  it("treats an 'answer' when nothing was asked as a plain message", () => {
    const reply = replyFor({ ...blank, path: "answer", experiences: [{ kind: "hard", text: "x", line: "X." }] }, ctx({ messages: [] }));
    expect(reply.text).toMatch(/^I can update a topic/);
    expect(JSON.stringify(reply)).not.toContain('"confirm"');
  });

  it("treats a report with no outcome as a plain message about the topic", () => {
    const reply = replyFor({ ...blank, path: "report", topicIds: ["rn-state"] }, ctx());
    expect(reply.text).toMatch(/^Did you study State\?/);
  });

  it("answers app_help without a guide entry with what the helper can do", () => {
    expect(replyFor({ ...blank, path: "app_help" }, ctx()).text).toMatch(/^I can update a topic/);
  });

  it("puts a model's experiences on the one reported topic, straight into the confirm card", () => {
    const reply = replyFor(
      { ...blank, path: "report", topicIds: ["rn-state"], outcome: "partly", experiences: [{ kind: "hard", text: "props vs state", line: "Props vs state." }], said: "state is half there, props vs state" },
      ctx(),
    );
    expect(reply.cards?.[0]).toEqual({
      type: "confirm",
      state: "open",
      proposal: {
        updates: [{ topicId: "rn-state", outcome: "partly" }],
        experiences: [{ topicId: "rn-state", kind: "hard", text: "props vs state", line: "Props vs state." }],
        said: "state is half there, props vs state",
      },
    });
  });
});
