// Drawings shared by the PNG brand files Next renders at build time: the Apple touch icon,
// the home-screen icons and the share image.
//
// Why PNG at all, when the rule is "no raster images". Nothing here is a picture file kept
// in the repo: each one is drawn in code (the same SVG mark) and Next turns it into a PNG
// during `next build`. The PNG step is forced on us: iOS ignores SVG touch icons, Android
// wants 192 and 512px PNGs to install a site, and WhatsApp, LinkedIn and X show no preview
// for an SVG share image.
//
// These run in Next's ImageResponse, which is not a browser: only inline styles, only
// flexbox, no CSS variables. That is why the colours come from BRAND as plain hex.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND } from "./brand";
import { Mark } from "./Mark";

/**
 * The mark in paper on a full leaf-green square.
 * `inset` is how much of the square the mark fills. A "maskable" Android icon may be
 * cropped to a circle, so it keeps the mark inside the middle 60%; the others use more.
 */
export function IconTile({ size, inset = 0.72 }: { size: number; inset?: number }) {
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.leaf }}>
      <Mark size={Math.round(size * inset)} color={BRAND.paper} weight={2.3} />
    </div>
  );
}

/**
 * IBM Plex Sans for ImageResponse, which can't use the web font the pages load (that one is
 * woff2, served by next/font; ImageResponse reads only ttf, otf and woff). The files come
 * from the @fontsource/ibm-plex-sans package and are read once, at build time.
 */
export async function plexFonts() {
  const file = (weight: number) =>
    readFile(join(process.cwd(), `node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${weight}-normal.woff`));
  const [regular, semibold] = await Promise.all([file(400), file(600)]);
  return [
    { name: "IBM Plex Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "IBM Plex Sans", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
}
