"use client";

// The goal, as distinct from the subject.
//
// The subject is *what* you're learning (React Native); the goal is *how far* you want to
// go in it ("Ship a real app" or "The whole roadmap"). The map shows the whole subject
// either way. The goal decides which topics are on your route, so changing it changes
// Next, the done / to learn / can skip counts and which topics say "Can skip". Your
// check-ins, notes and sort belong to topics, not goals, so they stay.
//
// Students couldn't tell this from a bare "Goal: …" select, so each option now says what
// picking it would change, and after a change a note says what did change, with Undo.

import { useMemo } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { goalById, goalsOf } from "@shared/data";
import { summarise } from "@shared/graph";
import type { Goal, Status, SubjectId } from "@shared/types";
import styles from "./map.module.css";

/** What moving from one goal to another does to the route, in subtopics. */
export interface GoalChange {
  from: string;
  to: string;
  total: number;
  added: number;
  removed: number;
}

export function compareGoals(from: Goal, to: Goal, statuses: Map<string, Status>): GoalChange {
  const before = new Set(summarise(from, statuses).route.map((t) => t.id));
  const after = summarise(to, statuses).route;
  const afterIds = new Set(after.map((t) => t.id));
  return {
    from: from.id,
    to: to.id,
    total: after.length,
    added: after.filter((t) => !before.has(t.id)).length,
    removed: [...before].filter((id) => !afterIds.has(id)).length,
  };
}

/** "+6 topics, 2 drop off": the difference in words, or null when there is none. */
function difference(c: GoalChange): string | null {
  const parts = [];
  if (c.added) parts.push(`+${c.added} ${c.added === 1 ? "topic" : "topics"}`);
  if (c.removed) parts.push(`${c.removed} ${c.removed === 1 ? "drops" : "drop"} off`);
  return parts.length ? parts.join(", ") : null;
}

export function GoalPicker({
  subjectId,
  goal,
  statuses,
  onChange,
}: {
  subjectId: SubjectId;
  goal: Goal;
  statuses: Map<string, Status>;
  onChange: (change: GoalChange) => void;
}) {
  const options = useMemo(
    () =>
      goalsOf(subjectId).map((g) => {
        const sum = summarise(g, statuses);
        const size = `${sum.route.length} topics, ${sum.done} done`;
        const diff = g.id === goal.id ? null : difference(compareGoals(goal, g, statuses));
        return {
          value: g.id,
          label: g.name,
          detail: (
            <>
              {g.blurb}
              <br />
              <span className="num">
                {g.id === goal.id ? `Your goal now · ${size}` : `${size}${diff ? ` · ${diff} vs now` : ""}`}
              </span>
            </>
          ),
        };
      }),
    [subjectId, goal, statuses],
  );

  return (
    <div className={styles.goalField}>
      <span className={styles.eyebrow} aria-hidden="true">
        Goal
      </span>
      <Dropdown
        label="Goal"
        value={goal.id}
        options={options}
        menuWidth={360}
        onChange={(id) => onChange(compareGoals(goal, goalById.get(id)!, statuses))}
        footer={
          <>
            The goal picks which topics are on your route: it changes Next, the counts and what you can skip. Your
            check-ins, notes and sort stay as they are.
          </>
        }
      />
    </div>
  );
}

/** After a goal change: what changed, and a way back. */
export function GoalChangeNote({ change, onUndo, onDismiss }: { change: GoalChange; onUndo: () => void; onDismiss: () => void }) {
  const diff = difference(change);
  return (
    <p className={styles.goalNote} role="status">
      <span>
        Goal changed to <strong>{goalById.get(change.to)?.name}</strong>. Your route is now{" "}
        <span className="num">{change.total}</span> topics{diff ? <span className="num"> ({diff})</span> : null}. Check-ins
        and notes are kept.
      </span>
      <span className={styles.goalNoteActions}>
        <button type="button" onClick={onUndo}>
          Undo
        </button>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </span>
    </p>
  );
}
