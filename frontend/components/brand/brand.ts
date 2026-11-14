// The Trellis brand in one place: the mark's geometry and the few colours that have to be
// written as plain hex.
//
// Why this file exists. Screens take their colours from the CSS tokens in app/globals.css,
// and should keep doing so. But some brand files are drawn where CSS variables don't reach:
// the browser-tab icon (app/icon.svg), and the PNGs Next renders at build time (the touch
// icon, the home-screen icons, the share image). Those import from here, so the mark and
// its green are defined once. No React and no Node APIs in this file: it is imported by
// both browser components and build-time image routes.
//
// app/icon.svg is a static file and can't import anything, so it repeats MARK_PATH and the
// two colours by hand. If the mark ever changes, change it there too.

/** The espalier mark: one trunk and three trained tiers, drawn as strokes on a 24 grid. */
export const MARK_PATH =
  "M12 22V3M12 7.5c-2.6 0-5.2-.2-8-1.5M12 7.5c2.6 0 5.2-.2 8-1.5M12 12.5c-2.8 0-5.6-.3-8.5-1.8M12 12.5c2.8 0 5.6-.3 8.5-1.8M12 17.5c-3 0-6-.4-9-2M12 17.5c3 0 6-.4 9-2";

export const BRAND = {
  name: "Trellis",
  /** One line for search results, link previews and the home-screen install prompt. */
  line: "The map of what you're learning.",
  description:
    "Trellis shows the map of a subject, what you can skip, what to study next, and the earlier topic that is really why you're stuck. It never teaches; it writes the prompt for your own AI.",
  /** Leaf green: --accent in the light theme. */
  leaf: "#2b6a3f",
  /** The same green on a dark ground: --accent in the dark theme. */
  leafOnDark: "#63b77e",
  /** The landing page's paper and its charcoal wall. */
  paper: "#eef0e9",
  charcoal: "#141813",
  ink: "#151714",
  /** Soft text on charcoal. */
  mist: "#b3bab0",
} as const;

/** Where the site lives; link previews need absolute addresses. Set NEXT_PUBLIC_SITE_URL to override. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://trellis.niteshkumar.xyz";
