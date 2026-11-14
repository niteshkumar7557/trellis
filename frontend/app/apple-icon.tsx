// The icon iOS uses when someone adds Trellis to their home screen. iOS rounds the corners
// itself and ignores SVG, so this is a square PNG, drawn in code and rendered at build time.

import { ImageResponse } from "next/og";
import { IconTile } from "@/components/brand/images";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconTile size={180} />, size);
}
