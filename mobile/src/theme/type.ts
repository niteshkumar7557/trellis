// Type and spacing from globals.css (--fs-*, --radius-*), in React Native's units.
//
// React Native on Android doesn't pick a font file from `fontWeight` for a custom font: each
// weight is its own family, named after its file (app.config.ts builds the three files into
// the app). So text sets `fontFamily` from this table instead of `fontWeight`.

export const font = {
  400: "IBMPlexSans_400Regular",
  500: "IBMPlexSans_500Medium",
  600: "IBMPlexSans_600SemiBold",
} as const;
export type Weight = keyof typeof font;

/** [fontSize, lineHeight] for each role. Body is the web's 14/20; the rest follow its scale. */
export const size = {
  figure: [28, 34],
  title: [22, 28],
  section: [16, 22],
  body: [14, 20],
  lede: [15, 22],
  small: [12, 16],
} as const;
export type Size = keyof typeof size;

export const radius = { card: 8, control: 6, sheet: 16, pill: 999 } as const;

/**
 * The height of anything a finger presses. The web's controls are 32px, a mouse size;
 * Android asks for 48dp touch targets. 44 drawn + the hit slop Pressable adds reaches it.
 */
export const TOUCH = 44;
