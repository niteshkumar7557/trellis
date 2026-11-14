// Topic difficulty (easy / medium / hard) and the one helper rule that depends on it:
// after Got it on an EASY topic the helper doesn't ask "what felt easy, and was anything
// hard?", because there's nothing useful to say (shared/helper.ts, questionFor).
// Every other case still asks. The ratings themselves are checked for completeness in
// data-checks.test.ts (every subtopic has one).

import { describe, expect, it } from "vitest";
import { kids, topicById, topics } from "@shared/data";
import { respond, type HelperContext } from "@shared/helper";
import type { Status, SubjectId } from "@shared/types";

function ctx(subjectId: SubjectId, statuses: [string, Status][] = []): HelperContext {
  return {
    subjectId,
    goal: null,
    statuses: new Map(statuses),
    claims: [],
    checkIns: [],
    experiences: [],
    messages: [],
    selected: null,
    opened: [],
  };
}

const tap = (outcome: "got" | "partly" | "stuck", id: string) => ({ kind: "pick" as const, outcome, topicIds: [id] });

describe("the ratings", () => {
  it("every topic has one", () => {
    for (const t of topics) expect(["easy", "medium", "hard"]).toContain(t.difficulty);
  });

  it("a big topic takes the hardest of its core subtopics, and ignores optional ones", () => {
    for (const big of topics.filter((t) => t.parentId === null)) {
      const core = kids(big.id).filter((t) => !t.optional);
      const rank = { easy: 0, medium: 1, hard: 2 };
      const hardest = Math.max(...core.map((t) => rank[t.difficulty]));
      expect(rank[big.difficulty], big.id).toBe(hardest);
    }
  });

  it("the case that started this: Installing Redis is easy", () => {
    expect(topicById.get("rd-install")!.difficulty).toBe("easy");
  });
});

describe("Got it on an easy topic", () => {
  it("goes straight to the confirm card, with no question", () => {
    const reply = respond(tap("got", "rd-install"), ctx("redis"));
    expect(reply.asks).toBeUndefined();
    expect(reply.text).toBe("Nice, Installing Redis done. Here's what I'll save.");
    expect(reply.cards?.[0]).toMatchObject({ type: "confirm", proposal: { updates: [{ topicId: "rd-install", outcome: "got" }] } });
  });

  it("the same when typed", () => {
    const reply = respond({ kind: "say", text: "I finished installing redis" }, ctx("redis"));
    expect(reply.asks).toBeUndefined();
    expect(reply.cards?.[0]).toMatchObject({ type: "confirm" });
  });

  it("still asks what made it click when the topic was stuck before", () => {
    const reply = respond(tap("got", "rd-install"), ctx("redis", [["rd-install", "stuck"]]));
    expect(reply.asks).toMatchObject({ kind: "clicked" });
  });
});

describe("everything else still asks", () => {
  it.each([
    ["got", "rd-expire", "easy"], // medium
    ["got", "rd-watch", "easy"], // hard
    ["partly", "rd-install", "hard"], // easy, but only partly
    ["stuck", "rd-install", "hard"], // stuck on an easy topic: the most telling case
  ] as const)("%s on %s", (outcome, id, kind) => {
    expect(respond(tap(outcome, id), ctx("redis")).asks).toMatchObject({ kind });
  });
});
