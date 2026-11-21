// Where the app points, and the one place a developer can change it.

import { app } from "electron";

export const PRODUCTION_ORIGIN = "https://trellis.niteshkumar.xyz";

/**
 * The site the window loads: production, always, in the packaged app.
 *
 * TRELLIS_URL (e.g. http://localhost:3000) works only while running from source
 * (`npm start`, the e2e tests). In the packaged app it is ignored on purpose: otherwise
 * anyone who can set an environment variable for the student could point the trusted
 * window, and its bridge, at their own site.
 */
export function siteOrigin(): string {
  const override = process.env.TRELLIS_URL;
  if (!app.isPackaged && override) return new URL(override).origin;
  return PRODUCTION_ORIGIN;
}

/** The first page: a signed-in student's map, or the demo map with "Sign in" when signed out. */
export const START_PATH = "/map";

/** Page background while the site loads, so a dark Mac doesn't flash white. From app/globals.css --ground. */
export const BACKGROUND = { light: "#f2f4f0", dark: "#0b0c0b" };
