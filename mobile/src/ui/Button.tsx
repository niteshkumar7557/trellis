// Buttons, as in ui.module.css: primary (near-black), plain (outlined), ghost, danger; 6px
// corners; one height per row. Two things are the phone's own:
//   - 44px tall (TOUCH), where the web's are 32: fingers, not a mouse;
//   - an optional haptic tick on press (docs/mobile.md §7), for the actions that change the
//     record (Save, Undo), so the student feels it happened.

import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { radius, TOUCH } from "@/theme/type";
import { Icon, type IconName } from "./Icon";
import { T } from "./Text";

export type ButtonKind = "primary" | "plain" | "ghost" | "danger";

interface Props {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  /** An icon after the label (ChatGPT ↗). */
  trailing?: IconName;
  disabled?: boolean;
  /** "small" (36) for buttons inside a row of content, like the web's chips. */
  size?: "normal" | "small";
  haptic?: "light" | "warning";
  style?: StyleProp<ViewStyle>;
  /** Only the label is read out by default; set this when the label isn't enough. */
  accessibilityLabel?: string;
}

export function Button({ label, onPress, kind = "plain", icon, trailing, disabled, size = "normal", haptic, style, accessibilityLabel }: Props) {
  const { c } = useTheme();

  const look = {
    primary: { bg: c.primary, border: c.primary, ink: "onPrimary" as const },
    plain: { bg: c.surface, border: c.control, ink: "text" as const },
    ghost: { bg: "transparent", border: "transparent", ink: "muted" as const },
    danger: { bg: c.surface, border: c.stuck, ink: "stuck" as const },
  }[kind];
  // Disabled looks the same for every kind, as on the web: plainly not ready.
  const off = { bg: kind === "ghost" ? "transparent" : c.raised, border: kind === "ghost" ? "transparent" : c.border, ink: "faint" as const };
  const now = disabled ? off : look;

  const press = () => {
    if (haptic === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (haptic === "warning") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={press}
      hitSlop={size === "small" ? 6 : 2}
      style={({ pressed }) => [
        styles.base,
        { height: size === "small" ? 36 : TOUCH, backgroundColor: now.bg, borderColor: now.border },
        // The web's :active nudges down 1px; primary also dims to 0.88 like its :hover.
        pressed && { transform: [{ translateY: 1 }], opacity: kind === "primary" ? 0.88 : 1 },
        pressed && kind !== "primary" && { backgroundColor: kind === "danger" ? c.stuckBg : kind === "ghost" ? c.active : c.raised },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon && <Icon name={icon} tone={now.ink} />}
        <T weight={500} tone={now.ink} numberOfLines={1}>
          {label}
        </T>
        {trailing && <Icon name={trailing} tone={now.ink} size={14} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, borderRadius: radius.control, paddingHorizontal: 14, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
