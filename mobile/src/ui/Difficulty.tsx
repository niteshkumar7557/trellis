// How hard a topic usually is: three rising bars and a coloured word, NEVER a filled pill,
// so it can't be read as a status (frontend/components/ui/Difficulty.tsx, same geometry).

import type { Difficulty } from "@shared/types";
import { StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/theme/theme";
import { T } from "./Text";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function DifficultyMark({ level }: { level: Difficulty }) {
  const { c } = useTheme();
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      {[0, 1, 2].map((i) => (
        <Rect key={i} x={i * 3.5} y={6 - i * 3} width={2.5} height={4 + i * 3} rx={0.6} fill={i < LEVEL[level] ? c[level] : c.control} />
      ))}
    </Svg>
  );
}

export function DifficultyTag({ level }: { level: Difficulty }) {
  return (
    <View style={styles.tag} accessibilityLabel={`${DIFFICULTY_LABEL[level]}: how hard people usually find this topic`}>
      <DifficultyMark level={level} />
      <T size="small" weight={500} tone={`${level}Ink`}>
        {DIFFICULTY_LABEL[level]}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({ tag: { flexDirection: "row", alignItems: "center", gap: 5 } });
