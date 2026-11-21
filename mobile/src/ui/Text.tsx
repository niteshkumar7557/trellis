// All text goes through <T>, so the font, the sizes and the colours stay the design
// system's (src/theme/type.ts) and nobody writes a fontFamily by hand.

import { Text, type TextProps } from "react-native";
import { useTheme } from "@/theme/theme";
import type { Tokens } from "@/theme/tokens";
import { font, size as sizes, type Size, type Weight } from "@/theme/type";

interface Props extends TextProps {
  size?: Size;
  weight?: Weight;
  /** A token name: "text" (default), "muted", "faint", or a status ink. */
  tone?: keyof Tokens;
  /** Numbers that line up in columns (the web's .num). */
  tabular?: boolean;
}

export function T({ size = "body", weight = 400, tone = "text", tabular, style, ...rest }: Props) {
  const { c } = useTheme();
  const [fontSize, lineHeight] = sizes[size];
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font[weight], fontSize, lineHeight, color: c[tone] },
        // Large headings are drawn a little tighter, as on the web (letter-spacing -0.015em).
        size === "figure" || size === "title" ? { letterSpacing: -0.3 } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}
