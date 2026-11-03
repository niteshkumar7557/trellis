"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Mark";
import { StatusMark } from "@/components/ui/Status";
import ui from "@/components/ui/ui.module.css";
import { topicById } from "@shared/data";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { shortDate, statusOf } from "@shared/graph";
import { tidy } from "@shared/parse";
import { instructions } from "@shared/data/instructions";
import { buildPrompt, chatGptUrl, claudeUrl } from "@shared/prompt";
import { useStore } from "@/lib/store";
import type { Card, ChatMessage, ExperienceKind, Outcome, Proposal } from "@shared/types";
import { PromptView } from "./Rail";
import styles from "./chat.module.css";
import type { Helper } from "./useHelper";

const OUTCOMES: { value: Outcome; label: string; status: "done" | "learning" | "stuck" }[] = [
  { value: "got", label: "Got it", status: "done" },
  { value: "partly", label: "Partly", status: "learning" },
  { value: "stuck", label: "Stuck", status: "stuck" },
];

const KINDS: { value: ExperienceKind; label: string }[] = [
  { value: "easy", label: "Felt easy" },
  { value: "hard", label: "Was hard" },
  { value: "clicked", label: "Made it click" },
];

/** The helper, in the map's side panel: a study diary that answers back. */
export function Chat({ helper, onOpen }: { helper: Helper; onOpen: (id: string) => void }) {
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLOListElement>(null);
  const count = helper.messages.length;

  // Keep the newest at the bottom in view: jump there on open, glide for each new entry.
  const first = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: first.current || prefersReducedMotion() ? "auto" : "smooth" });
    first.current = false;
  }, [count, helper.thinking]);

  // Each new entry settles in.
  const seen = useRef(count);
  useGSAP(
    () => {
      if (count > seen.current && !prefersReducedMotion()) {
        gsap.from(thread.current!.lastElementChild, { y: 10, opacity: 0, duration: 0.35, ease: "power3.out", clearProps: "all" });
      }
      seen.current = count;
    },
    { scope: thread, dependencies: [count] },
  );

  const send = () => {
    if (!text.trim() || helper.thinking) return;
    helper.say(text);
    setText("");
  };

  return (
    <div className={styles.chat}>
      <div ref={scroller} className={styles.scroll}>
        <ol ref={thread} className={styles.thread} aria-live="polite">
          {count === 0 && (
            <li className={styles.item}>
              <Entry role="helper" at={null}>
                <p className={styles.text}>{helper.hello.text}</p>
                <Cards cards={helper.hello.cards} message={null} helper={helper} onOpen={onOpen} />
              </Entry>
            </li>
          )}
          {helper.messages.map((m, i) => {
            const day = m.at.slice(0, 10);
            const newDay = i === 0 || helper.messages[i - 1].at.slice(0, 10) !== day;
            return (
              <li key={m.id} className={styles.item}>
                {newDay && <p className={styles.day}>{shortDate(m.at)}</p>}
                <Entry role={m.role} at={m.at}>
                  <p className={styles.text}>{m.text}</p>
                  <Cards cards={m.cards} message={m} helper={helper} onOpen={onOpen} />
                </Entry>
              </li>
            );
          })}
          {helper.thinking && (
            <li className={styles.item}>
              <Entry role="helper" at={null}>
                <span className={styles.dots} aria-label="The helper is reading">
                  <span />
                  <span />
                  <span />
                </span>
              </Entry>
            </li>
          )}
        </ol>
      </div>

      <form
        className={styles.compose}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="helper-input" className="visually-hidden">
          Tell the helper what you studied, or ask anything
        </label>
        <textarea
          id="helper-input"
          rows={2}
          value={text}
          placeholder="What did you study? Or ask: what's next, can I skip…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="submit" className={ui.primary} disabled={!text.trim() || helper.thinking} aria-label="Send">
          <Icon name="enter" />
        </button>
      </form>
    </div>
  );
}

