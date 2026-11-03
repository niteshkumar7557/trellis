"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusMark, StatusPill } from "@/components/ui/Status";
import ui from "@/components/ui/ui.module.css";
import { kids, subjectById, topicById } from "@/lib/data";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import {
  STATUS_LABEL,
  helpsOf,
  neededBy,
  needsOf,
  pastUnlocks,
  progressOf,
  shortDate,
  sortByRoute,
  statusOf,
  type Importance,
  type Suspect,
} from "@/lib/graph";
import { buildPrompt, chatGptUrl, claudeUrl, type Prompt } from "@/lib/prompt";
import { useStore } from "@/lib/store";
import type { CheckIn, Experience, Outcome, Status, Topic } from "@/lib/types";
import styles from "./rail.module.css";

function Verdict({ importance }: { importance: Importance }) {
  return (
    <span className={styles.verdict} data-verdict={importance.verdict}>
      {importance.verdict === "keep" ? "Don't skip" : "Can skip"}
    </span>
  );
}

// ------------------------------------------------------------ one subtopic

interface PanelProps {
  topic: Topic;
  statuses: Map<string, Status>;
  checkIns: CheckIn[];
  experiences: Experience[];
  importance: Importance;
  suspects: Suspect[];
  onOpen: (id: string) => void;
  onClose: () => void;
  onLog: (topicId: string, outcome: Outcome) => void;
}

