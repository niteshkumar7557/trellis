"use client";

import { StatusMark, StatusPill } from "@/components/ui/Status";
import { bigTopicsOf, kids, topicById } from "@shared/data";
import { needsOf, progressOf, sortByRoute, statusOf, type GoalSummary } from "@shared/graph";
import type { Status, Topic } from "@shared/types";
import styles from "./list.module.css";

interface Props {
  summary: GoalSummary;
  statuses: Map<string, Status>;
  /** Big topics whose subtopics are shown. */
  open: Set<string>;
  nextId: string | null;
  selected: string | null;
  onOpen: (id: string) => void;
}

/** The same route as the map, in the order to learn it. On a phone this is the map. */
export function RouteList({ summary, statuses, open, nextId, selected, onOpen }: Props) {
  const route = new Set(summary.route.map((t) => t.id));
  const areas = new Set(summary.areas.map((t) => t.id));
  const elsewhere = sortByRoute(bigTopicsOf(summary.areas[0]?.subjectId ?? "react-native").filter((t) => !areas.has(t.id)));

  return (
    <div className={styles.list}>
      <section className={styles.group}>
        <h2 className={styles.title}>
          Your route
          <span className={`${styles.count} num`}>{summary.areas.length}</span>
        </h2>
        <p className={styles.note}>Big topics for this goal, foundations first. Each opens when you reach it.</p>
        {summary.areas.map((a) => (
          <Area key={a.id} area={a} {...{ statuses, open, route, nextId, selected, onOpen }} />
        ))}
      </section>

      {elsewhere.length > 0 && (
        <section className={styles.group}>
          <h2 className={styles.title}>
            Not needed for this goal
            <span className={`${styles.count} num`}>{elsewhere.length}</span>
          </h2>
          <p className={styles.note}>Not unimportant: just not needed for what you chose.</p>
          {elsewhere.map((a) => (
            <Area key={a.id} area={a} {...{ statuses, open, route, nextId, selected, onOpen }} />
          ))}
        </section>
      )}
    </div>
  );
}

function Area({
  area,
  statuses,
  open,
  route,
  nextId,
  selected,
  onOpen,
}: {
  area: Topic;
  statuses: Map<string, Status>;
  open: Set<string>;
  route: Set<string>;
  nextId: string | null;
  selected: string | null;
  onOpen: (id: string) => void;
}) {
  const status = statusOf(statuses, area.id);
  const p = progressOf(area.id, statuses);
  const shown = open.has(area.id);
  const inside = sortByRoute(kids(area.id));

  return (
    <div className={styles.area}>
      <button type="button" className={styles.areaHead} aria-pressed={selected === area.id} onClick={() => onOpen(area.id)}>
        <StatusMark status={status} />
        <span className={styles.name}>
          <span>{area.name}</span>
          <span className={styles.needs}>
            {shown
              ? area.summary
              : `${inside.length} topics inside · ${status === "know" ? "you said you know this" : "they appear when you reach this"}`}
          </span>
        </span>
        <span className={`${styles.time} num`}>
          {p.done}/{p.total}
        </span>
      </button>
      {shown && (
        <ol className={styles.rows}>
          {inside.map((t) => {
            const s = statusOf(statuses, t.id);
            const needs = needsOf(t.id).map((id) => topicById.get(id)!);
            return (
              <li key={t.id} data-skip={!route.has(t.id) || undefined}>
                <button type="button" aria-pressed={selected === t.id} onClick={() => onOpen(t.id)}>
                  <StatusMark status={s} />
                  <span className={styles.name}>
                    <span>
                      {t.name}
                      {t.id === nextId && <span className={styles.next}>Next</span>}
                      {t.optional && <span className={styles.optional}>Optional</span>}
                    </span>
                    <span className={styles.needs}>
                      {needs.length ? `Needs ${needs.map((n) => n.name).join(", ")}` : "Nothing before it"}
                    </span>
                  </span>
                  <StatusPill status={s} />
                  <span className={`${styles.time} num`}>~{t.minutes} min</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
