// The Helper tab (docs/mobile.md §5): the thread for the subject on screen, "how did it go?"
// after a prompt, the basic-mode line at an AI limit, and the composer. On the web this is
// the map's right-hand panel; a phone gives it its own tab.
//
// The topic sheet's Got it / Partly / Stuck land here as ?tap=…&topic=…: the tap is sent
// once (it goes through the helper's one question and confirm card, like on the web) and
// the parameters are cleared so it isn't sent again.

import { topicById } from "@shared/data";
import { awaitingReport, shortDate } from "@shared/graph";
import type { Outcome } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from "react-native";
import { Cards, Entry, Suggestions } from "@/helper/Thread";
import { useHelper } from "@/helper/useHelper";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";
import { Button } from "@/ui/Button";
import { Frame } from "@/ui/Frame";
import { Icon } from "@/ui/Icon";
import { Mark } from "@/ui/Mark";
import { T } from "@/ui/Text";
import { backAt, basicReason } from "../../../../../frontend/lib/usage";

const OUTCOME_LABEL: Record<Outcome, string> = { got: "Got it", partly: "Partly", stuck: "Stuck" };

export default function HelperScreen() {
  const helper = useHelper();
  const { usage, subjectId } = useStore();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ tap?: Outcome; topic?: string }>();
  const [text, setText] = useState("");
  const scroller = useRef<ScrollViewInstance>(null);

  // A tap from the topic sheet: send it once, then clear it from the address.
  useEffect(() => {
    const topic = params.topic ? topicById.get(params.topic) : null;
    if (!params.tap || !topic) return;
    void helper.pick(params.tap, [topic.id], `${OUTCOME_LABEL[params.tap]}: ${topic.name}`);
    router.setParams({ tap: undefined, topic: undefined });
  }, [params.tap, params.topic]); // eslint-disable-line react-hooks/exhaustive-deps

  const basic = usage ? basicReason(usage) : null;
  const send = () => {
    if (!text.trim() || helper.thinking) return;
    void helper.say(text);
    setText("");
  };

  return (
    <Frame
      bottomInset={false}
      header={
        <View style={styles.top}>
          <Mark size={20} />
          <T size="section" weight={600}>
            Helper
          </T>
        </View>
      }
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <HowDidItGo helper={helper} subjectId={subjectId} />
        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
          {helper.more && <Button kind="ghost" label="Show earlier messages" onPress={() => void helper.loadOlder()} />}
          {helper.messages.length === 0 && (
            <Entry role="helper" at={null}>
              <T>{helper.hello.text}</T>
              <Cards cards={helper.hello.cards} message={null} helper={helper} />
              <Suggestions helper={helper} />
            </Entry>
          )}
          {helper.messages.map((m, i) => {
            const day = m.at.slice(0, 10);
            const newDay = i === 0 || helper.messages[i - 1]!.at.slice(0, 10) !== day;
            return (
              <View key={m.id}>
                {newDay && (
                  <T size="small" tone="faint" style={styles.day}>
                    {shortDate(m.at)}
                  </T>
                )}
                <Entry role={m.role} at={m.at}>
                  <T>{m.text}</T>
                  <Cards cards={m.cards} message={m} helper={helper} />
                  {i === helper.messages.length - 1 && m.role === "helper" && <Suggestions helper={helper} />}
                </Entry>
              </View>
            );
          })}
          {helper.thinking && (
            <Entry role="helper" at={null}>
              <T tone="muted" accessibilityLabel="The helper is reading">
                Reading…
              </T>
            </Entry>
          )}
        </ScrollView>

        {basic && usage && (
          <T size="small" tone="muted" style={[styles.basic, { borderTopColor: c.rule }]}>
            {basic} The helper is in basic mode until {backAt(usage)}.
          </T>
        )}
        <View style={[styles.compose, { borderTopColor: c.border }]}>
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder="What did you study? Or ask: what's next, can I skip…"
            placeholderTextColor={c.faint}
            selectionColor={c.accent}
            accessibilityLabel="Tell the helper what you studied, or ask anything"
            style={[styles.input, { borderColor: c.control, color: c.text, backgroundColor: c.surface, fontFamily: font[400] }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!text.trim() || helper.thinking}
            onPress={send}
            style={[styles.send, { backgroundColor: !text.trim() || helper.thinking ? c.active : c.primary }]}
          >
            <Icon name="send" tone={!text.trim() || helper.thinking ? "faint" : "onPrimary"} size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Frame>
  );
}

/**
 * Back after taking a prompt and not said how it went: one line asks (design.md §7). The
 * answers go through the helper like the topic sheet's buttons. "Not yet" hides it for now
 * and saves nothing. It never says how long ago: "you took this 9 days ago" reads as a
 * reproach.
 */
function HowDidItGo({ helper, subjectId }: { helper: ReturnType<typeof useHelper>; subjectId: string }) {
  const { promptTakes, checkIns } = useStore();
  const { c } = useTheme();
  const [hidden, setHidden] = useState<string | null>(null);
  const take = awaitingReport(promptTakes.filter((t) => topicById.get(t.topicId)?.subjectId === subjectId), checkIns, new Date());
  if (!take || take.id === hidden) return null;
  const name = topicById.get(take.topicId)!.name;
  return (
    <View style={[styles.follow, { backgroundColor: c.raised, borderBottomColor: c.border }]}>
      <T weight={500}>How did {name} go?</T>
      <View style={styles.row}>
        {(["got", "partly", "stuck"] as const).map((o) => (
          <Button key={o} size="small" label={OUTCOME_LABEL[o]} disabled={helper.thinking} onPress={() => void helper.pick(o, [take.topicId], `${OUTCOME_LABEL[o]}: ${name}`)} />
        ))}
        <Button size="small" kind="ghost" label="Not yet" onPress={() => setHidden(take.id)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  day: { textAlign: "center", marginTop: 12 },
  basic: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  compose: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  follow: { padding: 12, gap: 8, borderBottomWidth: 1 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
