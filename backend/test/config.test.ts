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
// that's already set. Stubbing every optional variable to "" first ("" counts as "not
// set", so the default applies) makes these tests ignore your .env. JWT_SECRET and DB_URL
// come from vitest.config.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OPTIONAL_VARS = [
  "NODE_ENV", "PUBLIC_URL", "REFRESH_TOKEN_DAYS", "NEO4J_URL", "NEO4J_USER", "NEO4J_PASSWORD",
  "AI_PROVIDER", "BEDROCK_REGION", "READER_MODEL", "AI_TIMEOUT_MS", "AI_DAILY_BUDGET_USD",
  "HELPER_DAILY_MESSAGES", "AI_USER_DAILY_USD", "AI_USER_WEEKLY_USD",
];

async function loadConfig() {
  return (await import("../src/config/index.js")).default;
}

beforeEach(() => {
  vi.resetModules();
  for (const name of OPTIONAL_VARS) vi.stubEnv(name, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("config", () => {
  it("uses the defaults when nothing optional is set", async () => {
    const config = await loadConfig();
    expect(config.refresh_token_days).toBe(60);
    expect(config.public_url).toBe("http://localhost:3000");
    expect(config.neo4j.url).toBe("bolt://localhost:7687");
    expect(config.ai.provider).toBe("off"); // no AWS needed unless asked for
    expect(config.ai.reader_model).toBe("zai.glm-5");
    expect(config.ai.timeout_ms).toBe(6000);
    // The spending limits (backend-design.md §5): the site's day, an account's day and week.
    expect(config.ai.daily_budget_usd).toBe(0.5);
    expect(config.ai.user_daily_usd).toBe(0.06);
    expect(config.ai.user_weekly_usd).toBe(0.25);
  });

  it("stops at boot on a negative spending limit, and accepts zero (no AI calls)", async () => {
    vi.stubEnv("AI_USER_DAILY_USD", "-0.06");
    await expect(loadConfig()).rejects.toThrow(/AI_USER_DAILY_USD must be 0 or more/);
    vi.resetModules();
    vi.stubEnv("AI_USER_DAILY_USD", "0");
    expect((await loadConfig()).ai.user_daily_usd).toBe(0);
  });

  it("reads values from the environment, as numbers where needed", async () => {
    vi.stubEnv("AI_TIMEOUT_MS", "5000");
    vi.stubEnv("AI_PROVIDER", "bedrock");
    vi.stubEnv("PUBLIC_URL", "https://trellis.example/"); // the trailing slash is dropped
    const config = await loadConfig();
    expect(config.ai.timeout_ms).toBe(5000); // the number 5000, not the string "5000"
    expect(config.ai.provider).toBe("bedrock");
    expect(config.public_url).toBe("https://trellis.example");
  });

  it("stops at boot without a JWT_SECRET", async () => {
    vi.stubEnv("JWT_SECRET", "");
    await expect(loadConfig()).rejects.toThrow(/JWT_SECRET is required/);
  });

  it("stops at boot when the JWT_SECRET is short enough to guess", async () => {
    vi.stubEnv("JWT_SECRET", "admin123");
    await expect(loadConfig()).rejects.toThrow(/at least 32 characters/);
  });

  it("stops at boot without a DB_URL", async () => {
    vi.stubEnv("DB_URL", "");
    await expect(loadConfig()).rejects.toThrow(/DB_URL is required/);
  });

  it("stops at boot when a number isn't a number", async () => {
    vi.stubEnv("AI_TIMEOUT_MS", "soon");
    await expect(loadConfig()).rejects.toThrow(/AI_TIMEOUT_MS/);
  });

  it("stops at boot on an unknown AI provider", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    await expect(loadConfig()).rejects.toThrow(/AI_PROVIDER must be one of bedrock, off/);
  });

  it("turns rate limits off only under tests", async () => {
    vi.stubEnv("NODE_ENV", "test");
    expect((await loadConfig()).rate_limits).toBe(false);
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const config = await loadConfig();
    expect(config.rate_limits).toBe(true);
    expect(config.is_production).toBe(true);
  });

  it("trusts two proxies in production (CloudFront, Caddy), none in development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await loadConfig()).trust_proxy_hops).toBe(2);
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    expect((await loadConfig()).trust_proxy_hops).toBe(0);
    vi.resetModules();
    vi.stubEnv("TRUST_PROXY_HOPS", "1"); // the fallback with Caddy alone, no CloudFront
    expect((await loadConfig()).trust_proxy_hops).toBe(1);
  });
});
