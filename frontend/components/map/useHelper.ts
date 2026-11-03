"use client";

// Runs the helper conversation for the current subject. It talks to lib/helper.ts (the
// stand-in for the AI) with the student's latest state, and is the only thing that
// dispatches the helper's changes, always through a confirm card.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { afterSave, greeting, respond, type HelperContext, type Input, type Reply } from "@/lib/helper";
import { nextTopic, revealed } from "@/lib/graph";
import { newId, useStore } from "@/lib/store";
import type { ChatMessage, Outcome, Proposal } from "@/lib/types";

/** How long the stand-in "thinks". The real call takes a second or two. */
const THINK_MS = 650;

export interface Helper {
  messages: ChatMessage[];
  /** Shown before the student has said anything. Not saved. */
  hello: Reply;
  thinking: boolean;
  say: (text: string) => void;
  pick: (outcome: Outcome, topicIds: string[], label: string) => void;
  save: (messageId: string, card: number, proposal: Proposal) => void;
  cancel: (messageId: string, card: number) => void;
  undo: (messageId: string, card: number) => void;
}

export function useHelper(): Helper {
  const store = useStore();
  const latest = useRef(store);
  useEffect(() => {
    latest.current = store;
  });
  const [thinking, setThinking] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const context = useCallback((): HelperContext => toContext(latest.current), []);

  const reply = useCallback(
    (make: () => Reply) => {
      setThinking(true);
      timers.current.push(
        setTimeout(() => {
          const r = make();
          latest.current.dispatch({
            type: "say",
            message: { id: newId("m"), subjectId: latest.current.subjectId, at: new Date().toISOString(), role: "helper", ...r },
          });
          setThinking(false);
        }, THINK_MS),
      );
    },
    [],
  );

  const send = useCallback(
    (text: string, input: Input) => {
      const s = latest.current;
      s.dispatch({ type: "say", message: { id: newId("m"), subjectId: s.subjectId, at: new Date().toISOString(), role: "student", text } });
      // Read the context after the student's message has landed, so a pending question sees it.
      reply(() => respond(input, context()));
    },
    [reply, context],
  );

  const say = useCallback((text: string) => {
    const t = text.trim();
    if (t) send(t, { kind: "say", text: t });
  }, [send]);

  const pick = useCallback(
    (outcome: Outcome, topicIds: string[], label: string) => send(label, { kind: "pick", outcome, topicIds }),
    [send],
  );

  const save = useCallback(
    (messageId: string, card: number, proposal: Proposal) => {
      const before = context();
      const next = before.goal ? nextTopic(before.goal, before.statuses) : null;
      const open = revealed(before.subjectId, before.statuses, before.checkIns, next?.id ?? null, before.opened);
      latest.current.dispatch({ type: "save", messageId, card, proposal, at: new Date().toISOString() });
      reply(() => afterSave(proposal, context(), open));
    },
    [context, reply],
  );

  const cancel = useCallback((messageId: string, card: number) => latest.current.dispatch({ type: "cancel", messageId, card }), []);
  const undo = useCallback((messageId: string, card: number) => latest.current.dispatch({ type: "undo", messageId, card }), []);

  const messages = useMemo(() => store.messages.filter((m) => m.subjectId === store.subjectId), [store.messages, store.subjectId]);
  const hello = useMemo(() => greeting(toContext(store)), [store]);

  return { messages, hello, thinking, say, pick, save, cancel, undo };
}

function toContext(s: ReturnType<typeof useStore>): HelperContext {
  return {
    subjectId: s.subjectId,
    goal: s.goal,
    statuses: s.statuses,
    claims: s.claims,
    checkIns: s.checkIns,
    experiences: s.experiences,
    messages: s.messages.filter((m) => m.subjectId === s.subjectId),
    selected: s.selected,
    opened: s.opened,
  };
}
