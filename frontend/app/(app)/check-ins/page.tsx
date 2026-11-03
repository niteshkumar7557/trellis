"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/Status";
import ui from "@/components/ui/ui.module.css";
import { TopicOptions } from "@/components/map/TopicOptions";
import { subjectById, subjects, topicById } from "@shared/data";
import { TODAY } from "@shared/data/student";
import { relativeDay } from "@shared/graph";
import { useStore } from "@/lib/store";
import { tidy } from "@shared/parse";
import type { CheckIn, Experience, Outcome, SubjectId } from "@shared/types";
import styles from "./checkins.module.css";

const OUTCOME_STATUS = { got: "done", partly: "learning", stuck: "stuck" } as const;

export default function CheckInsPage() {
  const { checkIns, experiences, dispatch } = useStore();

  /** What the student said about a check-in: from the same chat message, or the same topic just after. */
  const notesFor = (c: CheckIn) =>
    experiences.filter(
      (e) =>
        (c.messageId && e.messageId === c.messageId) ||
        (!c.messageId && e.topicId === c.topicId && e.at >= c.at.slice(0, 16) && Date.parse(e.at) - Date.parse(c.at) < 10 * 60_000),
    );
  const [filter, setFilter] = useState<SubjectId | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      [...checkIns]
        .filter((c) => filter === "all" || topicById.get(c.topicId)?.subjectId === filter)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [checkIns, filter],
  );

  const days = useMemo(() => {
    const out: { day: string; items: CheckIn[] }[] = [];
    for (const c of shown) {
      const day = c.at.slice(0, 10);
      const last = out.at(-1);
      if (last?.day === day) last.items.push(c);
      else out.push({ day, items: [c] });
    }
    return out;
  }, [shown]);

  const stuckCount = shown.filter((c) => c.outcome === "stuck").length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Check-ins</h1>
          <p className={styles.sub}>
            Every update to your map, and what you said about how it went, newest first. Your map and your prompts are
            worked out from these, so changing one here changes them.
          </p>
        </div>
        <div className={ui.segmented} role="tablist" aria-label="Subject">
          <button type="button" role="tab" className={ui.segment} aria-selected={filter === "all"} onClick={() => setFilter("all")}>
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              className={ui.segment}
              aria-selected={filter === s.id}
              onClick={() => setFilter(s.id)}
            >
              {s.shortName}
            </button>
          ))}
        </div>
      </header>

      <p className={`${styles.total} num`}>
        {shown.length} {shown.length === 1 ? "check-in" : "check-ins"} · {stuckCount} where you got stuck
      </p>

      {days.length === 0 && (
        <p className={styles.empty}>No check-ins yet. Tell the helper on the map what you studied.</p>
      )}

      {days.map(({ day, items }) => (
        <section key={day} className={styles.day}>
          <h2 className={styles.dayTitle}>
            {relativeDay(day, TODAY)}
            <span>{new Date(day + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          </h2>
          <ul className={styles.rows}>
            {items.map((c) =>
              editing === c.id ? (
                <Editor
                  key={c.id}
                  checkIn={c}
                  onCancel={() => setEditing(null)}
                  onSave={(next) => {
                    dispatch({ type: "edit", checkIn: next });
                    setEditing(null);
                  }}
                />
              ) : (
                <li key={c.id} className={styles.row}>
                  <span className={`${styles.time} num`}>
                    {new Date(c.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={styles.body}>
                    <span className={styles.text}>“{c.text}”</span>
                    <span className={styles.filed}>
                      {topicById.get(c.topicId)?.name} · {topicById.get(topicById.get(c.topicId)?.parentId ?? "")?.name ?? subjectById.get(topicById.get(c.topicId)!.subjectId)?.shortName}
                    </span>
                    {notesFor(c).map((e) => (
                      <NoteRow key={e.id} experience={e} onSave={(x) => dispatch({ type: "editExperience", experience: x })} onDelete={() => dispatch({ type: "removeExperience", id: e.id })} />
                    ))}
                  </span>
                  <StatusPill status={OUTCOME_STATUS[c.outcome]} />
                  <span className={styles.actions}>
                    <button type="button" className={ui.iconBtn} aria-label="Edit this check-in" onClick={() => setEditing(c.id)}>
                      <Icon name="edit" />
                    </button>
                    <button
                      type="button"
                      className={ui.iconBtn}
                      aria-label="Delete this check-in"
                      onClick={() => {
                        if (confirm(`Delete “${c.text}”? Your map will be worked out again without it.`)) {
                          dispatch({ type: "remove", id: c.id });
                        }
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Editor({ checkIn, onSave, onCancel }: { checkIn: CheckIn; onSave: (c: CheckIn) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(checkIn);
  return (
    <li className={styles.editor}>
      <label className={styles.editField}>
        <span>What you wrote</span>
        <input value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      </label>
      <div className={styles.editRow}>
        <label className={styles.editField}>
          <span>Topic</span>
          <select value={draft.topicId} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })}>
            <TopicOptions first={topicById.get(draft.topicId)?.subjectId ?? "react-native"} />
          </select>
        </label>
        <div className={styles.editField}>
          <span id={`o-${checkIn.id}`}>How it went</span>
          <div className={ui.segmented} role="group" aria-labelledby={`o-${checkIn.id}`}>
            {(["got", "partly", "stuck"] as Outcome[]).map((o) => (
              <button
                key={o}
                type="button"
                className={ui.segment}
                aria-pressed={draft.outcome === o}
                onClick={() => setDraft({ ...draft, outcome: o })}
              >
                {o === "got" ? "Got it" : o === "partly" ? "Partly" : "Stuck"}
              </button>
            ))}
          </div>
        </div>
        <span className={styles.editActions}>
          <button type="button" className={ui.ghost} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={ui.primary} onClick={() => onSave(draft)}>
            Save
          </button>
        </span>
      </div>
    </li>
  );
}

const KIND_LABEL = { easy: "Felt easy", hard: "Was hard", clicked: "Made it click" } as const;

/** One thing the student said about how it went. Theirs to change or delete. */
function NoteRow({ experience, onSave, onDelete }: { experience: Experience; onSave: (e: Experience) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(experience.text);
  if (editing) {
    return (
      <span className={styles.follow}>
        {KIND_LABEL[experience.kind]}{" "}
        <input
          className={styles.noteInput}
          value={text}
          autoFocus
          aria-label="Your words"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onSave({ ...experience, text: text.trim(), line: tidy(text) });
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        />
      </span>
    );
  }
  return (
    <span className={styles.follow}>
      {KIND_LABEL[experience.kind]} <span>“{experience.text}”</span>{" "}
      <button type="button" className={styles.noteBtn} onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        type="button"
        className={styles.noteBtn}
        onClick={() => {
          if (confirm(`Delete “${experience.text}”? It won't be used in your prompts any more.`)) onDelete();
        }}
      >
        Delete
      </button>
    </span>
  );
}
