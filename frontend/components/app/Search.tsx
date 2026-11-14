"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusMark, StatusPill } from "@/components/ui/Status";
import ui from "@/components/ui/ui.module.css";
import {
  goalById,
  kids,
  subjectById,
  subjects,
  topicById,
  topics,
} from "@shared/data";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import {
  importanceOf,
  nextTopic,
  requiredFor,
  statusOf,
  suspectsFor,
  summarise,
} from "@shared/graph";
import { useStore } from "@/lib/store";
import type { Status, SubjectId, Topic } from "@shared/types";
import styles from "./search.module.css";

// ⌘K anywhere in the app: one search over pages, subjects, topics and the student's own
// notes, shown as a full-page pop-up with the results in groups and a preview.

type Group = "jump" | "recent" | "topic" | "big" | "note" | "ask";

interface Result {
  key: string;
  group: Group;
  label: string;
  /** Shown after the label, quieter. */
  meta?: string;
  icon?: IconName;
  status?: Status;
  topic?: Topic;
  /** Words of a note that matched. */
  quote?: string;
  run: () => void;
}

const GROUPS: { id: Group; title: string }[] = [
  { id: "jump", title: "Jump to" },
  { id: "recent", title: "Recent" },
  { id: "topic", title: "Topics" },
  { id: "big", title: "Big topics" },
  { id: "note", title: "Your notes" },
  { id: "ask", title: "Ask the helper" },
];
const LIMIT: Record<Group, number> = {
  jump: 8,
  recent: 5,
  topic: 8,
  big: 5,
  note: 4,
  ask: 1,
};

/** How well a name fits the query: starts with it, a word starts with it, or contains it. */
function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/[\s/(),.-]+/).some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  return 0;
}

function topicScore(t: Topic, q: string): number {
  return Math.max(
    score(t.name, q),
    ...t.keywords.map((k) => score(k, q) * 0.7),
  );
}