export function TopicPanel({ topic, statuses, checkIns, experiences, importance, suspects, onOpen, onClose, onLog }: PanelProps) {
  const root = useRef<HTMLDivElement>(null);
  const status = statusOf(statuses, topic.id);
  const prompt = buildPrompt(topic, statuses, checkIns, experiences);
  const said = experiences.filter((e) => e.topicId === topic.id).sort((a, b) => b.at.localeCompare(a.at));
  const history = checkIns.filter((c) => c.topicId === topic.id).sort((a, b) => b.at.localeCompare(a.at));
  const unlock = pastUnlocks(checkIns, experiences).at(-1);
  const parent = topicById.get(topic.parentId!)!;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(root.current, { x: 24, opacity: 0, duration: 0.32, ease: "power3.out" });
    },
    { dependencies: [topic.id], scope: root },
  );

  return (
    <div ref={root} className={styles.panel}>
      <PanelBar onClose={onClose} />

      <header className={styles.panelHead}>
        <button type="button" className={styles.crumb} onClick={() => onOpen(parent.id)}>
          {parent.name}
        </button>
        <h2 className={styles.panelTitle}>{topic.name}</h2>
        <div className={styles.pills}>
          <StatusPill status={status} />
          {topic.optional && <span className={styles.neutralPill}>Optional</span>}
          <span className={styles.meta}>
            {subjectById.get(topic.subjectId)!.shortName} · <span className="num">~{topic.minutes} min</span>
          </span>
        </div>
        <p className={styles.summary}>{topic.summary}</p>
        <p className={styles.reason}>
          <Verdict importance={importance} /> {importance.reason}
        </p>
      </header>

      {status === "stuck" && suspects.length > 0 && (
        <section className={styles.section} data-tone="stuck">
          <h3 className={styles.sectionTitle}>May be underneath</h3>
          <ul className={styles.rows}>
            {suspects.slice(0, 2).map((s) => (
              <li key={s.topic.id}>
                <button type="button" onClick={() => onOpen(s.topic.id)}>
                  <StatusMark status={s.status} />
                  <span>{s.topic.name}</span>
                  <span className={styles.rowMeta}>
                    {STATUS_LABEL[s.status]}
                    {s.path.length > 2 ? " · two steps down" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {unlock && <p className={styles.memory}>Going back one step worked before: {unlock.via.name} → {unlock.stuckOn.name}.</p>}
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your prompt</h3>
        <PromptView prompt={prompt} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>How did it go?</h3>
        <div className={ui.segmented} role="group" aria-label="How did it go?">
          <button type="button" className={ui.segment} onClick={() => onLog(topic.id, "got")}>
            <StatusMark status="done" size={8} /> Got it
          </button>
          <button type="button" className={ui.segment} onClick={() => onLog(topic.id, "partly")}>
            <StatusMark status="learning" size={8} /> Partly
          </button>
          <button type="button" className={ui.segment} onClick={() => onLog(topic.id, "stuck")}>
            <StatusMark status="stuck" size={8} /> Stuck
          </button>
        </div>
      </section>

      <TopicRows title="It needs" ids={needsOf(topic.id)} statuses={statuses} onOpen={onOpen} empty="Nothing inside this subject. Start here." />
      {helpsOf(topic.id).length > 0 && (
        <TopicRows title="Helped by (optional)" ids={helpsOf(topic.id)} statuses={statuses} onOpen={onOpen} />
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>What you said about it</h3>
        {said.length ? (
          <ul className={styles.notes}>
            {said.map((e) => (
              <li key={e.id}>
                <span className={styles.noteHead}>
                  <span className={styles.kind} data-kind={e.kind}>
                    {KIND_LABEL[e.kind]}
                  </span>
                  {shortDate(e.at)}
                </span>
                <span>“{e.text}”</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing yet. Tell the helper how it went and it collects here, then shapes your prompts.</p>
        )}
        {history.length > 0 && (
          <p className={styles.meta}>
            {history.map((c) => `${shortDate(c.at)} ${OUTCOME_WORD[c.outcome]}`).join(" · ")}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Where people slip</h3>
        <ul className={styles.bullets}>
          {topic.mistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      {neededBy(topic.id).length > 0 && (
        <TopicRows title="It unlocks" ids={neededBy(topic.id)} statuses={statuses} onOpen={onOpen} />
      )}
    </div>
  );
}

// ------------------------------------------------------------ one big topic

interface BigPanelProps {
  topic: Topic;
  statuses: Map<string, Status>;
  importance: Importance;
  /** Its subtopics are on the map. */
  shown: boolean;
  required: Set<string>;
  nextId: string | null;
  onOpen: (id: string) => void;
  onLookInside: (id: string) => void;
  onClose: () => void;
}

export function BigPanel({ topic, statuses, importance, shown, required, nextId, onOpen, onLookInside, onClose }: BigPanelProps) {
  const root = useRef<HTMLDivElement>(null);
  const status = statusOf(statuses, topic.id);
  const p = progressOf(topic.id, statuses);
  const inside = sortByRoute(kids(topic.id));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(root.current, { x: 24, opacity: 0, duration: 0.32, ease: "power3.out" });
    },
    { dependencies: [topic.id], scope: root },
  );

  return (
    <div ref={root} className={styles.panel}>
      <PanelBar onClose={onClose} />

      <header className={styles.panelHead}>
        <p className={styles.kicker}>Big topic</p>
        <h2 className={styles.panelTitle}>{topic.name}</h2>
        <div className={styles.pills}>
          <StatusPill status={status} />
          <span className={styles.meta}>
            <span className="num">
              {p.done} of {p.total}
            </span>{" "}
            core topics · <span className="num">~{Math.round(topic.minutes / 60)} h</span>
          </span>
        </div>
        <p className={styles.summary}>{topic.summary}</p>
        <p className={styles.reason}>
          <Verdict importance={importance} /> {importance.reason}
        </p>
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Inside <span className={`${styles.count} ${styles.countPlain} num`}>{inside.length}</span>
        </h3>
        {shown ? (
          <ul className={styles.rows}>
            {inside.map((t) => {
              const s = statusOf(statuses, t.id);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => onOpen(t.id)} data-skip={!required.has(t.id) || undefined}>
                    <StatusMark status={s} />
                    <span>{t.name}</span>
                    <span className={styles.rowMeta}>
                      {t.id === nextId ? <strong>Next</strong> : t.optional ? "Optional" : STATUS_LABEL[s]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.locked}>
            <p className={styles.empty}>
              <span className="num">{inside.length}</span> topics are inside.{" "}
              {status === "know"
                ? "You said you know this, so it stays closed. Open it to check a part you're unsure of."
                : "They appear on your map when you reach this: when the next topic is in here, or you check in on one of them."}
            </p>
            <button type="button" className={ui.btn} onClick={() => onLookInside(topic.id)}>
              Look inside now
            </button>
          </div>
        )}
      </section>

      <TopicRows title="It needs" ids={needsOf(topic.id)} statuses={statuses} onOpen={onOpen} empty="Nothing. It's where the subject starts." />
      {helpsOf(topic.id).length > 0 && (
        <TopicRows title="Helped by (optional)" ids={helpsOf(topic.id)} statuses={statuses} onOpen={onOpen} />
      )}
      {neededBy(topic.id).length > 0 && (
        <TopicRows title="It unlocks" ids={neededBy(topic.id)} statuses={statuses} onOpen={onOpen} />
      )}
    </div>
  );
}

// ------------------------------------------------------------ parts

const KIND_LABEL = { easy: "Felt easy", hard: "Was hard", clicked: "Made it click" } as const;
const OUTCOME_WORD = { got: "done", partly: "partly", stuck: "stuck" } as const;

/** The prompt in its three parts, so it's clear where each line comes from. */
export function PromptView({ prompt, compact = false }: { prompt: Prompt; compact?: boolean }) {
  const [copied, copy] = useCopy();
  const { dispatch } = useStore();
  // Taking the prompt counts; looking at it doesn't.
  const took = () => prompt.experienceIds.length && dispatch({ type: "used", experienceIds: prompt.experienceIds });
  return (
    <div className={styles.promptView} data-compact={compact || undefined}>
      <div className={styles.prompt}>
        <p className={styles.promptPart}>
          <span className={styles.promptLabel}>Known</span>
          {prompt.known}
        </p>
        {prompt.experiences.length > 0 && (
          <div className={styles.promptPart}>
            <span className={styles.promptLabel}>From your notes</span>
            <ul>
              {prompt.experiences.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        {!compact && (
          <div className={styles.promptPart}>
            <span className={styles.promptLabel}>Instructions</span>
            <ul>
              {prompt.instructions.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        {compact && (
          <p className={styles.promptMore}>
            + <span className="num">{prompt.instructions.length}</span> instructions for your AI
          </p>
        )}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.primary}
          onClick={() => {
            copy(prompt.text);
            took();
          }}
        >
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy"}
        </button>
        <a className={ui.btn} href={chatGptUrl(prompt.text)} target="_blank" rel="noreferrer" onClick={took}>
          ChatGPT
          <Icon name="external" size={14} />
        </a>
        <a className={ui.btn} href={claudeUrl(prompt.text)} target="_blank" rel="noreferrer" onClick={took}>
          Claude
          <Icon name="external" size={14} />
        </a>
      </div>
    </div>
  );
}

function PanelBar({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.panelBar}>
      <span className={styles.panelHint}>
        <span className={ui.kbd}>Esc</span> to close
      </span>
      <button type="button" className={ui.iconBtn} aria-label="Close topic" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  );
}

function TopicRows({
  title,
  ids,
  statuses,
  onOpen,
  empty,
}: {
  title: string;
  ids: string[];
  statuses: Map<string, Status>;
  onOpen: (id: string) => void;
  empty?: string;
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {ids.length ? (
        <ul className={styles.rows}>
          {ids.map((id) => {
            const t = topicById.get(id)!;
            const s = statusOf(statuses, id);
            const elsewhere = t.parentId && topicById.get(t.parentId);
            return (
              <li key={id}>
                <button type="button" onClick={() => onOpen(id)}>
                  <StatusMark status={s} />
                  <span>{t.name}</span>
                  <span className={styles.rowMeta}>{elsewhere ? `${elsewhere.name} · ` : ""}{STATUS_LABEL[s]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>{empty}</p>
      )}
    </section>
  );
}

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return [copied, copy];
}
