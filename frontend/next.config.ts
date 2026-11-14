// In development the browser talks only to this origin (localhost:3000), and this
// rewrite forwards /api/* to the Express API. So the frontend needs no CORS and the
// refresh cookie can be SameSite=Strict, exactly as in production, where Caddy does
// this job instead (backend-design.md §2).
//
// The /api prefix is kept on the way through: every backend route starts with /api.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // shared/ (the domain code the backend also runs) sits outside this folder; this lets
  // Next compile it as source. It is bundled at build time, so standalone output is unchanged.
  experimental: { externalDir: true },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/:path*`,
      },
    ];
  }
};
export default nextConfig;

