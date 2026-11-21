// The map on a phone (docs/mobile.md §3, owner's choice): the same route as the web's map,
// in the order to learn it (the web's RouteList.tsx, "On a phone this is the map").
// Big topics open into their subtopics when the student reaches them (`open`, worked out by
// shared/graph.ts `revealed`); a tap on any row opens its topic sheet.

import { bigTopicsOf, kids, topicById } from "@shared/data";
import { needsOf, progressOf, sortByRoute, statusOf, type GoalSummary } from "@shared/graph";
import type { Status, Topic } from "@shared/types";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/theme";
import { StatusMark, StatusPill } from "@/ui/Status";
import { Rule, Row } from "@/ui/Row";
import { Tag } from "@/ui/Tag";
import { T } from "@/ui/Text";

interface Props {
  summary: GoalSummary;
  statuses: Map<string, Status>;
  open: Set<string>;
  nextId: string | null;
  onOpen: (id: string) => void;
}

export function RouteList({ summary, statuses, open, nextId, onOpen }: Props) {
  const route = new Set(summary.route.map((t) => t.id));
  const areas = new Set(summary.areas.map((t) => t.id));
  const subjectId = summary.areas[0]?.subjectId ?? "react-native";
  const elsewhere = sortByRoute(bigTopicsOf(subjectId).filter((t) => !areas.has(t.id)));
  const props = { statuses, open, route, nextId, onOpen };

  return (
    <View style={styles.list}>
      <Group title="Your route" count={summary.areas.length} note="Big topics for this goal, foundations first. Each opens when you reach it.">
        {summary.areas.map((a) => (
          <Area key={a.id} area={a} {...props} />
        ))}
      </Group>
      {elsewhere.length > 0 && (
        <Group title="Not needed for this goal" count={elsewhere.length} note="Not unimportant: just not needed for what you chose.">
          {elsewhere.map((a) => (
            <Area key={a.id} area={a} {...props} />
          ))}
        </Group>
      )}
    </View>
  );
}

function Group({ title, count, note, children }: { title: string; count: number; note: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.title}>
        <T size="section" weight={600}>
          {title}
        </T>
        <T size="section" tone="muted" tabular>
          {count}
        </T>
      </View>
      <T size="small" tone="muted" style={styles.note}>
        {note}
      </T>
      {children}
    </View>
  );
}

function Area({ area, statuses, open, route, nextId, onOpen }: { area: Topic } & Omit<Props, "summary"> & { route: Set<string> }) {
  const { c } = useTheme();
  const status = statusOf(statuses, area.id);
  const p = progressOf(area.id, statuses);
  const shown = open.has(area.id);
  const inside = sortByRoute(kids(area.id));

  return (
    <View>
      <Rule />
      <Row
        onPress={() => onOpen(area.id)}
        accessibilityLabel={`${area.name}, big topic, ${p.done} of ${p.total} done`}
        left={<StatusMark status={status} />}
        right={
          <T size="small" tone="muted" tabular>
            {p.done}/{p.total}
          </T>
        }
      >
        <T weight={600} testID="area-name">
          {area.name}
        </T>
        <T size="small" tone="muted" numberOfLines={1}>
          {shown ? area.summary : `${inside.length} topics inside · ${status === "know" ? "you said you know this" : "they appear when you reach this"}`}
        </T>
      </Row>
      {shown && (
        <View style={[styles.inside, { borderLeftColor: c.border }]}>
          {inside.map((t) => {
            const s = statusOf(statuses, t.id);
            const needs = needsOf(t.id).map((id) => topicById.get(id)!.name);
            return (
              <Row
                key={t.id}
                onPress={() => onOpen(t.id)}
                accessibilityLabel={`${t.name}${t.id === nextId ? ", next" : ""}`}
                faded={!route.has(t.id)}
                left={<StatusMark status={s} />}
                right={<StatusPill status={s} />}
              >
                <View style={styles.nameRow}>
                  <T weight={500} style={{ flexShrink: 1 }}>
                    {t.name}
                  </T>
                  {t.id === nextId && <Tag label="Next" strong />}
                  {t.optional && <Tag label="Optional" />}
                </View>
                <T size="small" tone="muted" numberOfLines={1}>
                  {needs.length ? `Needs ${needs.join(", ")}` : "Nothing before it"} · ~{t.minutes} min
                </T>
              </Row>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  group: { paddingTop: 24 },
  title: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 10 },
  note: { marginTop: 4, marginBottom: 10, paddingHorizontal: 10 },
  inside: { marginLeft: 14, borderLeftWidth: 1, paddingLeft: 4, marginBottom: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
});
