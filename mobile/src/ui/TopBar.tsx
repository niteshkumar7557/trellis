// A screen's title bar in the frame, above the sheet (the web's 48px top bar): an optional
// back button, the title, and room for an action on the right.

import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "./Icon";
import { T } from "./Text";

export function TopBar({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      {back && (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Icon name="back" size={20} />
        </Pressable>
      )}
      <T size="section" weight={600} style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </T>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 52, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 },
  back: { width: 32, height: 44, justifyContent: "center" },
});
