// The home-screen icons the web manifest (app/manifest.ts) points at: /pwa-icon/192,
// /pwa-icon/512 and /pwa-icon/maskable. Android needs PNGs at these sizes before it offers
// "Install app"; each is drawn in code and rendered once, at build time.

import { ImageResponse } from "next/og";
import { IconTile } from "@/components/brand/images";

const KINDS = {
  "192": { size: 192, inset: 0.72 },
  "512": { size: 512, inset: 0.72 },
  // Android may crop a maskable icon to a circle or a squircle, so the mark stays well inside.
  maskable: { size: 512, inset: 0.56 },
} as const;

// Only these three exist, and they never change between requests: build them ahead of time.
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(KINDS).map((kind) => ({ kind }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { size, inset } = KINDS[kind as keyof typeof KINDS];
  return new ImageResponse(<IconTile size={size} inset={inset} />, { width: size, height: size });
}
