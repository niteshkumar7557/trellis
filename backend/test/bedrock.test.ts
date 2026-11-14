// src/ai/bedrock.ts with the AWS SDK faked: no network, no AWS account. What's checked:
// the request we send, that every outcome ends as a value or null (never a throw), and
// the ai_calls row each call leaves behind.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { callForJson, costUsd, errorCode, type JsonCall } from "../src/ai/bedrock.js";
import { insertAiCall } from "../src/repos/ai-calls.repo.js";

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
vi.mock("../src/repos/ai-calls.repo.js", () => ({ insertAiCall: vi.fn() }));

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

beforeEach(() => vi.clearAllMocks());

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

  it("records a good call with its tokens and cost", async () => {
    send.mockResolvedValue(reply('{"ok":true}'));
    await callForJson(call());
    expect(insertAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        model: "zai.glm-5",
        purpose: "read",
        inputTokens: 1000,
        outputTokens: 100,
        costUsd: costUsd(1000, 100),
        ok: true,
        error: null,
      }),
    );
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
    expect(insertAiCall).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: "bad_output", costUsd: costUsd(1000, 100) }));
  });

  it("returns null when the reply was cut off, keeping the stop reason", async () => {
    send.mockResolvedValue(reply('{"ok":tr', "max_tokens"));
    expect(await callForJson(call())).toBeNull();
    expect(insertAiCall).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: "max_tokens" }));
  });

  it("gives up at the timeout and returns null", async () => {
    const log = quiet();
    // A call that only ends when its abort signal fires, like a slow Bedrock.
    send.mockImplementation(
      (_cmd: unknown, { abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise((_, reject) => abortSignal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    );
    const started = Date.now();
    expect(await callForJson(call({ timeoutMs: 50 }))).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
    expect(insertAiCall).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: "timeout", inputTokens: null, costUsd: null }));
    log.mockRestore();
  });

  it("returns null when Bedrock refuses, and never logs the message text", async () => {
    const log = quiet();
    send.mockRejectedValue(Object.assign(new Error("Too many requests"), { name: "ThrottlingException" }));
    expect(await callForJson(call())).toBeNull();
    expect(insertAiCall).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: "throttled" }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("finished State");
    log.mockRestore();
  });

  it("still returns the value when the ai_calls row can't be written", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue(reply('{"ok":true}'));
    vi.mocked(insertAiCall).mockRejectedValueOnce(new Error("db down"));
    expect(await callForJson(call())).toEqual({ ok: true });
    log.mockRestore();
  });
});

describe("costUsd and errorCode", () => {
  it("prices tokens with the configured rates, rounded to the column's 6 places", () => {
    // 1,700 in at $1.03/M and 120 out at $3.30/M (Sydney): about a fifth of a cent.
    expect(costUsd(1700, 120)).toBe(0.002147);
    expect(costUsd(0, 0)).toBe(0);
  });

  it("names the usual failures", () => {
    const err = (name: string) => Object.assign(new Error("x"), { name });
    expect(errorCode(err("AccessDeniedException"), false)).toBe("denied");
    expect(errorCode(err("ValidationException"), false)).toBe("invalid_request");
    expect(errorCode(err("CredentialsProviderError"), false)).toBe("no_credentials");
    expect(errorCode(err("ResourceNotFoundException"), false)).toBe("no_model");
    expect(errorCode(err("Whatever"), false)).toBe("error");
    // The signal fired: a timeout, whatever the SDK called the error.
    expect(errorCode(err("Whatever"), true)).toBe("timeout");
  });
});
