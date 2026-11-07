"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "@/components/map/Chat";
import { layoutFor } from "@/components/map/layout";
import { MapCanvas } from "@/components/map/MapCanvas";
import { BigPanel, TopicPanel } from "@/components/map/Rail";
import { RouteList } from "@/components/map/RouteList";
import { useHelper } from "@/components/map/useHelper";
import styles from "@/components/map/map.module.css";
import { Icon } from "@/components/ui/Icon";
import { StatusMark } from "@/components/ui/Status";
import ui from "@/components/ui/ui.module.css";
import { goalsOf, isBig, subjectById, topicById } from "@shared/data";
import { TODAY } from "@shared/data/student";
import {
  daysBetween,
  importanceOf,
  lastCheckIn,
  nextTopic,
  requiredFor,
  revealed,
  statusOf,
  suspectsFor,
  summarise,
} from "@shared/graph";
import { useStore } from "@/lib/store";

export default function MapPage() {
  const { subjectId, goal, statuses, checkIns, experiences, opened, selected, dispatch } = useStore();
  const [view, setView] = useState<"map" | "list">("map");
  const [tracing, setTracing] = useState(false);
  const narrow = useNarrow();
  const helper = useHelper();
  const { asking } = useStore();
  const rail = useRail();

  // A question typed into search goes to the helper.
  useEffect(() => {
    if (!asking) return;
    helper.say(asking);
    rail.expand();
    dispatch({ type: "ask", text: null });
  }, [asking, helper, dispatch, rail]);

  const subject = subjectById.get(subjectId)!;
  const required = useMemo(() => (goal ? requiredFor(goal) : new Set<string>()), [goal]);
  const summary = useMemo(() => (goal ? summarise(goal, statuses) : null), [goal, statuses]);
  const next = useMemo(() => (goal ? nextTopic(goal, statuses) : null), [goal, statuses]);
  const open = useMemo(
    () => revealed(subjectId, statuses, checkIns, next?.id ?? null, opened),
    [subjectId, statuses, checkIns, next, opened],
  );
  const layout = useMemo(() => layoutFor(subjectId, open), [subjectId, open]);
  const stuck = summary?.route.find((t) => statusOf(statuses, t.id) === "stuck") ?? null;
  const suspects = useMemo(() => (stuck ? suspectsFor(stuck.id, statuses) : []), [stuck, statuses]);
  const selectedTopic = selected ? topicById.get(selected) ?? null : null;
  const selectedSuspects = useMemo(
    () =>
      selectedTopic && !isBig(selectedTopic) && statusOf(statuses, selectedTopic.id) === "stuck"
        ? suspectsFor(selectedTopic.id, statuses)
        : [],
    [selectedTopic, statuses],
  );
  // Open on the map, but nothing inside touched yet: shown so the student notices it arrived.
  const fresh = useMemo(
    () =>
      summary?.areas.filter(
        (a) => open.has(a.id) && !checkIns.some((c) => topicById.get(c.topicId)?.parentId === a.id) && statusOf(statuses, a.id) !== "know",
      ) ?? [],
    [summary, open, checkIns, statuses],
  );

  // Selecting a stuck topic shows its trace; so does hovering the Stuck card.
  const traceFor = selectedSuspects.length ? selectedSuspects[0].path : suspects[0]?.path ?? null;
  const traceOn = tracing || selectedSuspects.length > 0;

  const openTopic = (id: string) => {
    const t = topicById.get(id)!;
    if (t.subjectId !== subjectId) dispatch({ type: "subject", subjectId: t.subjectId });
    dispatch({ type: "select", topicId: id });
  };

  if (!goal || !summary) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{subject.name}</h1>
          </div>
          <p className={styles.finding}>You haven&apos;t picked a goal for this subject yet.</p>
        </header>
        <div className={styles.body} style={{ gridTemplateColumns: "1fr" }}>
          <div style={{ padding: "var(--pad)" }}>
            <Link href="/start" className={ui.primary}>
              Pick a goal and sort the topics
              <Icon name="forward" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stuckSince = stuck ? lastCheckIn(checkIns, stuck.id, "stuck") : undefined;
  const showMap = view === "map" && !narrow;
  const close = () => dispatch({ type: "select", topicId: null });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{subject.name}</h1>
          <label className={styles.goalSelect}>
            <span className="visually-hidden">Goal</span>
            <select value={goal.id} onChange={(e) => dispatch({ type: "goal", subjectId, goalId: e.target.value })}>
              {goalsOf(subjectId).map((g) => (
                <option key={g.id} value={g.id}>
                  Goal: {g.name}
                </option>
              ))}
            </select>
            <Icon name="chevron" />
          </label>
        </div>

        {/* What the overview used to say, as three buttons: each opens its topic. */}
        <div className={styles.findings}>
          {stuck && stuckSince && (
            <button
              type="button"
              className={styles.finding}
              data-tone="stuck"
              onClick={() => openTopic(stuck.id)}
              onPointerEnter={() => suspects[0] && setTracing(true)}
              onPointerLeave={() => setTracing(false)}
              onFocus={() => suspects[0] && setTracing(true)}
              onBlur={() => setTracing(false)}
            >
              <StatusMark status="stuck" />
              <span>
                <strong>Stuck: {stuck.name}</strong> · <span className="num">{daysBetween(stuckSince.at, TODAY)}</span> days
                {suspects[0] && <> · may be {suspects[0].topic.name}</>}
              </span>
            </button>
          )}
          {next ? (
            <button type="button" className={styles.finding} onClick={() => openTopic(next.id)}>
              <StatusMark status={statusOf(statuses, next.id)} />
              <span>
                <strong>Next: {next.name}</strong> · <span className="num">~{next.minutes}</span> min
              </span>
            </button>
          ) : (
            <span className={styles.finding}>Everything on this route is done or under way.</span>
          )}
          {fresh.slice(0, 1).map((a) => (
            <button key={a.id} type="button" className={styles.finding} data-tone="fresh" onClick={() => openTopic(a.id)}>
              <span className={styles.freshDot} aria-hidden="true" />
              <span>
                New on your map: <strong>{a.name}</strong>
              </span>
            </button>
          ))}
        </div>

        <div className={styles.headerSide}>
          <dl className={styles.figures}>
            <div>
              <dt>done</dt>
              <dd>
                {summary.done}
                <small>/{summary.route.length}</small>
              </dd>
            </div>
            <div>
              <dt>to learn</dt>
              <dd>{summary.left}</dd>
            </div>
            <div>
              <dt>you can skip</dt>
              <dd>{summary.skippable.length}</dd>
            </div>
          </dl>
          {!narrow && (
            <div className={ui.segmented} role="tablist" aria-label="View">
              <button type="button" role="tab" className={ui.segment} aria-selected={view === "map"} onClick={() => setView("map")}>
                <Icon name="map" size={14} />
                Map
              </button>
              <button type="button" role="tab" className={ui.segment} aria-selected={view === "list"} onClick={() => setView("list")}>
                <Icon name="list" size={14} />
                List
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.body} style={{ "--rail-w": rail.collapsed ? `${RAIL_STRIP}px` : `${rail.width}px` } as React.CSSProperties}>
        <div className={styles.work}>
          {showMap ? (
            <MapCanvas
              layout={layout}
              statuses={statuses}
              required={required}
              targets={new Set(goal.targets)}
              nextId={next?.id ?? null}
              selected={selected}
              trace={traceFor}
              traceOn={traceOn}
              focusId={stuck?.id ?? next?.id ?? null}
              rightInset={selectedTopic ? 444 : 0}
              onSelect={openTopic}
            />
          ) : (
            <RouteList
              summary={summary}
              statuses={statuses}
              open={open}
              nextId={next?.id ?? null}
              selected={selected}
              onOpen={openTopic}
            />
          )}

          {/* Topic details open as a sheet over the map, so the helper stays put. */}
          {selectedTopic && <Sheet onClose={close} label={selectedTopic.name}>
            {isBig(selectedTopic) ? (
              <BigPanel
                topic={selectedTopic}
                statuses={statuses}
                importance={importanceOf(selectedTopic.id, goal, required)}
                shown={open.has(selectedTopic.id)}
                required={required}
                nextId={next?.id ?? null}
                onOpen={openTopic}
                onLookInside={(id) => dispatch({ type: "open", topicId: id })}
                onClose={close}
              />
            ) : (
              <TopicPanel
                topic={selectedTopic}
                statuses={statuses}
                checkIns={checkIns}
                experiences={experiences}
                importance={importanceOf(selectedTopic.id, goal, required)}
                suspects={selectedSuspects}
                onOpen={openTopic}
                onClose={close}
                onLog={(id, outcome) => {
                  // The buttons go through the helper too, so its question still follows.
                  rail.expand();
                  helper.pick(outcome, [id], `${{ got: "Got it", partly: "Partly", stuck: "Stuck" }[outcome]}: ${topicById.get(id)!.name}`);
                }}
              />
            )}
          </Sheet>}
        </div>

        <aside className={styles.rail} data-collapsed={rail.collapsed || undefined} aria-label="Helper">
          {!narrow && (
            <div
              className={styles.railEdge}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the helper"
              aria-valuemin={RAIL_MIN}
              aria-valuemax={RAIL_MAX}
              aria-valuenow={rail.width}
              tabIndex={0}
              onPointerDown={rail.startDrag}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") rail.resize(rail.width + 24);
                if (e.key === "ArrowRight") rail.resize(rail.width - 24);
              }}
            />
          )}
          {rail.collapsed ? (
            <button type="button" className={styles.railStrip} onClick={rail.expand} aria-label="Open the helper">
              <Icon name="journal" />
              {helper.thinking && <span className={styles.railDot} aria-hidden="true" />}
              <span className={styles.railStripLabel}>Helper</span>
            </button>
          ) : (
            <>
              <div className={styles.railHead}>
                <span className={styles.railTitle}>
                  <Icon name="journal" size={14} />
                  Helper
                </span>
                {!narrow && (
                  <button type="button" className={ui.iconBtn} aria-label="Fold the helper away" onClick={rail.collapse}>
                    <Icon name="forward" size={16} />
                  </button>
                )}
              </div>
              <Chat helper={helper} onOpen={openTopic} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/** A sheet over the right edge of the map. Esc closes it. */
function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <section className={styles.sheet} aria-label={label}>
      {children}
    </section>
  );
}

