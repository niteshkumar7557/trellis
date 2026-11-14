// src/ai/reader.ts with Bedrock faked: fixed model replies (good, malformed, unknown topic
// ids, a timeout) and what each becomes. A null Reading means the rules read the message.
// No network and no AWS account: the SDK is replaced, like in bedrock.test.ts.

import { goalById } from "@shared/data";
import { replyFor, type HelperContext } from "@shared/helper";
import type { ChatMessage } from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { READING_SCHEMA, checkReading, instructionsFor, messageFor, readByModel, warmUp } from "../src/ai/reader.js";
import { reserveAiCall, settleAiCall } from "../src/repos/ai-calls.repo.js";

// The reader only calls the model when AI_PROVIDER=bedrock. vi.hoisted runs before the
// imports above, so config/index.ts sees it when it first loads.
const { send } = vi.hoisted(() => {
  process.env.AI_PROVIDER = "bedrock";
  return { send: vi.fn() };
});
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: class {
    send = send;
  },
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock("../src/repos/ai-calls.repo.js", () => ({ reserveAiCall: vi.fn(), settleAiCall: vi.fn() }));

const ctx = (over: Partial<HelperContext> = {}): HelperContext => ({
  subjectId: "react-native",
  goal: goalById.get("goal-rn-first-app")!,
  statuses: new Map(),
  claims: [],
  checkIns: [],
  experiences: [],
  messages: [],
  selected: null,
  opened: [],
  ...over,
});

/** What GLM 5 might send back: a full Reading in JSON, with any fields overridden. */
const model = (over: Record<string, unknown> = {}) => ({
  output: {
    message: {
      role: "assistant",
      content: [{ text: JSON.stringify({ path: "other", topicIds: [], bigId: null, outcome: null, experiences: [], help: null, ...over }) }],
    },
  },
  stopReason: "end_turn",
  usage: { inputTokens: 1700, outputTokens: 120 },
});

/** The input of the one Converse request sent. */
const sent = () => (send.mock.calls[0]![0] as { input: Record<string, any> }).input;

beforeEach(() => {
  vi.clearAllMocks();
  // By default no limit is reached: the call is reserved as row 1.
  vi.mocked(reserveAiCall).mockResolvedValue({ id: "1", blockedBy: null });
});

describe("readByModel", () => {
  it("turns a good reply into a Reading, keeping the student's own words as `said`", async () => {
    send.mockResolvedValue(
      model({
        path: "report",
        topicIds: ["rn-flatlist"],
        outcome: "stuck",
        experiences: [{ kind: "hard", text: "keyExtractor makes no sense", line: "keyExtractor confused me." }],
      }),
    );
    const r = await readByModel("stuck on flatlist, keyExtractor makes no sense", ctx(), 9);
    expect(r).toEqual({
      path: "report",
      topicIds: ["rn-flatlist"],
      bigId: null,
      outcome: "stuck",
      experiences: [{ kind: "hard", text: "keyExtractor makes no sense", line: "keyExtractor confused me." }],
      help: null,
      said: "stuck on flatlist, keyExtractor makes no sense",
    });
    expect(settleAiCall).toHaveBeenCalledWith("1", expect.objectContaining({ ok: true, error: null }));
  });

  it("feeds replyFor like any reader: the model's 'what comes after FlatList' is a question, not stuck", async () => {
    // The rules' blind spot (§5): "lost" reads as stuck. The model can tell.
    send.mockResolvedValue(model({ path: "next" }));
    const r = await readByModel("I'm lost on what comes after FlatList", ctx(), 9);
    expect(replyFor(r!, ctx()).text).toMatch(/^Next up: /);
  });

  it.each([
    ["malformed JSON", { ...model(), output: { message: { role: "assistant", content: [{ text: '{"path": "rep' }] } } }],
    ["a wrong shape", model({ path: "chat" })],
    ["only made-up topic ids", model({ path: "report", topicIds: ["rn-flatlists", "redux"], outcome: "got" })],
    ["a cut-off reply", { ...model(), stopReason: "max_tokens" }],
  ])("returns null for %s, so the rules read it", async (_, reply) => {
    send.mockResolvedValue(reply);
    expect(await readByModel("finished flatlist", ctx(), 9)).toBeNull();
    expect(settleAiCall).toHaveBeenCalledWith("1", expect.objectContaining({ ok: false }));
  });

  it("returns null when Bedrock times out", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    send.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    expect(await readByModel("finished flatlist", ctx(), 9)).toBeNull();
    expect(settleAiCall).toHaveBeenCalledWith("1", expect.objectContaining({ ok: false, error: "timeout" }));
    log.mockRestore();
  });

  it.each(["day", "week", "site"] as const)("doesn't call the model at all once the %s limit is reached", async (blockedBy) => {
    vi.mocked(reserveAiCall).mockResolvedValue({ id: null, blockedBy });
    expect(await readByModel("finished flatlist", ctx(), 9)).toBeNull();
    expect(send).not.toHaveBeenCalled();
    expect(settleAiCall).not.toHaveBeenCalled();
  });

  it("reserves each call for the student who typed it", async () => {
    send.mockResolvedValue(model());
    await readByModel("hello", ctx(), 9);
    expect(reserveAiCall).toHaveBeenCalledWith(expect.objectContaining({ userId: 9, purpose: "read" }), expect.anything());
  });

  it("sends the subject's instructions and the message, and nothing about the student", async () => {
    send.mockResolvedValue(model());
    await readByModel("hello", ctx({ selected: "rn-state" }), 9);
    const input = sent();
    expect(input.system[0].text).toBe(instructionsFor("react-native"));
    const user = input.messages[0].content[0].text as string;
    expect(user).toContain("Topic open beside the chat: rn-state (State).");
    expect(user).toContain("<<<\nhello\n>>>");
    expect(JSON.stringify(input)).not.toMatch(/@|userId|email/);
  });
});

