// "Learning something else?": the subject is saved as a request (the owner sees demand), and
// the answer is always "Coming soon" (design.md §14). The web's words.

import { subjectNames } from "@shared/data";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { T } from "@/ui/Text";

export function RequestSubject() {
  const { act } = useStore();
  const { c } = useTheme();
  const [other, setOther] = useState("");
  const [asked, setAsked] = useState<string | null>(null);

  const ask = () => {
    const text = other.trim();
    if (!text) return;
    setAsked(text);
    void act.requestSubject(text);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="Learning something else?"
            value={other}
            placeholder="For example: Kubernetes, linear algebra"
            onChangeText={(t) => {
              setOther(t);
              setAsked(null);
            }}
            returnKeyType="send"
            onSubmitEditing={ask}
          />
        </View>
        <Button label="Ask" disabled={!other.trim()} onPress={ask} style={{ height: 48 }} />
      </View>
      {asked && (
        <View accessibilityRole="text" style={[styles.reply, { backgroundColor: c.raised }]}>
          <T>
            <T weight={600}>Coming soon.</T> Trellis has reviewed maps for {subjectNames} only, for now. A map for “{asked}” isn’t ready yet.
          </T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  reply: { padding: 12, borderRadius: 8 },
});
