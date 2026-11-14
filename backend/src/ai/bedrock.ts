// The one place the backend talks to Amazon Bedrock (docs/backend-design.md §5).
//
// callForJson() sends one Converse request that must answer in a given JSON schema, and
// gives back the checked value, or null. It NEVER throws: every way a call can fail
// (timeout, throttled, no credentials, unusable output) ends as null, and the caller falls
// back to the rule-based reader. A failing model must never fail a student's message.
//
// Every call, good or bad, leaves one row in ai_calls with its tokens, cost and latency.
// That row is what the daily budget is counted from (src/ai/reader.ts).
//
// Credentials: none are read here. The SDK's default chain finds them: on the server the
// EC2 instance role, on a laptop the profile named in AWS_PROFILE (`trellis`). So there
// are no AWS keys in any env file.

import { BedrockRuntimeClient, ConverseCommand, type ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import config from "../config/index.js";
import { insertAiCall } from "../repos/ai-calls.repo.js";

export interface JsonCall<T> {
  purpose: "read" | "warmup";
  /** Whose message this reads. Null for the server's own warm-up call. */
  userId: number | null;
  /** The fixed instructions. */
  system: string;
  /** The user turn: what to read. */
  message: string;
  /** A JSON schema the reply must follow (Bedrock structured output). */
  schema: object;
  schemaName: string;
  /** Turns the parsed reply into a T, or null when it is unusable. */
  check: (value: unknown) => T | null;
  timeoutMs: number;
  /** A hard cap on the reply's length. Always set: an unset cap reserves the model's maximum. */
  maxTokens: number;
}

// One client for the whole process: it keeps its connections and cached credentials.
// Created on first use, so a server with AI_PROVIDER=off never builds one.
let client: BedrockRuntimeClient | null = null;
function bedrock(): BedrockRuntimeClient {
  // maxAttempts 1: one attempt, no retries. A retry after a 6-second timeout would make
  // the student wait 12 seconds for an answer the rules can give at once.
  client ??= new BedrockRuntimeClient({ region: config.ai.region, maxAttempts: 1 });
  return client;
}

/** What a call cost, in dollars, from the token counts and the configured prices. */
export function costUsd(inputTokens: number, outputTokens: number): number {
  const dollars = (inputTokens * config.ai.price_in_per_m + outputTokens * config.ai.price_out_per_m) / 1_000_000;
  // NUMERIC(10,6) in the table: round here so the row and this number agree.
  return Math.round(dollars * 1_000_000) / 1_000_000;
}

/**
 * A short, stable code for why a call failed, for ai_calls.error and the log. The SDK
 * names its errors after the service's exceptions (err.name).
 */
export function errorCode(err: unknown, timedOut: boolean): string {
  if (timedOut) return "timeout";
  const name = err instanceof Error ? err.name : "";
  switch (name) {
    case "AbortError":
    case "TimeoutError":
      return "timeout";
    case "ThrottlingException":
    case "ServiceQuotaExceededException":
      return "throttled";
    case "AccessDeniedException":
      return "denied"; // the role or profile may not call this model
    case "ResourceNotFoundException":
      return "no_model"; // wrong model id or region
    case "ValidationException":
      return "invalid_request"; // our request or schema is wrong: a bug on our side
    case "CredentialsProviderError":
      return "no_credentials"; // no role, no profile, or the laptop's sign-in expired
    default:
      return "error";
  }
}

/** The text of the reply. GLM 5 may send a reasoning block first, so find the text one. */
function replyText(out: ConverseCommandOutput): string | null {
  for (const block of out.output?.message?.content ?? []) {
    if (typeof block.text === "string") return block.text;
  }
  return null;
}

export async function callForJson<T>(call: JsonCall<T>): Promise<T | null> {
  const model = config.ai.reader_model;
  const started = Date.now();
  const signal = AbortSignal.timeout(call.timeoutMs);

  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let value: T | null = null;
  let error: string | null = null;

  try {
    const out = await bedrock().send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: call.system }],
        messages: [{ role: "user", content: [{ text: call.message }] }],
        // temperature 0: the same message should read the same way every time.
        inferenceConfig: { maxTokens: call.maxTokens, temperature: 0 },
        outputConfig: {
          textFormat: {
            type: "json_schema",
            // Bedrock takes the schema as a JSON string, not an object.
            structure: { jsonSchema: { name: call.schemaName, schema: JSON.stringify(call.schema) } },
          },
        },
      }),
      { abortSignal: signal },
    );
    inputTokens = out.usage?.inputTokens ?? null;
    outputTokens = out.usage?.outputTokens ?? null;

    if (out.stopReason !== "end_turn") {
      // max_tokens means the JSON was cut off half-way; content_filtered and the rest
      // mean there is no answer to use. The stop reason is the most useful code to keep.
      error = out.stopReason ?? "no_stop_reason";
    } else {
      const text = replyText(out);
      value = text === null ? null : call.check(parseJson(text));
      if (value === null) error = "bad_output";
    }
  } catch (err) {
    error = errorCode(err, signal.aborted);
    // A ValidationException means our request is wrong, and every call will fail the
    // same way until the code is fixed: say so loudly. The rest are expected now and then.
    // Never log the message text: it is the student's private words.
    const log = error === "invalid_request" ? console.error : console.warn;
    log(`Bedrock call failed: ${error}${err instanceof Error ? ` (${err.name}: ${err.message.slice(0, 200)})` : ""}`);
  }

  try {
    await insertAiCall({
      userId: call.userId,
      model,
      purpose: call.purpose,
      inputTokens,
      outputTokens,
      // A failed call that Bedrock still counted tokens for was still paid for.
      costUsd: inputTokens !== null && outputTokens !== null ? costUsd(inputTokens, outputTokens) : null,
      latencyMs: Date.now() - started,
      ok: value !== null,
      error,
    });
  } catch (err) {
    // The bookkeeping failing must not throw away a good reading. The budget undercounts
    // by one call, which is far less harm than failing the student's message.
    console.error("Could not record an ai_calls row.", err);
  }
  return value;
}

/** JSON.parse that answers undefined instead of throwing, so check() sees "unusable". */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

