// The /api/:path* rewrite is what makes the app same-origin: the browser only ever
// talks to this origin, so the auth cookie stays sameSite lax and the API needs no
// public route.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  }
};
export default nextConfig;

