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
};

export default config;