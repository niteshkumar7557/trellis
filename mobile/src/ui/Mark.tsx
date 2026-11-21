// The Trellis mark, from the one definition the site uses (frontend/components/brand/brand.ts;
// Metro watches that folder, see metro.config.js).

import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/theme";
import { MARK_PATH } from "../../../frontend/components/brand/brand";

export function Mark({ size = 20, color, weight = 2 }: { size?: number; color?: string; weight?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={MARK_PATH} stroke={color ?? c.accent} strokeWidth={weight} strokeLinecap="round" />
    </Svg>
  );
}
