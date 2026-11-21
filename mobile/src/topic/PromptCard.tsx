// "Your prompt" (the web's PromptView in Rail.tsx): the assembled prompt in its three parts,
// so it's clear where each line comes from, then Copy, ChatGPT, Claude, and on the phone
// Share (docs/mobile.md §7). Every way of taking it is recorded (POST /api/prompt-takes), so
// the helper can ask "how did it go?" when the student comes back.
//
// ChatGPT and Claude open through Linking: Android offers their apps when installed (they
// claim those web addresses), else the browser.

import { chatGptUrl, claudeUrl, type Prompt } from "@shared/prompt";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Linking, Pressable, Share, StyleSheet, View } from "react-native";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { T } from "@/ui/Text";

export function PromptCard({ prompt, topicId }: { prompt: Prompt; topicId: string }) {
  const { c } = useTheme();
  const { act } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const label = (text: string) => (
    <T size="small" weight={600} tone="muted" style={styles.label}>
      {text}
    </T>
  );

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.box, { backgroundColor: c.raised }]}>
        <View style={!expanded && styles.clipped}>
          {label("Known")}
          <T>{prompt.known}</T>
          {prompt.experiences.length > 0 && (
            <View style={styles.part}>
              {label("From your notes")}
              {prompt.experiences.map((l) => (
                <T key={l}>• {l}</T>
              ))}
            </View>
          )}
          <View style={styles.part}>
            {label("Instructions")}
            {prompt.instructions.map((l) => (
              <T key={l}>• {l}</T>
            ))}
          </View>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.toggle} hitSlop={6}>
        <T weight={500}>{expanded ? "Show less" : "Show the whole prompt"}</T>
        <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
          <Icon name="chevron" size={14} />
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button
          kind="primary"
          icon={copied ? "check" : "copy"}
          label={copied ? "Copied" : "Copy"}
          style={{ flex: 1 }}
          onPress={async () => {
            await Clipboard.setStringAsync(prompt.text);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
            void act.tookPrompt(topicId, "copy");
          }}
        />
        <Button
          icon="share"
          label="Share"
          style={{ flex: 1 }}
          onPress={async () => {
            const result = await Share.share({ message: prompt.text });
            // Shared into another app is as good as copied: the student took the prompt.
            if (result.action === Share.sharedAction) void act.tookPrompt(topicId, "copy");
          }}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="ChatGPT"
          trailing="external"
          style={{ flex: 1 }}
          onPress={() => {
            void Linking.openURL(chatGptUrl(prompt.text));
            void act.tookPrompt(topicId, "chatgpt");
          }}
        />
        <Button
          label="Claude"
          trailing="external"
          style={{ flex: 1 }}
          onPress={() => {
            void Linking.openURL(claudeUrl(prompt.text));
            void act.tookPrompt(topicId, "claude");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 8, padding: 14 },
  clipped: { maxHeight: 150, overflow: "hidden" },
  label: { textTransform: "none", marginBottom: 4 },
  part: { marginTop: 12, gap: 2 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32 },
  actions: { flexDirection: "row", gap: 8 },
});