describe("checkReading", () => {
  const ok = { path: "report", topicIds: [], bigId: null, outcome: "got", experiences: [], help: null };

  it("keeps only subtopics of this subject, each once", () => {
    const r = checkReading({ ...ok, topicIds: ["rn-state", "rn-state", "rd-str-setget", "nope", "rn-props"] }, "x", "react-native");
    expect(r!.topicIds).toEqual(["rn-state", "rn-props"]);
  });

  it("treats a big topic put in topicIds as the bigId, and drops a bigId from the other subject", () => {
    expect(checkReading({ ...ok, topicIds: ["rn-lists"] }, "x", "react-native")).toMatchObject({ topicIds: [], bigId: "rn-lists" });
    expect(checkReading({ ...ok, bigId: "rd-lists" }, "x", "react-native")!.bigId).toBeNull();
  });

  it("cuts texts to 500 characters, rebuilds an empty line, and drops empty notes", () => {
    const r = checkReading(
      {
        ...ok,
        topicIds: ["rn-state"],
        experiences: [
          { kind: "hard", text: "a".repeat(900), line: "" },
          { kind: "easy", text: "  ", line: "Nothing." },
          { kind: "easy", text: "hooks were fine", line: "  " },
        ],
      },
      "x",
      "react-native",
    );
    expect(r!.experiences).toHaveLength(2);
    expect(r!.experiences[0]!.text).toHaveLength(500);
    expect(r!.experiences[1]).toEqual({ kind: "easy", text: "hooks were fine", line: "Hooks were fine." });
  });

  it("keeps a known guide key and drops an invented one", () => {
    expect(checkReading({ ...ok, path: "app_help", outcome: null, help: "theme" }, "x", "react-native")!.help).toBe("theme");
    expect(checkReading({ ...ok, path: "app_help", outcome: null, help: "billing" }, "x", "react-native")!.help).toBeNull();
  });

  it("forgives slips in the side fields, as GLM 5 really sent them", () => {
    // The first real call's reply had "help": [] (the schema allows a key or null).
    const r = checkReading({ ...ok, topicIds: ["rn-flatlist"], help: [], bigId: 3 }, "x", "react-native");
    expect(r).toMatchObject({ topicIds: ["rn-flatlist"], help: null, bigId: null });
    expect(checkReading({ ...ok, topicIds: "rn-flatlist" }, "x", "react-native")!.topicIds).toEqual([]);
  });

  it("refuses anything that isn't the schema", () => {
    expect(checkReading(undefined, "x", "react-native")).toBeNull();
    expect(checkReading({ ...ok, outcome: "done" }, "x", "react-native")).toBeNull();
    expect(checkReading({ path: "report" }, "x", "react-native")).toBeNull();
  });
});

describe("what the model is told", () => {
  it("lists every topic of the subject, and none of the other subject", () => {
    const text = instructionsFor("react-native");
    expect(text).toContain("# rn-lists: Lists");
    expect(text).toContain("- rn-flatlist: FlatList");
    expect(text).not.toMatch(/\brd-/); // a Redis id; "keyboard-" inside an RN id is fine
    expect(instructionsFor("redis")).toContain("- rd-str-setget: Reading and writing strings");
  });

  it("names the question the helper is waiting on", () => {
    const asked: ChatMessage = {
      id: "m1",
      subjectId: "react-native",
      at: "",
      role: "helper",
      text: "Sounds like you're stuck on FlatList. What's confusing about it?",
      asks: { kind: "hard", pending: { updates: [{ topicId: "rn-flatlist", outcome: "stuck" }], experiences: [], said: "" } },
    };
    expect(messageFor("the keys", ctx({ messages: [asked] }))).toMatch(/^Trellis just asked about FlatList: what was confusing/);
    expect(messageFor("the keys", ctx())).not.toContain("just asked");
  });

  it("uses a schema Bedrock accepts: every object closed, every field required, few unions", () => {
    let unions = 0;
    const walk = (node: any) => {
      if (node.type === "object" || (Array.isArray(node.type) && node.type.includes("object"))) {
        expect(node.additionalProperties).toBe(false);
        expect([...node.required].sort()).toEqual(Object.keys(node.properties).sort());
        Object.values(node.properties).forEach(walk);
      }
      if (Array.isArray(node.type)) unions++;
      if (node.items) walk(node.items);
      for (const banned of ["minimum", "maximum", "minLength", "maxLength", "multipleOf"]) expect(node).not.toHaveProperty(banned);
    };
    walk(READING_SCHEMA);
    expect(unions).toBeLessThanOrEqual(16);
  });
});

describe("warmUp", () => {
  it("sends one small call with the same schema and a long timeout, recorded as a warm-up", async () => {
    send.mockResolvedValue(model({ path: "next" }));
    expect(await warmUp()).toBe(true);
    const input = sent();
    expect(input.outputConfig.textFormat.structure.jsonSchema.schema).toBe(JSON.stringify(READING_SCHEMA));
    expect(input.system[0].text.length).toBeLessThan(100); // not the topic list: it would cost more
    // No account: only the site's budget can stop a warm-up.
    expect(reserveAiCall).toHaveBeenCalledWith(expect.objectContaining({ userId: null, purpose: "warmup" }), expect.anything());
    expect(settleAiCall).toHaveBeenCalledWith("1", expect.objectContaining({ ok: true }));
  });

  it("skips when the site's budget is spent", async () => {
    vi.mocked(reserveAiCall).mockResolvedValue({ id: null, blockedBy: "site" });
    expect(await warmUp()).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
