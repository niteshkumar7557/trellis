// The landing page's display typeface: Fraunces, a soft old-style serif, for headings only.
//
// Why a second typeface here, when the app is IBM Plex Sans throughout (the owner's call,
// 14 Nov 2026): set in Plex, the landing page's headings looked like interface text, the
// same face and nearly the same size as everything around them. A serif makes a heading
// read as a heading at a glance, and Fraunces has the look of an old gardening book, which
// is where the name Trellis and the espalier drawings come from.
//
// What stays Plex Sans: paragraphs, buttons, the logo, and every piece of the app shown on
// the page (the map, the trace, the prompt), so those still look like the product.
//
// It is loaded here, not in app/layout.tsx, so only the landing page downloads it.
// `opsz` is the font's optical-size axis: the letter shapes adjust to the size they are
// set at, finer at 80px and sturdier at 28px, with no extra work in the CSS.

import { Fraunces } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});
