"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusMark } from "@/components/ui/Status";
import ui from "@/components/ui/ui.module.css";
import { kids, subjectById, topicById } from "@/lib/data";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { needsOf, summarise } from "@/lib/graph";
import { useStore } from "@/lib/store";
import type { ClaimKind } from "@/lib/types";
import styles from "../start.module.css";

const CHOICES: { kind: ClaimKind; label: string; key: string }[] = [
  { kind: "know", label: "I know it", key: "1" },
  { kind: "shaky", label: "Shaky", key: "2" },
  { kind: "new", label: "New to me", key: "3" },
];

export default function SortPage() {
  const router = useRouter();
  const { goal, statuses, dispatch } = useStore();
  const deck = useMemo(() => {
    if (!goal) return [];
    // One card per big topic on the route. Its subtopics inherit the answer.
    return summarise(goal, statuses).areas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);
  const [answers, setAnswers] = useState<ClaimKind[]>([]);
  const card = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const index = answers.length;
  const topic = deck[index];
  const done = deck.length > 0 && index >= deck.length;

  const choose = useCallback((kind: ClaimKind) => {
    if (!topic || busy.current) return;
    if (prefersReducedMotion() || !card.current) {
      setAnswers((a) => [...a, kind]);
      return;
    }
    busy.current = true;
    const dir = kind === "know" ? -1 : kind === "new" ? 1 : 0;
    gsap.to(card.current, {
      x: dir * 140,
      y: dir === 0 ? -60 : -12,
      rotation: dir * 6,
      opacity: 0,
      duration: 0.28,
      ease: "power2.in",
      onComplete: () => {
        setAnswers((a) => [...a, kind]);
        busy.current = false;
      },
    });
  }, [topic]);

  // Each new card settles in from below.
  useGSAP(
    () => {
      if (!card.current) return;
      if (prefersReducedMotion()) return;
      gsap.fromTo(card.current, { y: 28, opacity: 0, x: 0, rotation: 0 }, { y: 0, opacity: 1, duration: 0.38, ease: "power3.out" });
    },
    { scope: stage, dependencies: [index] },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const c = CHOICES.find((x) => x.key === e.key);
      if (c) choose(c.kind);
      if (e.key === "Backspace") setAnswers((a) => a.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  if (!goal) {
    return (
      <div className={styles.sortWrap}>
        <h1 className={styles.h1}>Pick a goal first</h1>
        <Link href="/start" className={ui.primary}>
          Choose a subject and goal
        </Link>
      </div>
    );
  }

  const count = (k: ClaimKind) => answers.filter((a) => a === k).length;

  const finish = () => {
    const at = new Date().toISOString().slice(0, 10);
    dispatch({ type: "claims", claims: deck.map((t, i) => ({ topicId: t.id, claim: answers[i], at })) });
    dispatch({ type: "select", topicId: null });
    router.push("/map");
  };

  return (
    <div ref={stage} className={styles.sortWrap}>
      <div className={styles.sortHead}>
        <h1 className={styles.h1}>{done ? "Your map is ready" : "How well do you know these big topics?"}</h1>
        <p className={styles.lede}>
          {done
            ? "Trellis believes you, loosely. It starts small: each big topic opens into its smaller topics when you reach it."
            : `${goal.name}. Go with your first instinct; nothing here is a test.`}
        </p>
        <div className={styles.progress} aria-label={`${Math.min(index, deck.length)} of ${deck.length} sorted`}>
          <span className={styles.progressTrack}>
            <span style={{ width: `${(Math.min(index, deck.length) / deck.length) * 100}%` }} />
          </span>
          <span className="num">
            {Math.min(index, deck.length)} of {deck.length}
          </span>
        </div>
      </div>

      {!done && topic && (
        <>
          <div ref={card} className={styles.card} key={topic.id}>
            <p className={styles.cardSubject}>
              {subjectById.get(topic.subjectId)!.shortName} · <span className="num">{kids(topic.id).length}</span> topics inside
            </p>
            <h2 className={styles.cardTitle}>{topic.name}</h2>
            <p className={styles.cardSummary}>{topic.summary}</p>
            <p className={styles.cardNeeds}>
              {needsOf(topic.id).length
                ? `Builds on ${needsOf(topic.id)
                    .map((id) => topicById.get(id)!.name)
                    .join(", ")}`
                : "Where the subject starts: nothing comes before it."}
            </p>
          </div>

          <div className={styles.choices}>
            {CHOICES.map((c) => (
              <button key={c.kind} type="button" className={styles.choice} onClick={() => choose(c.kind)}>
                <StatusMark status={c.kind === "new" ? "new" : c.kind} size={12} />
                {c.label}
                <span className={ui.kbd}>{c.key}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${ui.ghost} ${styles.undo}`}
            disabled={index === 0}
            onClick={() => setAnswers((a) => a.slice(0, -1))}
          >
            <Icon name="back" />
            Previous topic
          </button>
        </>
      )}

      {done && (
        <div className={styles.result}>
          <dl className={styles.resultFigs}>
            <div>
              <dt>
                <StatusMark status="know" /> You know
              </dt>
              <dd className="num">{count("know")}</dd>
            </div>
            <div>
              <dt>
                <StatusMark status="shaky" /> Shaky
              </dt>
              <dd className="num">{count("shaky")}</dd>
            </div>
            <div>
              <dt>
                <StatusMark status="new" /> New to you
              </dt>
              <dd className="num">{count("new")}</dd>
            </div>
          </dl>
          <div className={styles.footer}>
            <button type="button" className={ui.primary} onClick={finish}>
              Open my map
              <Icon name="forward" />
            </button>
            <button type="button" className={ui.ghost} onClick={() => setAnswers((a) => a.slice(0, -1))}>
              Change the last one
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
