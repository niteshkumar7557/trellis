// One message in the helper's thread, and its cards (the web's Chat.tsx Entry and Cards):
// "Trellis" with the mark, or "You" on a quiet ground like a line in the margin; then the
// text, any cards (confirm, prompt, choose) and, under the latest reply only, suggestion
// chips. Every reply is the server's; nothing here decides what Trellis says.

import { topicById } from "@shared/data";
import { instructions } from "@shared/data/instructions";
import { statusOf } from "@shared/graph";
import { buildPrompt, chatGptUrl, claudeUrl } from "@shared/prompt";
import type { Card, ChatMessage } from "@shared/types";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Mark } from "@/ui/Mark";
import { StatusMark } from "@/ui/Status";
import { T } from "@/ui/Text";
import { ConfirmCard } from "./ConfirmCard";
import type { Helper } from "./useHelper";

export function Entry({ role, at, children }: { role: ChatMessage["role"]; at: string | null; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.entry}>
      <View style={styles.who}>
        {role === "helper" ? (
          <>
            <Mark size={14} />
            <T size="small" weight={600} tone="muted">
              Trellis
            </T>
          </>
        ) : (
          <T size="small" weight={600} tone="muted">
            You
          </T>
        )}
        {at && (
          <T size="small" tone="faint" tabular style={{ marginLeft: "auto" }}>
            {new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </T>
        )}
      </View>
      <View style={[styles.body, role === "student" && { backgroundColor: c.raised, borderLeftColor: c.control, borderLeftWidth: 2, paddingVertical: 8, paddingHorizontal: 12, borderTopRightRadius: 8, borderBottomRightRadius: 8 }]}>
        {children}
      </View>
    </View>
  );
}

export function Cards({ cards, message, helper }: { cards?: Card[]; message: ChatMessage | null; helper: Helper }) {
  if (!cards?.length) return null;
  return (
    <View style={{ gap: 10 }}>
      {cards.map((card, i) => {
        if (card.type === "confirm" && message)
          return (
            <ConfirmCard
              key={i}
              card={card}
              busy={helper.thinking}
              onSave={(p) => void helper.save(message.id, i, p)}
              onCancel={() => void helper.cancel(message.id, i)}
              onUndo={() => void helper.undo(message.id, i)}
            />
          );
        if (card.type === "prompt") return <PromptLine key={i} topicId={card.topicId} />;
        if (card.type === "choose")
          return (
            <View key={i} style={styles.chips}>
              {card.options.map((o) => (
                <Button
                  key={o.label}
                  size="small"
                  label={o.label}
                  disabled={helper.thinking}
                  onPress={() => void helper.pick(o.outcome ?? card.outcome, o.topicIds, o.outcome ? `${o.label}: ${topicById.get(o.topicIds[0]!)?.name}` : o.label)}
                />
              ))}
            </View>
          );
        return null;
      })}
    </View>
  );
}

/** What the student might say next: under the latest reply only. A tap sends it. */
export function Suggestions({ helper }: { helper: Helper }) {
  const { c } = useTheme();
  if (!helper.suggestions.length) return null;
  return (
    <View style={styles.chips} accessibilityLabel="Things you could say">
      {helper.suggestions.map((s) => (
        <Pressable
          key={s}
          accessibilityRole="button"
          disabled={helper.thinking}
          onPress={() => void helper.say(s)}
          style={({ pressed }) => [styles.chip, { borderColor: c.border, backgroundColor: pressed ? c.raised : c.surface }]}
        >
          <T size="small">{s}</T>
        </Pressable>
      ))}
    </View>
  );
}

/** A prompt, folded to one line: copy or open it straight away, or open its topic. */
function PromptLine({ topicId }: { topicId: string }) {
  const { statuses, checkIns, experiences, act } = useStore();
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  const topic = topicById.get(topicId);
  if (!topic) return null;
  const prompt = buildPrompt(topic, statuses, checkIns, experiences, instructions);
  return (
    <View style={[styles.prompt, { borderColor: c.border }]}>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/topic/[id]", params: { id: topicId } })} style={styles.promptHead}>
        <StatusMark status={statusOf(statuses, topicId)} />
        <T weight={500} style={{ flex: 1 }}>
          Prompt for {topic.name}
        </T>
        <Icon name="forward" tone="faint" size={14} />
      </Pressable>
      <View style={styles.chips}>
        <Button
          size="small"
          kind="primary"
          icon={copied ? "check" : "copy"}
          label={copied ? "Copied" : "Copy"}
          onPress={async () => {
            await Clipboard.setStringAsync(prompt.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
            void act.tookPrompt(topicId, "copy");
          }}
        />
        <Button size="small" label="ChatGPT" trailing="external" onPress={() => (void Linking.openURL(chatGptUrl(prompt.text)), void act.tookPrompt(topicId, "chatgpt"))} />
        <Button size="small" label="Claude" trailing="external" onPress={() => (void Linking.openURL(claudeUrl(prompt.text)), void act.tookPrompt(topicId, "claude"))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { gap: 4, paddingHorizontal: 16, paddingVertical: 10 },
  who: { flexDirection: "row", alignItems: "center", gap: 6 },
  body: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderWidth: 1, borderRadius: 18, justifyContent: "center" },
  prompt: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  promptHead: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
});
