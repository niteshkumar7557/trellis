// The ONE place the backend reads process.env. Everything else imports `config`.
// It runs once, when first imported, and THROWS on a missing or bad value: a typo in .env
// stops the server at boot with a clear message, instead of failing strangely later.
// The variables and their reasons are listed in docs/backend-design.md §8 "Config".
import "dotenv/config"; // copies backend/.env into process.env (never overwrites a set variable)

/** "" counts as "not set", so a blank line in .env falls back to the default. */
function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

/**
 * A value the server cannot run without. There is deliberately no fallback: a default
 * JWT secret would mean every install that forgot to set one signs tokens with the same
 * public string, and anyone could forge a login.
 */
function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Config: ${name} is required. See backend/example.env.`);
  }
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Config: ${name} must be a number, got "${v}"`);
  }
  return n;
}

/**
 * A dollar limit. Zero is allowed (it means "no AI calls"); a negative number is refused,
 * because a typo such as -0.5 would otherwise silently switch the AI off, or worse, be
 * read by some later change as "no limit".
 */
function money(name: string, fallback: number): number {
  const n = num(name, fallback);
  if (n < 0) throw new Error(`Config: ${name} must be 0 or more, got "${n}"`);
  return n;
}

function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const v = str(name, fallback);
  if (!(allowed as readonly string[]).includes(v)) {
    throw new Error(`Config: ${name} must be one of ${allowed.join(", ")}, got "${v}"`);
  }
  return v as T;
}

const jwtSecret = required("JWT_SECRET");
// 32 characters is 128+ bits from `openssl rand -hex 32` (which gives 64). Shorter secrets
// such as "admin123" can be guessed offline from any one token, and then every token forged.
if (jwtSecret.length < 32) {
  throw new Error("Config: JWT_SECRET must be at least 32 characters. Make one with `openssl rand -hex 32`.");
}

const nodeEnv = str("NODE_ENV", "development");

const config = {
  server_port: num("PORT", num("SERVER_PORT", 8000)),
  node_env: nodeEnv,
  is_production: nodeEnv === "production",

  // How many proxies stand in front of the API and add to X-Forwarded-For. In production:
  // CloudFront, then Caddy = 2 (docs/aws.md §4). Express then takes the visitor's address
  // from the right place, and the rate limits count each visitor, not each proxy. Too low
  // and everyone shares one limit; too high and a visitor can forge their address. 0 in
  // development, where nothing sits in front and a forged header must not be believed.
  trust_proxy_hops: num("TRUST_PROXY_HOPS", nodeEnv === "production" ? 2 : 0),

  // Where the site lives, as the browser sees it. Used to build reset links (and, in M6.3,
  // the Google redirect). Replaces CLIENT_URL: with one origin there is no separate client.
  public_url: str("PUBLIC_URL", "http://localhost:3000").replace(/\/$/, ""),

  db: {
    url: required("DB_URL"),
  },

  jwt_secret: jwtSecret,
  access_token_ttl: str("ACCESS_TOKEN_TTL", "15m"),
  // 60 days from the LAST use: a student coming back after six weeks is still signed in.
  refresh_token_days: num("REFRESH_TOKEN_DAYS", 60),

  // Vitest sets NODE_ENV=test. Tests sign up dozens of users from one address, so the
  // limits would make them fail for a reason that has nothing to do with what they test.
  // The limiter itself has its own test (test/rate-limit.test.ts).
  rate_limits: nodeEnv !== "test",

  // Sign in with Google (backend-design.md §4). Off while either is empty: the routes
  // answer 404 and the frontend hides the button. Made in Google Cloud Console.
  google: {
    client_id: str("GOOGLE_CLIENT_ID", ""),
    client_secret: str("GOOGLE_CLIENT_SECRET", ""), // a secret: from .env only
  },

  // The topic graph's database. The site runs without it (backend-design.md §2).
  neo4j: {
    url: str("NEO4J_URL", "bolt://localhost:7687"),
    user: str("NEO4J_USER", "neo4j"),
    password: process.env.NEO4J_PASSWORD, // a secret: from .env only, no default
  },

  // The helper's AI: GLM 5 on Amazon Bedrock (milestone M5). "off" means the rule-based
  // reader reads every message and no AWS is needed, which is right for development and
  // tests. AWS credentials are never read here: the SDK finds them itself (§5).
  ai: {
    provider: oneOf("AI_PROVIDER", ["bedrock", "off"] as const, "off"),
    // Sydney, on the owner's call (14 Nov 2026): close to where the site is hosted. GLM 5
    // runs in Mumbai too, but Bedrock follows the server.
    region: str("BEDROCK_REGION", "ap-southeast-2"),
    reader_model: str("READER_MODEL", "zai.glm-5"),
    // GLM 5 in Sydney, standard tier (AWS Price List, 14 Nov 2026). Dollars per million.
    price_in_per_m: num("READER_PRICE_IN_PER_M", 1.03),
    price_out_per_m: num("READER_PRICE_OUT_PER_M", 3.3),
    timeout_ms: num("AI_TIMEOUT_MS", 6000), // a slow answer is worse than a plain one
    // The spending limits, in dollars (backend-design.md §5 "Cost limits"). The site's
    // daily budget is the one that caps the bill: $0.50 a day is at most $15 a month.
    daily_budget_usd: money("AI_DAILY_BUDGET_USD", 0.5),
    // Each account's own allowance, the same across its subjects. At about $0.002 a
    // message these are roughly 30 AI-read messages a day and 125 a week; at most $1.08 a
    // month from one account. Students see them only as a percentage.
    user_daily_usd: money("AI_USER_DAILY_USD", 0.06),
    user_weekly_usd: money("AI_USER_WEEKLY_USD", 0.25),
    // Typed messages a day, whoever reads them: a guard against a script filling the
    // chat table, not a money limit.
    helper_daily_messages: num("HELPER_DAILY_MESSAGES", 100),
  },
};

export default config;
