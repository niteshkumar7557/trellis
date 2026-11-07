// Tests for src/config/index.ts.
//
// config is read ONCE, when the file is first imported, and then cached (that's how ES
// modules work: an import runs the file the first time only). So each test must
//   (a) set the environment, THEN
//   (b) import a FRESH copy of the file.
// vi.stubEnv(name, value) sets a variable until vi.unstubAllEnvs(); vi.resetModules()
// empties the module cache, so the next import() runs config/index.ts again.
//
// Your own backend/.env is loaded too (by dotenv), but dotenv never overwrites a variable
// that's already set. Stubbing every new variable to "" first ("" counts as "not set", so
// the default applies) makes these tests ignore your .env.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NEW_VARS = [
  "NEO4J_URL", "NEO4J_USER", "NEO4J_PASSWORD", "OPENROUTER_API_KEY",
  "ROUTER_MODEL", "READER_MODEL", "ROUTER_MIN_CONFIDENCE", "AI_TIMEOUT_MS",
];

async function loadConfig() {
  return (await import("../src/config/index.js")).default;
}

beforeEach(() => {
  vi.resetModules();
  for (const name of NEW_VARS) vi.stubEnv(name, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("config", () => {
  it("uses the defaults when nothing is set", async () => {
    const config = await loadConfig();
    expect(config.neo4j.url).toBe("bolt://localhost:7687");
    expect(config.neo4j.user).toBe("neo4j");
    expect(config.ai.router_min_confidence).toBe(0.7);
    expect(config.ai.timeout_ms).toBe(8000);
  });

  it("reads values from the environment, as numbers where needed", async () => {
    vi.stubEnv("NEO4J_URL", "bolt://neo4j:7687");
    vi.stubEnv("AI_TIMEOUT_MS", "5000");
    vi.stubEnv("ROUTER_MIN_CONFIDENCE", "0.5");
    const config = await loadConfig();
    expect(config.neo4j.url).toBe("bolt://neo4j:7687");
    expect(config.ai.timeout_ms).toBe(5000); // the number 5000, not the string "5000"
    expect(config.ai.router_min_confidence).toBe(0.5);
  });

  it("stops at boot when a number isn't a number", async () => {
    vi.stubEnv("AI_TIMEOUT_MS", "soon");
    await expect(loadConfig()).rejects.toThrow(/AI_TIMEOUT_MS/);
  });

  
  it("stops at boot when the confidence isn't between 0 and 1", async () => {
    vi.stubEnv("ROUTER_MIN_CONFIDENCE", "1.5");
    await expect(loadConfig()).rejects.toThrow(/between 0 and 1/);
  });

  it("accepts the edges, 0 and 1", async () => {
  vi.stubEnv("ROUTER_MIN_CONFIDENCE", "0");

  let config = await loadConfig();
  expect(config.ai.router_min_confidence).toBe(0);

  vi.resetModules();

  vi.stubEnv("ROUTER_MIN_CONFIDENCE", "1");

  config = await loadConfig();
  expect(config.ai.router_min_confidence).toBe(1);
});
});
