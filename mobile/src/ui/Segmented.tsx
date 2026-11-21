// The segmented control from ui.module.css: options on an --active track, the chosen one on
// a white tile with a border. Screen readers hear a group of radio buttons.

import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/theme";
import type { ReactNode } from "react";
import { T } from "./Text";

interface Option<V extends string> {
  value: V;
  label: string;
  /** A mark before the label (the status shapes on Got it / Partly / Stuck). */
  mark?: ReactNode;
}

export function Segmented<V extends string>({ options, value, onChange, stretch }: { options: Option<V>[]; value: V | null; onChange: (v: V) => void; stretch?: boolean }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.track, { backgroundColor: c.active }, stretch && { alignSelf: "stretch" }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: on }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.value);
            }}
            style={[styles.segment, stretch && { flex: 1 }, on && { backgroundColor: c.surface, borderColor: c.border }]}
          >
            {o.mark}
            <T size="body" weight={500} tone={on ? "text" : "muted"}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", padding: 2, gap: 2, borderRadius: 8, alignSelf: "flex-start" },
  segment: { minHeight: 40, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
});
