// A row you pick from a list, like the web's subject cards and goal rows on /start: a
// 1px border that turns --text when chosen, on an --active fill. Screen readers hear a
// radio button.

import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/theme";
import { radius } from "@/theme/type";

export function Choice({ on, onPress, label, children }: { on: boolean; onPress: () => void; label: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        { borderColor: on ? c.text : c.border, backgroundColor: on ? c.raised : c.surface },
        pressed && { backgroundColor: c.active },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: radius.card, padding: 14, gap: 4 },
});
