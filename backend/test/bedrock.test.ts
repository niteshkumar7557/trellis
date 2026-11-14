// src/ai/bedrock.ts with the AWS SDK faked: no network, no AWS account. What's checked:
// the request we send, that every outcome ends as a value or null (never a throw), that
// no call is sent without a reservation, and what each call is settled as.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { callForJson, errorCode, type JsonCall } from "../src/ai/bedrock.js";
import { costUsd, worstCaseUsd } from "../src/ai/limits.js";
import { reserveAiCall, settleAiCall } from "../src/repos/ai-calls.repo.js";

// vi.hoisted: vi.mock factories run before the imports above, so the fake `send` must be
// created that early too.
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: class {
    send = send;
  },
  // Keep the input, so the tests can look at the request.
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock("../src/repos/ai-calls.repo.js", () => ({ reserveAiCall: vi.fn(), settleAiCall: vi.fn() }));

const call = (over: Partial<JsonCall<{ ok: boolean }>> = {}): JsonCall<{ ok: boolean }> => ({
  purpose: "read",
  userId: 7,
  system: "Read it.",
  message: "finished State",
  schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
  schemaName: "test",
  check: (v) => (typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true ? { ok: true } : null),
  timeoutMs: 1000,
  maxTokens: 300,
  ...over,
});

const reply = (text: string, stopReason = "end_turn") => ({
  output: { message: { role: "assistant", content: [{ text }] } },
  stopReason,
  usage: { inputTokens: 1000, outputTokens: 100, totalTokens: 1100 },
});

const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => {});

// What this file's default call() reserves: its instructions and message, and 300 tokens out.
const RESERVED = worstCaseUsd("Read it." + "finished State", 300);

beforeEach(() => {
  vi.clearAllMocks();
  // By default there is room: the reservation is row 42.
  vi.mocked(reserveAiCall).mockResolvedValue({ id: "42", blockedBy: null });
});

describe("callForJson", () => {
  it("sends one Converse request with the schema as a JSON string, and returns the checked value", async () => {
    send.mockResolvedValue(reply('{"ok":true}'));
    expect(await callForJson(call())).toEqual({ ok: true });

    const [command, options] = send.mock.calls[0]!;
    const input = (command as { input: Record<string, any> }).input;
    expect(input.modelId).toBe("zai.glm-5");
    expect(input.system).toEqual([{ text: "Read it." }]);
    expect(input.messages).toEqual([{ role: "user", content: [{ text: "finished State" }] }]);
    expect(input.inferenceConfig).toEqual({ maxTokens: 300, temperature: 0 });
    const format = input.outputConfig.textFormat;
    expect(format.type).toBe("json_schema");
    expect(typeof format.structure.jsonSchema.schema).toBe("string");
    expect(JSON.parse(format.structure.jsonSchema.schema).additionalProperties).toBe(false);
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("reserves the worst case BEFORE the call, then settles the row with the real tokens and cost", async () => {
    send.mockResolvedValue(reply('{"ok":true}'));
    await callForJson(call());

    expect(reserveAiCall).toHaveBeenCalledWith(
      { userId: 7, model: "zai.glm-5", purpose: "read", reservedUsd: RESERVED },
      // The limits from the config's defaults.
      { siteDailyUsd: 0.5, userDailyUsd: 0.06, userWeeklyUsd: 0.25 },
    );
    // Money safety rests on this order: the row exists before Bedrock is called.
    expect(vi.mocked(reserveAiCall).mock.invocationCallOrder[0]!).toBeLessThan(send.mock.invocationCallOrder[0]!);
    expect(settleAiCall).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ inputTokens: 1000, outputTokens: 100, costUsd: costUsd(1000, 100), ok: true, error: null }),
    );
  });

  it.each(["day", "week", "site"] as const)("makes no call at all when the %s limit is reached", async (blockedBy) => {
    vi.mocked(reserveAiCall).mockResolvedValue({ id: null, blockedBy });
    expect(await callForJson(call())).toBeNull();
    expect(send).not.toHaveBeenCalled();
    expect(settleAiCall).not.toHaveBeenCalled();
  });

  it("fails closed: makes no call when the reservation can't be written", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(reserveAiCall).mockRejectedValue(new Error("db down"));
    expect(await callForJson(call())).toBeNull();
    expect(send).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("skips a reasoning block and reads the text block", async () => {
    send.mockResolvedValue({
      ...reply(""),
      output: { message: { role: "assistant", content: [{ reasoningContent: { reasoningText: { text: "hmm" } } }, { text: '{"ok":true}' }] } },
    });
    expect(await callForJson(call())).toEqual({ ok: true });
  });

  it.each([
    ["not JSON", "here you go: {ok}"],
    ["JSON the check refuses", '{"ok":false}'],
  ])("returns null for %s, records bad_output, and still counts the cost", async (_, text) => {
    send.mockResolvedValue(reply(text));
    expect(await callForJson(call())).toBeNull();
    expect(settleAiCall).toHaveBeenCalledWith("42", expect.objectContaining({ ok: false, error: "bad_output", costUsd: costUsd(1000, 100) }));
  });

  it("returns null when the reply was cut off, keeping the stop reason", async () => {
    send.mockResolvedValue(reply('{"ok":tr', "max_tokens"));
    expect(await callForJson(call())).toBeNull();
    expect(settleAiCall).toHaveBeenCalledWith("42", expect.objectContaining({ ok: false, error: "max_tokens" }));
  });

  it("gives up at the timeout, returns null, and counts the whole reservation", async () => {
    const log = quiet();
    // A call that only ends when its abort signal fires, like a slow Bedrock.
    send.mockImplementation(
      (_cmd: unknown, { abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise((_, reject) => abortSignal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    );
    const started = Date.now();
    expect(await callForJson(call({ timeoutMs: 50 }))).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
    // Nobody knows what a timed-out call was billed, so it counts as its worst case.
    expect(settleAiCall).toHaveBeenCalledWith("42", expect.objectContaining({ ok: false, error: "timeout", inputTokens: null, costUsd: RESERVED }));
    log.mockRestore();
  });

  it("returns null when Bedrock refuses, counts nothing, and never logs the message text", async () => {
    const log = quiet();
    send.mockRejectedValue(Object.assign(new Error("Too many requests"), { name: "ThrottlingException" }));
    expect(await callForJson(call())).toBeNull();
    // Refused before any model ran: not billed, so not counted.
    expect(settleAiCall).toHaveBeenCalledWith("42", expect.objectContaining({ ok: false, error: "throttled", costUsd: 0 }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("finished State");
    log.mockRestore();
  });

  it("still returns the value when the row can't be settled (it stays counted at its reservation)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue(reply('{"ok":true}'));
    vi.mocked(settleAiCall).mockRejectedValueOnce(new Error("db down"));
    expect(await callForJson(call())).toEqual({ ok: true });
    log.mockRestore();
  });
});

describe("errorCode", () => {
  it("names the usual failures", () => {
    const err = (name: string) => Object.assign(new Error("x"), { name });
    expect(errorCode(err("AccessDeniedException"), false)).toBe("denied");
    expect(errorCode(err("ValidationException"), false)).toBe("invalid_request");
    expect(errorCode(err("CredentialsProviderError"), false)).toBe("no_credentials");
    expect(errorCode(err("ResourceNotFoundException"), false)).toBe("no_model");
    expect(errorCode(err("ServiceUnavailableException"), false)).toBe("unavailable");
    expect(errorCode(err("Whatever"), false)).toBe("error");
    // The signal fired: a timeout, whatever the SDK called the error.
    expect(errorCode(err("Whatever"), true)).toBe("timeout");
  });
});
