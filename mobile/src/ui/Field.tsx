// A labelled text field, as on the web's sign-in form (auth.module.css .field): the label
// above, a 1px --control border that turns --text while you type in it, 8px corners.
// 48px tall rather than the web's 40, for a finger.

import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";
import { T } from "./Text";

interface Props extends TextInputProps {
  label: string;
  hint?: string;
}

export function Field({ label, hint, style, ...input }: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <T weight={500}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.faint}
        selectionColor={c.accent}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[styles.input, { borderColor: focused ? c.text : c.control, backgroundColor: c.surface, color: c.text, fontFamily: font[400] }, style]}
      />
      {hint && (
        <T size="small" tone="muted">
          {hint}
        </T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  input: { height: 48, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, fontSize: 15 },
});
