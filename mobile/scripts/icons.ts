// Make the app's bitmaps from the SVG mark in code (docs/mobile.md §6).
//
// Trellis's rule is "every picture is SVG drawn in code". Android's launcher and splash
// screen only take bitmaps, so, as the desktop app does (desktop/scripts/icons.ts), the SVG
// stays the source, from frontend/components/brand/brand.ts, and this script renders it.
// The output (assets/generated/) is git-ignored and remade before every build.
//
// Run: node scripts/icons.ts   (Node 24+ runs TypeScript files directly)

import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, MARK_PATH } from "../../frontend/components/brand/brand.ts";

const out = join(import.meta.dirname, "..", "assets", "generated");
mkdirSync(out, { recursive: true });

const save = (name: string, svg: string) => {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1024 } }).render().asPng();
  writeFileSync(join(out, name), png);
  console.log(`assets/generated/${name}`);
};

/** The mark, `size` units wide, centred on a 1024 canvas, in `colour`. */
const mark = (size: number, colour: string) => {
  const scale = size / 24;
  return `<path transform="translate(512 512) scale(${scale}) translate(-12 -12.5)" d="${MARK_PATH}"
    fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round"/>`;
};
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${body}</svg>`;

// The plain icon (older launchers, and the APK's icon in file managers): the browser-tab
// icon's design, paper mark on a leaf-green tile (frontend/app/icon.svg). Square: each
// launcher cuts its own shape out of it.
save("icon.png", svg(`<rect width="1024" height="1024" fill="${BRAND.leaf}"/>${mark(560, BRAND.paper)}`));

// The adaptive icon (Android 8+): a foreground layer over the leaf background colour set
// in app.config.ts. The launcher may crop the outer third to a circle or a squircle and
// moves the layers for parallax, so the mark stays inside the middle 66% "safe zone"
// (about 676 of 1024): 440 units wide leaves room for the strokes' round ends.
save("adaptive-foreground.png", svg(mark(440, BRAND.paper)));

// Android 13+'s "themed icons" tint this one layer to match the wallpaper; only its shape
// matters, so it's the same mark in plain black.
save("adaptive-monochrome.png", svg(mark(440, "#000000")));

// The splash screen: the green mark on the frame's colour (set in app.config.ts), as the
// app's first frame. A lighter green on the dark frame, as on the site (--accent).
save("splash.png", svg(mark(900, BRAND.leaf)));
save("splash-dark.png", svg(mark(900, BRAND.leafOnDark)));
