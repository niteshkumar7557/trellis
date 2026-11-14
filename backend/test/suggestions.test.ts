// The chips under the helper's latest reply (shared/helper.ts, suggestionsFor).
// They must always be TRUE: built from the record, never offering to report a topic that's
// already done, never inventing a problem, and never sitting beside a card that has to be
// decided first.

import { describe, expect, it } from "vitest";
import { goalById } from "@shared/data";
import { sampleCheckIns, sampleClaims, sampleExperiences } from "@shared/data/student";
import { deriveStatuses, nextTopic } from "@shared/graph";
import { NOTHING_TO_ADD, greeting, readByRules, respond, suggestionsFor, type HelperContext, type Reply } from "@shared/helper";
import type { ChatMessage, Status } from "@shared/types";

const goal = goalById.get("goal-rn-first-app")!;
const sampleStatuses = deriveStatuses(sampleClaims, sampleCheckIns);

function ctx(over: Partial<HelperContext> = {}): HelperContext {
  return {
    subjectId: "react-native",
    goal,
    statuses: sampleStatuses,
    claims: sampleClaims,
    checkIns: sampleCheckIns,
    experiences: sampleExperiences,
    messages: [],
    selected: null,
    opened: [],
    ...over,
  };
}

const said = (text: string): ChatMessage => ({ id: "s", subjectId: "react-native", at: "2026-11-14T10:00:00Z", role: "student", text });

describe("suggestionsFor()", () => {
  it("while the helper waits on its question, offers only to decline it", () => {
    const reply = respond({ kind: "pick", outcome: "stuck", topicIds: ["rn-state"] }, ctx());
    expect(reply.asks).toBeDefined();
    expect(suggestionsFor(reply, ctx())).toEqual([NOTHING_TO_ADD]);
  });

  it('"Nothing to add" is read as declining, so the confirm card comes with the status only', () => {
    const asked = respond({ kind: "pick", outcome: "stuck", topicIds: ["rn-state"] }, ctx());
    const thread: ChatMessage[] = [{ id: "q", subjectId: "react-native", at: "2026-11-14T10:00:00Z", role: "helper", ...asked }];
    const reading = readByRules(NOTHING_TO_ADD, ctx({ messages: thread }));
    expect(reading).toMatchObject({ path: "answer", experiences: [] });
  });

  it("offers nothing beside an open confirm card or a choice", () => {
    const confirm = respond({ kind: "pick", outcome: "got", topicIds: ["rn-view", "rn-text"] }, ctx());
    expect(confirm.cards?.[0]).toMatchObject({ type: "confirm", state: "open" });
    expect(suggestionsFor(confirm, ctx())).toEqual([]);

    const choose = respond({ kind: "say", text: "finished lists" }, ctx());
    expect(choose.cards?.[0]).toMatchObject({ type: "choose" });
    expect(suggestionsFor(choose, ctx())).toEqual([]);
  });

  it("after a reply that names the next topic, doesn't ask what's next again", () => {
    const next = nextTopic(goal, sampleStatuses)!;
    const reply = respond({ kind: "say", text: "what should I do next?" }, ctx());
    const chips = suggestionsFor(reply, ctx());
    expect(chips).not.toContain("What should I do next?");
    expect(chips).toContain(`I finished ${next.name}`);
  });

  it("never offers to report a topic that's already done", () => {
    // A prompt card for View, which the sample student has done.
    const reply: Reply = { text: "Here's a prompt.", cards: [{ type: "prompt", topicId: "rn-view" }] };
    const statuses = new Map<string, Status>([...sampleStatuses, ["rn-view", "done"]]);
    const chips = suggestionsFor(reply, ctx({ statuses }));
    expect(chips.some((c) => /View$/.test(c))).toBe(false);
  });

  it("doesn't offer \"I'm stuck on X\" for a topic already marked stuck", () => {
    const reply: Reply = { text: "Here's a prompt.", cards: [{ type: "prompt", topicId: "rn-flatlist" }] };
    const chips = suggestionsFor(reply, ctx());
    expect(chips).not.toContain("I'm stuck on FlatList");
  });

  it('offers "Why am I stuck?" only when something on the route is stuck', () => {
    const greet = greeting(ctx());
    expect(suggestionsFor(greet, ctx())).toContain("Why am I stuck?"); // the sample is stuck on FlatList
    const clean = new Map([...sampleStatuses].filter(([, s]) => s !== "stuck"));
    expect(suggestionsFor(greet, ctx({ statuses: clean }))).not.toContain("Why am I stuck?");
  });

  it("drops the exact thing the student just said", () => {
    const reply: Reply = { text: "Pick a goal first." };
    const chips = suggestionsFor(reply, ctx({ messages: [said("What should I do next?")] }));
    expect(chips).not.toContain("What should I do next?");
  });

  it('never ends in "??" when a topic name is itself a question', () => {
    for (const c of suggestionsFor(greeting(ctx()), ctx())) expect(c).not.toMatch(/\?\?$/);
  });

  it("without a goal, offers no map questions it couldn't answer", () => {
    const chips = suggestionsFor(greeting(ctx({ goal: null })), ctx({ goal: null }));
    expect(chips).toEqual([]);
  });

  it("at most four chips, every one a question or a plain report: no invented problems", () => {
    const chips = suggestionsFor(greeting(ctx()), ctx());
    expect(chips.length).toBeLessThanOrEqual(4);
    for (const c of chips) expect(c).toMatch(/^(What should I do next\?|Why am I stuck\?|I finished .+|I'm stuck on .+|Can I skip .+\?)$/);
  });
});
