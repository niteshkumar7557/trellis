// Small solid tags: "Next" (near-black, like the web's .next), "Optional" (neutral), and the
// skip verdict, "Don't skip" (near-black) / "Can skip" (neutral), as in rail.module.css.

import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/theme";
import { T } from "./Text";

export function Tag({ label, strong }: { label: string; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: strong ? c.primary : c.active }]}>
      <T size="small" weight={600} tone={strong ? "onPrimary" : "muted"} style={styles.text}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { height: 20, paddingHorizontal: 7, borderRadius: 999, justifyContent: "center", alignSelf: "flex-start" },
  text: { fontSize: 11, lineHeight: 14 },
});
