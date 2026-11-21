// Pieces of the topic sheet shared by the subtopic and big-topic views (the web's Rail.tsx).

import { topicById } from "@shared/data";
import { STATUS_LABEL, statusOf, type Importance } from "@shared/graph";
import type { Status } from "@shared/types";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/theme";
import { Rule, Row } from "@/ui/Row";
import { StatusMark } from "@/ui/Status";
import { Tag } from "@/ui/Tag";
import { T } from "@/ui/Text";

export function Section({ title, count, children, tone }: { title: string; count?: number; children: ReactNode; tone?: "stuck" }) {
  const { c } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: c.rule }, tone === "stuck" && { backgroundColor: c.stuckBg }]}>
      <View style={styles.title}>
        <T weight={600} tone={tone === "stuck" ? "stuckInk" : "text"}>
          {title}
        </T>
        {count !== undefined && (
          <T tone="muted" tabular>
            {count}
          </T>
        )}
      </View>
      {children}
    </View>
  );
}

/** "Don't skip" / "Can skip" and the reason, on every topic (design.md §14). */
export function Verdict({ importance }: { importance: Importance }) {
  return (
    <View style={styles.verdict}>
      <Tag label={importance.verdict === "keep" ? "Don't skip" : "Can skip"} strong={importance.verdict === "keep"} />
      <T style={{ flex: 1 }}>{importance.reason}</T>
    </View>
  );
}

export function TopicRows({ ids, statuses, onOpen, empty }: { ids: string[]; statuses: Map<string, Status>; onOpen: (id: string) => void; empty?: string }) {
  if (!ids.length) return empty ? <T tone="muted">{empty}</T> : null;
  return (
    <View>
      {ids.map((id, i) => {
        const t = topicById.get(id)!;
        const s = statusOf(statuses, id);
        const parent = t.parentId ? topicById.get(t.parentId) : null;
        return (
          <View key={id}>
            {i > 0 && <Rule />}
            <Row
              onPress={() => onOpen(id)}
              accessibilityLabel={`${t.name}, ${STATUS_LABEL[s]}`}
              left={<StatusMark status={s} />}
              right={
                <T size="small" tone="muted">
                  {STATUS_LABEL[s]}
                </T>
              }
            >
              <T weight={500}>{t.name}</T>
              {parent && (
                <T size="small" tone="faint">
                  {parent.name}
                </T>
              )}
            </Row>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 18, gap: 12 },
  title: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  verdict: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
});