/** The navbar's search: looks like a field, opens the pop-up. */
export function Search() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Icon name="search" />
        <span>Search topics, notes and pages</span>
        <span className={ui.kbd} aria-hidden="true">
          ⌘K
        </span>
      </button>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const store = useStore();
  const { statuses, experiences, checkIns, goalIds, subjectId, dispatch } =
    store;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Group | "all">("all");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const before = useRef<Element | null>(null);

  // Remember what had focus, and give it back on close.
  useEffect(() => {
    before.current = document.activeElement;
    input.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      (before.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-backdrop]", {
        opacity: 0,
        duration: 0.18,
        ease: "power1.out",
      });
      gsap.from("[data-panel]", {
        y: -12,
        opacity: 0,
        scale: 0.985,
        duration: 0.28,
        ease: "power3.out",
      });
    },
    { scope: root },
  );

  const openTopic = useCallback(
    (t: Topic) => {
      if (t.subjectId !== subjectId)
        dispatch({ type: "subject", subjectId: t.subjectId });
      dispatch({ type: "select", topicId: t.id });
      router.push(goalIds[t.subjectId] ? "/map" : "/start");
      onClose();
    },
    [subjectId, goalIds, dispatch, router, onClose],
  );

  const go = useCallback(
    (href: string, subject?: SubjectId) => {
      if (subject) dispatch({ type: "subject", subjectId: subject });
      router.push(href);
      onClose();
    },
    [dispatch, router, onClose],
  );

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Result[] = [];

    // ------------------------------------------------------------ jump to
    const jumps: Result[] = [];
    for (const s of subjects) {
      const goal = goalIds[s.id] ? goalById.get(goalIds[s.id]!) : null;
      if (!goal) continue;
      const next = nextTopic(goal, statuses);
      const stuck = summarise(goal, statuses).route.find(
        (t) => statusOf(statuses, t.id) === "stuck",
      );
      if (stuck) {
        const why = suspectsFor(stuck.id, statuses, checkIns, experiences)[0];
        jumps.push({
          key: `stuck-${s.id}`,
          group: "jump",
          label: `Stuck: ${stuck.name}`,
          meta: why ? `may be ${why.topic.name} underneath` : s.shortName,
          status: "stuck",
          topic: stuck,
          run: () => openTopic(stuck),
        });
      }
      if (next) {
        jumps.push({
          key: `next-${s.id}`,
          group: "jump",
          label: `Next: ${next.name}`,
          meta: s.shortName,
          status: statusOf(statuses, next.id),
          topic: next,
          run: () => openTopic(next),
        });
      }
    }
    const pages: Result[] = [
      {
        key: "p-map",
        group: "jump",
        label: "Map",
        meta: "Page",
        icon: "map",
        run: () => go("/map"),
      },
      {
        key: "p-checkins",
        group: "jump",
        label: "Check-ins",
        meta: "Page · everything you've told Trellis",
        icon: "journal",
        run: () => go("/check-ins"),
      },
      {
        key: "p-settings",
        group: "jump",
        label: "Settings",
        meta: "Page · theme, export, delete",
        icon: "settings",
        run: () => go("/settings"),
      },
      ...subjects.map<Result>((s) => ({
        key: `s-${s.id}`,
        group: "jump",
        label: s.name,
        meta: goalIds[s.id]
          ? "Subject · open its map"
          : "Subject · pick a goal",
        icon: "forward",
        run: () => go(goalIds[s.id] ? "/map" : "/start", s.id),
      })),
    ];
    if (!q) {
      out.push(...jumps, ...pages);
      // What the student touched last, newest first.
      const recent = [
        ...new Set(
          [...checkIns]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((c) => c.topicId),
        ),
      ];
      for (const id of recent) {
        const t = topicById.get(id);
        if (!t || out.some((r) => r.topic?.id === id)) continue;
        out.push({
          key: `r-${id}`,
          group: "recent",
          label: t.name,
          meta: `${subjectById.get(t.subjectId)!.shortName} · ${topicById.get(t.parentId ?? "")?.name ?? ""}`,
          status: statusOf(statuses, id),
          topic: t,
          run: () => openTopic(t),
        });
      }
    } else
      out.push(
        ...[...jumps, ...pages].filter(
          (r) => score(r.label, q) || score(r.meta ?? "", q) > 50,
        ),
      );

    if (q) {
      // ------------------------------------------------------------ topics
      const ranked = topics
        .map((t) => ({ t, s: topicScore(t, q) }))
        .filter((x) => x.s > 0)
        // The subject you're in comes first; inside a subject, the best match first.
        .sort(
          (a, b) =>
            Number(b.t.subjectId === subjectId) -
              Number(a.t.subjectId === subjectId) ||
            b.s - a.s ||
            a.t.name.localeCompare(b.t.name),
        );
      for (const { t } of ranked) {
        const parent = t.parentId ? topicById.get(t.parentId)! : null;
        out.push({
          key: t.id,
          group: parent ? "topic" : "big",
          label: t.name,
          meta: parent ? parent.name : `${kids(t.id).length} inside`,
          status: statusOf(statuses, t.id),
          topic: t,
          run: () => openTopic(t),
        });
      }

      // ------------------------------------------------------------ the student's own words
      for (const e of [...experiences].sort((a, b) =>
        b.at.localeCompare(a.at),
      )) {
        if (!e.text.toLowerCase().includes(q)) continue;
        const t = topicById.get(e.topicId);
        if (!t) continue;
        out.push({
          key: `n-${e.id}`,
          group: "note",
          label: t.name,
          meta: {
            easy: "felt easy",
            hard: "was hard",
            clicked: "made it click",
          }[e.kind],
          quote: e.text,
          topic: t,
          status: statusOf(statuses, t.id),
          run: () => openTopic(t),
        });
      }
      for (const c of [...checkIns].sort((a, b) => b.at.localeCompare(a.at))) {
        if (!c.text.toLowerCase().includes(q)) continue;
        const t = topicById.get(c.topicId);
        if (!t || out.some((r) => r.group === "note" && r.quote === c.text))
          continue;
        out.push({
          key: `c-${c.id}`,
          group: "note",
          label: t.name,
          meta: "check-in",
          quote: c.text,
          topic: t,
          status: statusOf(statuses, t.id),
          run: () => openTopic(t),
        });
      }

      // ------------------------------------------------------------ hand it to the helper
      out.push({
        key: "ask",
        group: "ask",
        label: `Ask the helper: “${query.trim()}”`,
        meta: subjectById.get(subjectId)!.shortName,
        icon: "journal",
        run: () => {
          dispatch({ type: "ask", text: query.trim() });
          router.push("/map");
          onClose();
        },
      });
    }

    // Cap each group so one doesn't crowd out the rest.
    const seen: Partial<Record<Group, number>> = {};
    return out.filter(
      (r) => (seen[r.group] = (seen[r.group] ?? 0) + 1) <= LIMIT[r.group],
    );
  }, [
    query,
    statuses,
    experiences,
    checkIns,
    goalIds,
    subjectId,
    openTopic,
    go,
    dispatch,
    router,
    onClose,
  ]);

  const counts = useMemo(() => {
    const c: Partial<Record<Group, number>> = {};
    for (const r of results) c[r.group] = (c[r.group] ?? 0) + 1;
    return c;
  }, [results]);

  const shown =
    filter === "all"
      ? results
      : results.filter((r) => r.group === filter || r.group === "ask");
  const active = shown[Math.min(cursor, shown.length - 1)];

  // Keep the highlighted row in view.
  useEffect(() => {
    list.current
      ?.querySelector(`[data-key="${active?.key}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active?.key]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      active?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Tab moves between the filter chips; the list keeps the keyboard otherwise.
      e.preventDefault();
      const order: (Group | "all")[] = [
        "all",
        ...GROUPS.map((g) => g.id).filter((g) => g !== "ask" && counts[g]),
      ];
      const i = order.indexOf(filter);
      setFilter(
        order[(i + (e.shiftKey ? order.length - 1 : 1)) % order.length],
      );
      setCursor(0);
    }
  };

  const chips: (Group | "all")[] = [
    "all",
    ...GROUPS.map((g) => g.id).filter(
      (g) => g !== "ask" && (counts[g] ?? 0) > 0,
    ),
  ];

  return createPortal(
    <div ref={root} className={styles.overlay} role="presentation">
      <div className={styles.backdrop} data-backdrop onClick={onClose} />
      <div
        className={styles.panel}
        data-panel
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div className={styles.field}>
          <Icon name="search" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              active ? `${listId}-${active.key}` : undefined
            }
            aria-label="Search"
            placeholder="Search topics, your notes, pages…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKey}
          />
          <button
            type="button"
            className={ui.kbd}
            onClick={onClose}
            aria-label="Close search"
          >
            Esc
          </button>
        </div>

        <div className={styles.chips} role="tablist" aria-label="Show">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={filter === c}
              className={styles.chip}
              onClick={() => {
                setFilter(c);
                setCursor(0);
                input.current?.focus();
              }}
            >
              {c === "all" ? "All" : GROUPS.find((g) => g.id === c)!.title}
              <span className="num">
                {c === "all"
                  ? results.filter((r) => r.group !== "ask").length
                  : counts[c]}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.body}>
          <div
            ref={list}
            id={listId}
            role="listbox"
            className={styles.list}
            aria-label="Results"
          >
            {GROUPS.map((g) => {
              const rows = shown.filter((r) => r.group === g.id);
              if (!rows.length) return null;
              return (
                <section
                  key={g.id}
                  className={styles.group}
                  aria-label={g.title}
                >
                  {g.id !== "ask" && (
                    <h3 className={styles.groupTitle}>
                      {query.trim() || g.id !== "jump" ? g.title : "Start here"}
                    </h3>
                  )}
                  {rows.map((r, j) => {
                    const i = shown.indexOf(r);
                    const sub =
                      (g.id === "topic" || g.id === "big") &&
                      r.topic &&
                      r.topic.subjectId !== rows[j - 1]?.topic?.subjectId;
                    return (
                      <div key={r.key} className={styles.rowWrap}>
                        {sub && (
                          <p className={styles.subhead}>
                            {subjectById.get(r.topic!.subjectId)!.name}
                          </p>
                        )}
                        <div
                          id={`${listId}-${r.key}`}
                          data-key={r.key}
                          role="option"
                          aria-selected={r === active}
                          className={styles.row}
                          data-group={r.group}
                          onMouseMove={() => setCursor(i)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            r.run();
                          }}
                        >
                          <span className={styles.rowIcon}>
                            {r.status ? (
                              <StatusMark status={r.status} />
                            ) : r.icon ? (
                              <Icon name={r.icon} size={14} />
                            ) : null}
                          </span>
                          <span className={styles.rowText}>
                            <span className={styles.rowLabel}>
                              <Highlight text={r.label} q={query.trim()} />
                            </span>
                            {r.quote && (
                              <span className={styles.rowQuote}>
                                “<Highlight text={r.quote} q={query.trim()} />”
                              </span>
                            )}
                          </span>
                          {r.meta && (
                            <span className={styles.rowMeta}>{r.meta}</span>
                          )}
                          {r === active && (
                            <Icon
                              name="enter"
                              size={14}
                              className={styles.rowEnter}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
            {query.trim() &&
              shown.filter((r) => r.group !== "ask").length === 0 && (
                <p className={styles.none}>
                  Nothing on your maps matches “{query.trim()}”. The helper
                  might know what you mean.
                </p>
              )}
          </div>

          <aside className={styles.preview} aria-label="Preview">
            {active?.topic ? <Preview topic={active.topic} /> : <Hint />}
          </aside>
        </div>

        <footer className={styles.foot}>
          <span>
            <kbd className={ui.kbd}>↑</kbd>
            <kbd className={ui.kbd}>↓</kbd> move
          </span>
          <span>
            <kbd className={ui.kbd}>↵</kbd> open
          </span>
          <span>
            <kbd className={ui.kbd}>Tab</kbd> next group
          </span>
          <span>
            <kbd className={ui.kbd}>Esc</kbd> close
          </span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Highlight({ text, q }: { text: string; q: string }): ReactNode {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** What the highlighted topic is, where it sits, and whether to skip it. */
function Preview({ topic }: { topic: Topic }) {
  const { statuses, goalIds } = useStore();
  const goal = goalIds[topic.subjectId]
    ? goalById.get(goalIds[topic.subjectId]!)
    : null;
  const imp = goal ? importanceOf(topic.id, goal, requiredFor(goal)) : null;
  const parent = topic.parentId ? topicById.get(topic.parentId) : null;
  const inside = parent ? [] : kids(topic.id);
  return (
    <div className={styles.previewBody}>
      <p className={styles.previewWhere}>
        {subjectById.get(topic.subjectId)!.name}
        {parent ? ` · ${parent.name}` : " · big topic"}
      </p>
      <h3 className={styles.previewTitle}>{topic.name}</h3>
      <div className={styles.previewPills}>
        <StatusPill status={statusOf(statuses, topic.id)} />
        {topic.optional && <span className={styles.previewTag}>Optional</span>}
        <span className={`${styles.previewTag} num`}>
          ~
          {topic.minutes >= 90
            ? `${Math.round(topic.minutes / 60)} h`
            : `${topic.minutes} min`}
        </span>
      </div>
      <p className={styles.previewSummary}>{topic.summary}</p>
      {imp && (
        <p className={styles.previewVerdict} data-verdict={imp.verdict}>
          {/^(Don't skip|You can skip)/.test(imp.reason) ? null : (
            <strong>
              {imp.verdict === "keep" ? "Don't skip." : "Can skip."}
            </strong>
          )}
          {imp.reason}
        </p>
      )}
      {!goal && (
        <p className={styles.previewVerdict}>
          Pick a goal for {subjectById.get(topic.subjectId)!.shortName} to see
          if you can skip it.
        </p>
      )}
      {inside.length > 0 && (
        <p className={styles.previewInside}>
          <span className="num">{inside.length}</span> topics inside
        </p>
      )}
    </div>
  );
}

function Hint() {
  return (
    <div className={styles.previewBody}>
      <p className={styles.previewWhere}>Search</p>
      <p className={styles.previewSummary}>
        Type a topic, a word from something you told the helper, or a page.
        Anything else can go to the helper as a question.
      </p>
    </div>
  );
}
