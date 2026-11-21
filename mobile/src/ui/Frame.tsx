// The "framed sheet", the app screens' one layout (globals.css, shell.module.css): a
// green-grey frame (--ground), and the work on a white sheet (--surface) with a 1px border
// and 16px corners, inset 8px. On the phone the frame also carries the status bar at the
// top (the app draws edge to edge), so the sheet starts below it.

import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";
import { radius } from "@/theme/type";

interface Props {
  children: ReactNode;
  /** Something in the frame above the sheet (a screen's title bar). */
  header?: ReactNode;
  /** Keep clear of the system navigation bar at the bottom (screens without a tab bar). */
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Frame({ children, header, bottomInset = true, style }: Props) {
  const { c } = useTheme();
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: inset.top, paddingBottom: bottomInset ? inset.bottom + 8 : 8 }}>
      {header}
      <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, marginHorizontal: 8, borderWidth: 1, borderRadius: radius.sheet, overflow: "hidden" },
});
