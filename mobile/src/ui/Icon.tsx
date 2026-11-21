// The web's one outline icon set (frontend/components/ui/Icon.tsx), the same paths: 16 grid,
// 1.5 stroke. Drawn with react-native-svg, which turns SVG elements into native drawing.
// Three are added for the tab bar and the helper (chat, user, send), drawn the same way.

import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/theme";
import type { Tokens } from "@/theme/tokens";

const paths = {
  map: "M2.5 4.5 6 3l4 1.5L13.5 3v8.5L10 13l-4-1.5-3.5 1.5zM6 3v8.5M10 4.5V13",
  list: "M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01",
  journal: "M4 2.5h7.5A1.5 1.5 0 0 1 13 4v9.5H4.5A1.5 1.5 0 0 1 3 12V3.5a1 1 0 0 1 1-1zM3 12a1.5 1.5 0 0 1 1.5-1.5H13M6 5.5h4",
  settings: "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1",
  search: "M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5",
  copy: "M5.5 5.5V3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-2.5M3 5.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5z",
  external: "M9.5 2.5h4v4M13.5 2.5 7.5 8.5M11.5 9v4a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h4",
  back: "M10 3 5 8l5 5",
  forward: "M6 3l5 5-5 5",
  close: "M4 4l8 8M12 4l-8 8",
  chevron: "M4 6l4 4 4-4",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.6a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.6",
  edit: "M10.5 2.5l3 3L6 13H3v-3z",
  download: "M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10",
  check: "M3 8.5 6.5 12 13 4.5",
  route: "M4.5 14V10.5a2 2 0 0 1 2-2h3a2 2 0 0 0 2-2V2.5M9.5 4.5l2-2 2 2",
  share: "M8 2.5v8M5 5.5l3-3 3 3M3.5 8.5v4a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-4",
  chat: "M2.5 4a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 13.5 4v5.5A1.5 1.5 0 0 1 12 11H6.5L3.5 13.5V11h0A1 1 0 0 1 2.5 10z",
  send: "M2.5 8h9M8 4l4 4-4 4",
} as const;

export type IconName = keyof typeof paths | "google";

export function Icon({ name, size = 16, tone = "text" }: { name: IconName; size?: number; tone?: keyof Tokens }) {
  const { c } = useTheme();
  if (name === "google") {
    // Google's own four colours: their brand rules ask for the mark as it is.
    return (
      <Svg width={size} height={size} viewBox="0 0 16 16">
        <Path fill="#4285F4" d="M15.7 8.2c0-.6-.1-1.1-.2-1.6H8v3h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.4-3.4 2.4-5.8z" />
        <Path fill="#34A853" d="M8 16c2.2 0 4-.7 5.3-2l-2.6-2a4.8 4.8 0 0 1-7.2-2.5H.9v2A8 8 0 0 0 8 16z" />
        <Path fill="#FBBC05" d="M3.5 9.5a4.8 4.8 0 0 1 0-3v-2H.9a8 8 0 0 0 0 7z" />
        <Path fill="#EA4335" d="M8 3.2c1.2 0 2.3.4 3.2 1.2l2.3-2.3A8 8 0 0 0 .9 4.5l2.6 2A4.8 4.8 0 0 1 8 3.2z" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d={paths[name]} stroke={c[tone]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