const RAIL_MIN = 320;
const RAIL_MAX = 560;
const RAIL_STRIP = 52;
const RAIL_KEY = "trellis-helper-width";

/** The helper's width: dragged between 320 and 560px, or folded to a strip. Remembered per browser. */
function useRail() {
  const [width, setWidth] = useState(400);
  const [collapsed, setCollapsed] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RAIL_KEY) ?? "null");
      if (saved) {
        // Reading a per-browser preference after mount; there is nothing to sync before it.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWidth(Math.min(RAIL_MAX, Math.max(RAIL_MIN, saved.width ?? 400)));
        setCollapsed(!!saved.collapsed);
      }
    } catch {
      // Storage blocked: the default width is fine.
    }
  }, []);

  const remember = useCallback((w: number, c: boolean) => {
    try {
      localStorage.setItem(RAIL_KEY, JSON.stringify({ width: w, collapsed: c }));
    } catch {
      // Not remembered; it still works for this visit.
    }
  }, []);

  const resize = useCallback(
    (w: number) => {
      const next = Math.min(RAIL_MAX, Math.max(RAIL_MIN, Math.round(w)));
      setWidth(next);
      remember(next, false);
    },
    [remember],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      drag.current = { x: e.clientX, w: width };
      const move = (ev: PointerEvent) => {
        if (!drag.current) return;
        // Dragging left makes the helper wider.
        setWidth(Math.min(RAIL_MAX, Math.max(RAIL_MIN, drag.current.w + drag.current.x - ev.clientX)));
      };
      const up = (ev: PointerEvent) => {
        if (drag.current) resize(drag.current.w + drag.current.x - ev.clientX);
        drag.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        document.body.style.cursor = "";
      };
      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [width, resize],
  );

  const collapse = useCallback(() => {
    setCollapsed(true);
    remember(width, true);
  }, [width, remember]);
  const expand = useCallback(() => {
    setCollapsed(false);
    remember(width, false);
  }, [width, remember]);

  return useMemo(() => ({ width, collapsed, resize, startDrag, collapse, expand }), [width, collapsed, resize, startDrag, collapse, expand]);
}

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}
