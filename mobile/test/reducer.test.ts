// The record on the phone (docs/mobile.md §8): how each server answer changes it. The same
// rules as the web store's live mode, tested on the sample student from shared/.

import { sampleCheckIns, sampleClaims, sampleExperiences, sampleMessages, student } from "@shared/data/student";
import type { ChatMessage } from "@shared/types";
import { initial, reducer, type Record_ } from "@/store/reducer";

const record: Record_ = {
  ...initial,
  student,
  claims: sampleClaims,
  checkIns: sampleCheckIns,
  experiences: sampleExperiences,
  messages: sampleMessages,
  goalIds: { "react-native": "rn-first-app" },
  subjectId: "react-native",
};

describe("the record reducer", () => {
  it("hydrates from GET /api/state", () => {
    expect(reducer(initial, { type: "hydrate", record })).toEqual(record);
  });

  it("sets a goal and switches to its subject", () => {
    const next = reducer(record, { type: "goal", subjectId: "redis", goalId: "redis-goal" });
    expect(next.subjectId).toBe("redis");
    expect(next.goalIds).toEqual({ "react-native": "rn-first-app", redis: "redis-goal" });
  });

  it("replaces older claims on the same topics and keeps the rest", () => {
    const first = sampleClaims[0]!;
    const next = reducer(record, { type: "claims", claims: [{ topicId: first.topicId, claim: "new", at: "2026-11-21T00:00:00Z" }] });
    expect(next.claims.filter((c) => c.topicId === first.topicId)).toEqual([{ topicId: first.topicId, claim: "new", at: "2026-11-21T00:00:00Z" }]);
    expect(next.claims).toHaveLength(sampleClaims.length);
  });

  it("opens a big topic once", () => {
    const once = reducer(record, { type: "open", topicId: "rn-lists" });
    expect(reducer(once, { type: "open", topicId: "rn-lists" }).opened).toEqual(["rn-lists"]);
  });

  it("applies a saved proposal: its check-ins, notes, the updated card and the follow-up", () => {
    const message = { ...sampleMessages[0]!, text: "updated" };
    const followUp: ChatMessage = { id: "m-follow", subjectId: "react-native", at: "2026-11-21T00:00:00Z", role: "helper", text: "Saved." };
    const checkIn = { id: "c-new", at: "2026-11-21T00:00:00Z", text: "Got it", topicId: sampleCheckIns[0]!.topicId, outcome: "got" as const };
    const next = reducer(record, { type: "saved", message, followUp, checkIns: [checkIn], experiences: [] });
    expect(next.checkIns.at(-1)).toEqual(checkIn);
    expect(next.messages.find((m) => m.id === message.id)?.text).toBe("updated");
    expect(next.messages.at(-1)).toEqual(followUp);
  });

  it("applies an undo: the message changes and what it saved is removed", () => {
    const gone = sampleCheckIns[0]!;
    const next = reducer(record, { type: "message", message: sampleMessages[0]!, removed: { checkIns: [gone.id], experiences: [] } });
    expect(next.checkIns.find((c) => c.id === gone.id)).toBeUndefined();
  });

  it("puts an older page of messages in front, without duplicates", () => {
    const older: ChatMessage = { id: "m-old", subjectId: "react-native", at: "2026-10-01T00:00:00Z", role: "student", text: "hi" };
    const next = reducer(record, { type: "older", subjectId: "react-native", messages: [older, sampleMessages[0]!], more: false });
    expect(next.messages[0]).toEqual(older);
    expect(next.messages).toHaveLength(sampleMessages.length + 1);
    expect(next.moreMessages["react-native"]).toBe(false);
  });

  it("a new open proposal retires older open ones in its subject", () => {
    const open = (id: string): ChatMessage => ({
      id,
      subjectId: "react-native",
      at: "2026-11-21T00:00:00Z",
      role: "helper",
      text: "Save this?",
      cards: [{ type: "confirm", state: "open", proposal: { updates: [], experiences: [], said: "" } }],
    });
    const once = reducer({ ...record, messages: [] }, { type: "say", message: open("a") });
    const twice = reducer(once, { type: "say", message: open("b") });
    const states = twice.messages.map((m) => (m.cards?.[0]?.type === "confirm" ? m.cards[0].state : null));
    expect(states).toEqual(["cancelled", "open"]);
  });

  it("forgets everything on sign-out", () => {
    expect(reducer(record, { type: "clear" })).toEqual(initial);
  });
});
