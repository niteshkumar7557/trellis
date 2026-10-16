// The ONE place the backend reads process.env.
import "dotenv/config";

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
};

export default config;