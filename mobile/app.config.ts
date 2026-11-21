// The app's configuration (docs/mobile.md §8). `npx expo prebuild` turns this into the
// Android project (android/, git-ignored): the package id, the URL scheme in the manifest,
// the icons, the splash screen. Change native behaviour here, never in android/ by hand,
// because prebuild rewrites that folder.
//
// A .ts file rather than app.json so it can carry comments and compute values.

import type { ExpoConfig } from "expo/config";

/**
 * The version students see, and the one the update check compares with GitHub's latest
 * release (src/lib/updates.ts). Raise it for every release, together with VERSION_CODE.
 */
const VERSION = "1.0.0";
/**
 * Android's own whole-number version. A phone refuses to install an update whose
 * versionCode isn't higher than the installed one's, whatever VERSION says.
 */
const VERSION_CODE = 1;

/** Leaf green, the brand colour (frontend/components/brand/brand.ts). */
const LEAF = "#2b6a3f";
/** --ground in the light and dark themes (frontend/app/globals.css): the frame's colour. */
const GROUND_LIGHT = "#f2f4f0";
const GROUND_DARK = "#0b0c0b";

const config: ExpoConfig = {
  name: "Trellis",
  slug: "trellis",
  version: VERSION,
  orientation: "portrait",
  // Follow the phone's light or dark setting (the student can override it in Settings).
  userInterfaceStyle: "automatic",
  // trellis://auth?code=… brings Google sign-in back to the app (docs/mobile.md §4), and
  // the launcher shortcuts open trellis://map and trellis://helper.
  scheme: "trellis",
  // Drawn from the SVG mark by scripts/icons.ts; generated, never committed (§6).
  icon: "./assets/generated/icon.png",
  backgroundColor: GROUND_LIGHT,
  android: {
    // The app's identity on Android: it can never change once students install it,
    // because a different id is a different app. A reversed domain the owner controls.
    package: "xyz.niteshkumar.trellis",
    versionCode: VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: "./assets/generated/adaptive-foreground.png",
      monochromeImage: "./assets/generated/adaptive-monochrome.png",
      backgroundColor: LEAF,
    },
    // Android 13+'s back gesture shows the screen underneath before you let go (§7).
    predictiveBackGestureEnabled: true,
    // Nothing the app does needs a permission beyond the internet (React Native declares
    // it) and vibration (haptics, which expo-haptics declares).
    permissions: [],
    // Libraries add some by default; each is removed here because Trellis never uses it:
    // biometrics (expo-secure-store's optional fingerprint lock), the Play Store install
    // referrer (expo-application), and storage and overlay access.
    blockedPermissions: [
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "expo-sharing",
    [
      "expo-font",
      {
        // IBM Plex Sans is built INTO the app (§6), so nothing is downloaded at run time
        // and the first screen already has the right font.
        fonts: [
          "node_modules/@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf",
          "node_modules/@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf",
          "node_modules/@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf",
        ],
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/generated/splash.png",
        imageWidth: 96,
        backgroundColor: GROUND_LIGHT,
        dark: { image: "./assets/generated/splash-dark.png", backgroundColor: GROUND_DARK },
      },
    ],
    // Release signing with our own key, arm64 only (docs/mobile.md §9).
    "./plugins/with-release-signing",
    // Long-press the icon: Map, Helper (docs/mobile.md §7).
    "./plugins/with-shortcuts",
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
