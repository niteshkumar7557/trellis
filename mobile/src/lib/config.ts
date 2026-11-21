// Where the app finds Trellis. The live site by default; for development, point it at the
// backend on the Mac with EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SITE_URL (Expo copies
// EXPO_PUBLIC_* variables into the bundle at build time; anything else stays on the Mac).
//
// Two addresses because Google sign-in starts on the SITE (it must come back to the site's
// /auth/desktop page), while every API call goes to /api. In production they're one origin.

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://trellis.niteshkumar.xyz").replace(/\/$/, "");

export const config = {
  siteUrl: SITE_URL,
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? `${SITE_URL}/api`).replace(/\/$/, ""),
};
