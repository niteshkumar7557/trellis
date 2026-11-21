// A tappable row in a list (the web's list.module.css rows): a status mark, a name with a
// muted line under it, and something on the right. 56px tall, a hairline between rows.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/theme";

interface Props {
  onPress: () => void;
  accessibilityLabel: string;
  left?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  /** Not needed for the goal: drawn faded, as on the web (data-skip). */
  faded?: boolean;
  indent?: boolean;
}

export function Row({ onPress, accessibilityLabel, left, children, right, faded, indent }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.row, indent && styles.indent, pressed && { backgroundColor: c.raised }, faded && { opacity: 0.55 }]}
    >
      {left}
      <View style={styles.body}>{children}</View>
      {right}
    </Pressable>
  );
}

export function Rule() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  indent: { paddingLeft: 24 },
  body: { flex: 1, gap: 2, minWidth: 0 },
});