function Entry({ role, at, children }: { role: ChatMessage["role"]; at: string | null; children: React.ReactNode }) {
  return (
    <div className={styles.entry} data-role={role}>
      <p className={styles.who}>
        {role === "helper" ? (
          <>
            <Mark size={14} /> Trellis
          </>
        ) : (
          "You"
        )}
        {at && <span className="num">{new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
      </p>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

function Cards({ cards, message, helper, onOpen }: { cards?: Card[]; message: ChatMessage | null; helper: Helper; onOpen: (id: string) => void }) {
  if (!cards?.length) return null;
  return (
    <div className={styles.cards}>
      {cards.map((c, i) => {
        if (c.type === "confirm" && message) return <ConfirmCard key={i} card={c} onSave={(p) => helper.save(message.id, i, p)} onCancel={() => helper.cancel(message.id, i)} onUndo={() => helper.undo(message.id, i)} />;
        if (c.type === "prompt") return <PromptCard key={i} topicId={c.topicId} onOpen={onOpen} />;
        if (c.type === "choose")
          return (
            <div key={i} className={styles.choices}>
              {c.options.map((o) => (
                <button key={o.label} type="button" className={ui.btn} disabled={helper.thinking} onClick={() => helper.pick(o.outcome ?? c.outcome, o.topicIds, o.outcome ? `${o.label}: ${topicById.get(o.topicIds[0])?.name}` : o.label)}>
                  {o.label}
                </button>
              ))}
            </div>
          );
        if (c.type === "suggest")
          return (
            <div key={i} className={styles.suggest}>
              {c.options.map((o) => (
                <button key={o} type="button" disabled={helper.thinking} onClick={() => helper.say(o)}>
                  {o}
                </button>
              ))}
            </div>
          );
        return null;
      })}
    </div>
  );
}

// ------------------------------------------------------------ "Here's what I'll save"

function ConfirmCard({
  card,
  onSave,
  onCancel,
  onUndo,
}: {
  card: Extract<Card, { type: "confirm" }>;
  onSave: (p: Proposal) => void;
  onCancel: () => void;
  onUndo: () => void;
}) {
  const [draft, setDraft] = useState<Proposal>(card.proposal);
  const open = card.state === "open";
  const p = open ? draft : card.proposal;
  const single = p.updates.length === 1 ? p.updates[0].topicId : null;

  const setOutcome = (i: number, outcome: Outcome) =>
    setDraft({ ...draft, updates: draft.updates.map((u, j) => (j === i ? { ...u, outcome } : u)) });
  const setExperience = (i: number, patch: Partial<Proposal["experiences"][number]>) =>
    setDraft({ ...draft, experiences: draft.experiences.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <div className={styles.confirm} data-state={card.state}>
      <ul className={styles.changes}>
        {p.updates.map((u, i) => (
          <li key={u.topicId}>
            <span className={styles.changeTopic}>{topicById.get(u.topicId)?.name}</span>
            {open ? (
              <span className={ui.segmented} role="group" aria-label={`How ${topicById.get(u.topicId)?.name} went`}>
                {OUTCOMES.map((o) => (
                  <button key={o.value} type="button" className={ui.segment} aria-pressed={u.outcome === o.value} onClick={() => setOutcome(i, o.value)}>
                    <StatusMark status={o.status} size={8} />
                    {o.label}
                  </button>
                ))}
              </span>
            ) : (
              <span className={styles.changeOutcome}>
                <StatusMark status={OUTCOMES.find((o) => o.value === u.outcome)!.status} size={8} />
                {OUTCOMES.find((o) => o.value === u.outcome)!.label}
              </span>
            )}
          </li>
        ))}
        {p.experiences.map((e, i) => (
          <li key={i} className={styles.changeNote}>
            {open ? (
              <>
                <select value={e.kind} onChange={(ev) => setExperience(i, { kind: ev.target.value as ExperienceKind })} aria-label="What kind of note">
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <textarea rows={2} value={e.text} onChange={(ev) => setExperience(i, { text: ev.target.value, line: tidy(ev.target.value) })} aria-label="Your words" />
              </>
            ) : (
              <>
                <span className={styles.kind}>{KINDS.find((k) => k.value === e.kind)!.label}</span>
                <span>“{e.text}”</span>
              </>
            )}
          </li>
        ))}
        {open && single && p.experiences.length === 0 && (
          <li className={styles.changeNote}>
            <button
              type="button"
              className={ui.ghost}
              onClick={() => setDraft({ ...draft, experiences: [{ topicId: single, kind: "hard", text: "", line: "" }] })}
            >
              <Icon name="plus" size={14} />
              Add how it went
            </button>
          </li>
        )}
      </ul>

      <div className={styles.confirmBar}>
        {open && (
          <>
            <button type="button" className={ui.primary} onClick={() => onSave(draft)}>
              <Icon name="check" />
              Save
            </button>
            <button type="button" className={ui.ghost} onClick={onCancel}>
              Cancel
            </button>
            <span className={styles.hint}>Nothing is saved until you press Save.</span>
          </>
        )}
        {card.state === "saved" && (
          <span className={styles.status}>
            <Icon name="check" size={14} /> Saved
            <button type="button" onClick={onUndo}>
              Undo
            </button>
          </span>
        )}
        {card.state === "cancelled" && <span className={styles.status}>Not saved</span>}
        {card.state === "undone" && <span className={styles.status}>Undone. Nothing from this was kept.</span>}
      </div>
    </div>
  );
}

/** A prompt, folded to one line: copy or open it straight away, or unfold to read it. */
function PromptCard({ topicId, onOpen }: { topicId: string; onOpen: (id: string) => void }) {
  const { statuses, checkIns, experiences, dispatch } = useStore();
  const [unfolded, setUnfolded] = useState(false);
  const [copied, setCopied] = useState(false);
  const topic = topicById.get(topicId);
  if (!topic) return null;
  const prompt = buildPrompt(topic, statuses, checkIns, experiences, instructions);
  // Taking the prompt counts; looking at it doesn't.
  const took = () => prompt.experienceIds.length && dispatch({ type: "used", experienceIds: prompt.experienceIds });

  return (
    <div className={styles.promptCard} data-open={unfolded || undefined}>
      <div className={styles.promptRow}>
        <button type="button" className={styles.promptToggle} aria-expanded={unfolded} onClick={() => setUnfolded((u) => !u)}>
          <Icon name="chevron" size={14} className={styles.promptChevron} />
          <StatusMark status={statusOf(statuses, topicId)} />
          <span>Prompt for {topic.name}</span>
        </button>
        {!unfolded && (
          <span className={styles.promptActions}>
            <button
              type="button"
              className={ui.iconBtn}
              aria-label={copied ? "Copied" : `Copy the prompt for ${topic.name}`}
              onClick={() => {
                navigator.clipboard?.writeText(prompt.text).catch(() => {});
                took();
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
            >
              <Icon name={copied ? "check" : "copy"} size={15} />
            </button>
            <a className={styles.promptLink} href={chatGptUrl(prompt.text)} target="_blank" rel="noreferrer" onClick={took}>
              ChatGPT
            </a>
            <a className={styles.promptLink} href={claudeUrl(prompt.text)} target="_blank" rel="noreferrer" onClick={took}>
              Claude
            </a>
          </span>
        )}
      </div>
      {unfolded && (
        <>
          <PromptView prompt={prompt} compact />
          <button type="button" className={styles.promptOpen} onClick={() => onOpen(topicId)}>
            Open {topic.name}
            <Icon name="forward" size={14} />
          </button>
        </>
      )}
    </div>
  );
}
