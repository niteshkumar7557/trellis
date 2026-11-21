// The confirm card (the web's Chat.tsx ConfirmCard): what the helper proposes to save. The
// student can change each outcome and edit or add their note; NOTHING is saved until Save
// (design.md §7), and Undo is there after. Save and Undo give a haptic tick.

import { topicById } from "@shared/data";
import { tidy } from "@shared/parse";
import type { Card, ExperienceKind, Outcome, Proposal } from "@shared/types";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/theme/theme";
import { font } from "@/theme/type";
import { Button } from "@/ui/Button";
import { Segmented } from "@/ui/Segmented";
import { StatusMark } from "@/ui/Status";
import { T } from "@/ui/Text";

const OUTCOMES = [
  { value: "got" as const, label: "Got it", status: "done" as const },
  { value: "partly" as const, label: "Partly", status: "learning" as const },
  { value: "stuck" as const, label: "Stuck", status: "stuck" as const },
];
const KINDS: { value: ExperienceKind; label: string }[] = [
  { value: "easy", label: "Felt easy" },
  { value: "hard", label: "Was hard" },
  { value: "clicked", label: "Made it click" },
];

interface Props {
  card: Extract<Card, { type: "confirm" }>;
  busy: boolean;
  onSave: (p: Proposal) => void;
  onCancel: () => void;
  onUndo: () => void;
}

export function ConfirmCard({ card, busy, onSave, onCancel, onUndo }: Props) {
  const { c } = useTheme();
  const [draft, setDraft] = useState<Proposal>(card.proposal);
  const open = card.state === "open";
  const p = open ? draft : card.proposal;
  const single = p.updates.length === 1 ? p.updates[0]!.topicId : null;
  const struck = card.state === "cancelled" || card.state === "undone";

  const setOutcome = (i: number, outcome: Outcome) => setDraft({ ...draft, updates: draft.updates.map((u, j) => (j === i ? { ...u, outcome } : u)) });
  const setNote = (i: number, patch: Partial<Proposal["experiences"][number]>) =>
    setDraft({ ...draft, experiences: draft.experiences.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <View style={[styles.card, open ? { borderColor: c.control, backgroundColor: c.surface } : { borderColor: c.border, backgroundColor: c.raised }]}>
      <View style={[styles.changes, struck && { opacity: 0.55 }]}>
        {p.updates.map((u, i) => {
          const o = OUTCOMES.find((x) => x.value === u.outcome)!;
          return (
            <View key={u.topicId} style={{ gap: 8 }}>
              <T weight={600} style={struck && styles.strike}>
                {topicById.get(u.topicId)?.name}
              </T>
              {open ? (
                <Segmented stretch value={u.outcome} onChange={(v) => setOutcome(i, v)} options={OUTCOMES.map((x) => ({ value: x.value, label: x.label, mark: <StatusMark status={x.status} size={8} /> }))} />
              ) : (
                <View style={styles.inline}>
                  <StatusMark status={o.status} size={8} />
                  <T tone="muted">{o.label}</T>
                </View>
              )}
            </View>
          );
        })}
        {p.experiences.map((e, i) =>
          open ? (
            <View key={i} style={{ gap: 8 }}>
              <Segmented value={e.kind} onChange={(kind) => setNote(i, { kind })} options={KINDS} />
              <TextInput
                multiline
                value={e.text}
                onChangeText={(text) => setNote(i, { text, line: tidy(text) })}
                accessibilityLabel="Your words"
                placeholder="How it went, in your words"
                placeholderTextColor={c.faint}
                style={[styles.note, { borderColor: c.control, color: c.text, fontFamily: font[400] }]}
              />
            </View>
          ) : (
            <T key={i} style={struck && styles.strike}>
              <T weight={600} tone="muted">
                {KINDS.find((k) => k.value === e.kind)!.label}
              </T>{" "}
              “{e.text}”
            </T>
          ),
        )}
        {open && single && p.experiences.length === 0 && (
          <Button kind="ghost" size="small" icon="edit" label="Add how it went" style={{ alignSelf: "flex-start" }} onPress={() => setDraft({ ...draft, experiences: [{ topicId: single, kind: "hard", text: "", line: "" }] })} />
        )}
      </View>

      {open && (
        <View style={{ gap: 6 }}>
          <View style={styles.inline}>
            <Button kind="primary" icon="check" label="Save" haptic="light" disabled={busy} onPress={() => onSave(draft)} style={{ flex: 1 }} />
            <Button kind="ghost" label="Cancel" disabled={busy} onPress={onCancel} />
          </View>
          <T size="small" tone="muted">
            Nothing is saved until you press Save.
          </T>
        </View>
      )}
      {card.state === "saved" && (
        <View style={styles.inline}>
          <StatusMark status="done" size={8} />
          <T tone="doneInk" weight={500} style={{ flex: 1 }}>
            Saved
          </T>
          <Button kind="ghost" size="small" label="Undo" haptic="light" disabled={busy} onPress={onUndo} />
        </View>
      )}
      {card.state === "cancelled" && <T tone="muted">Not saved</T>}
      {card.state === "undone" && <T tone="muted">Undone. Nothing from this was kept.</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 12 },
  changes: { gap: 12 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  strike: { textDecorationLine: "line-through" },
  note: { minHeight: 64, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: "top" },
});
