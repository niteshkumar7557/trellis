// Make the app's bitmaps from the SVG mark in code (docs/desktop.md §8).
//
// Trellis's rule is "every picture is SVG drawn in code", but macOS needs bitmaps for the
// app icon (.icns) and the menu-bar icon (PNG). So the SVG stays the source, from
// frontend/components/brand/brand.ts, and this script renders it. The output (build/,
// assets/) is git-ignored and remade by every `npm run build`.
//
// Run: node scripts/icons.ts   (Node 26 runs TypeScript files directly)

import { Resvg } from "@resvg/resvg-js";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, MARK_PATH } from "../../frontend/components/brand/brand.ts";

const root = join(import.meta.dirname, "..");
const png = (svg: string, size: number) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

// ---- The app icon: the browser-tab icon's design (paper mark on a leaf-green tile, see
// frontend/app/icon.svg), placed on Apple's icon grid: the tile fills 824 of 1024 units with
// a 185-unit corner radius, leaving the transparent margin every macOS icon has. The mark
// sits in the middle at 2.2 times the tile's 24-unit grid.
const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect x="100" y="100" width="824" height="824" rx="185" fill="${BRAND.leaf}"/>
  <path transform="translate(512 512) scale(22) translate(-12 -12.5)" d="${MARK_PATH}"
        fill="none" stroke="${BRAND.paper}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// macOS wants each size at 1x and 2x, under these exact names, in a folder ending .iconset.
const iconset = join(root, "build", "icon.iconset");
rmSync(iconset, { recursive: true, force: true });
mkdirSync(iconset, { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  writeFileSync(join(iconset, `icon_${size}x${size}.png`), png(appIcon, size));
  writeFileSync(join(iconset, `icon_${size}x${size}@2x.png`), png(appIcon, size * 2));
}
// iconutil ships with macOS: it packs the folder into the one .icns file the app bundle uses.
execFileSync("iconutil", ["-c", "icns", iconset, "-o", join(root, "build", "icon.icns")]);

// ---- The menu-bar icon: the bare mark, black on transparent (a template image; macOS
// recolours it). Menu-bar icons are 18 points tall; @2x is for Retina screens.
const trayIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="${MARK_PATH}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
</svg>`;
mkdirSync(join(root, "assets"), { recursive: true });
writeFileSync(join(root, "assets", "trayTemplate.png"), png(trayIcon, 18));
writeFileSync(join(root, "assets", "trayTemplate@2x.png"), png(trayIcon, 36));

console.log("icons: build/icon.icns, assets/trayTemplate.png, assets/trayTemplate@2x.png");
