// The ONE place the backend reads process.env. Everything else imports `config`.
// It runs once, when first imported, and THROWS on a bad value: a typo in .env stops the
// server at boot with a clear message, instead of failing strangely later.
import "dotenv/config"; // copies backend/.env into process.env (never overwrites a set variable)

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return (v === undefined || v === "") ? fallback : v;
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

function fraction(name: string, fallback: number): number {
  const n = num(name, fallback);
  if (n < 0 || n > 1) {
    throw new Error(`Config: ${name} must be between 0 and 1, got "${n}"`);
  }
  return n;
}

const config = {
  server_port: num("PORT", num("SERVER_PORT", 8000)),
  client_url: process.env.CLIENT_URL,
  node_env: process.env.NODE_ENV,

  db: {
    url: process.env.DB_URL,
  },

  jwt_secret: process.env.JWT_SECRET,
  access_token_ttl: str("ACCESS_TOKEN_TTL", "15m"),
  refresh_token_days: num("REFRESH_TOKEN_DAYS", 7),

  // The topic graph's database (milestone M1).
  neo4j: {
    url: str("NEO4J_URL", "bolt://localhost:7687"),
    user: str("NEO4J_USER", "neo4j"),
    password: process.env.NEO4J_PASSWORD, // a secret: from .env only, no default
  },

  // The helper's AI, through OpenRouter (milestone M5). Model ids: openrouter.ai/models.
  ai: {
    openrouter_api_key: process.env.OPENROUTER_API_KEY, // a secret: no default
    router_model: str("ROUTER_MODEL", ""), // Jev: picks the helper's path
    reader_model: str("READER_MODEL", ""), // DeepSeek v4.1 flash: reads the message
    // Below this, the router's guess is ignored. A fraction, 0 to 1.
    router_min_confidence: fraction("ROUTER_MIN_CONFIDENCE", 0.7),
    timeout_ms: num("AI_TIMEOUT_MS", 8000), // give up on an AI call after this long
  },
};

export default config;