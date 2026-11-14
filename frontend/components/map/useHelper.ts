"use client";

// Runs the helper conversation for the current subject, in either mode:
//
//   demo  the rule-based helper in shared/helper.ts runs right here, on the store's state.
//   live  the server does the same thing (backend-design.md §5): each message, tap, save,
//         cancel and undo is a request, and the store applies the answer.
//
// Either way this is the only thing that changes the record from the chat, and only
// through a confirm card.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { afterSave, greeting, respond, type HelperContext, type Input, type Reply } from "@shared/helper";
import { nextTopic, revealed } from "@shared/graph";
import { ApiError, api } from "@/lib/api";
import { newId, useStore } from "@/lib/store";
import type { AiUsage, ChatMessage, CheckIn, Experience, Outcome, Proposal } from "@shared/types";

/** How long the demo helper "thinks", so it feels like the real one. */
const THINK_MS = 650;

export interface Helper {
  messages: ChatMessage[];
  /** Shown before the student has said anything. Not saved. */
  hello: Reply;
  thinking: boolean;
  /** Live mode: older messages exist on the server. */
  more: boolean;
  loadOlder: () => void;
  say: (text: string) => void;
  pick: (outcome: Outcome, topicIds: string[], label: string) => void;
  save: (messageId: string, card: number, proposal: Proposal) => void;
  cancel: (messageId: string, card: number) => void;
  undo: (messageId: string, card: number) => void;
}

interface SaveAnswer {
  checkIns: CheckIn[];
  experiences: Experience[];
  message: ChatMessage;
  followUp: ChatMessage;
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
  const isLive = useCallback(() => latest.current.mode === "live", []);

  /** The proposal id behind a confirm card (live mode: the server addresses cards by it). */
  const proposalIdOf = useCallback((messageId: string, card: number) => {
    const c = latest.current.messages.find((m) => m.id === messageId)?.cards?.[card];
    return c?.type === "confirm" ? c.proposalId : undefined;
  }, []);

  /** A live request; a failure shows in the shell's error bar. */
  const request = useCallback(async <T,>(path: string, body?: unknown): Promise<T | null> => {
    setThinking(true);
    try {
      return await api<T>(path, { method: "POST", body });
    } catch (err) {
      // 409: the card was already decided (another tab, a double click). Reload the thread
      // so it shows the truth instead of an error.
      if (err instanceof ApiError && err.code === "proposal_not_open") {
        await latest.current.act.goLive();
        return null;
      }
      throw err;
    } finally {
      setThinking(false);
    }
  }, []);

  // A failed request shows in the shell's error bar, like every other failure.
  const showError = useCallback((err: unknown) => latest.current.fail(err), []);

  // ------------------------------------------------------------------ demo mode

  const reply = useCallback((make: () => Reply) => {
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
  }, []);

  const sendDemo = useCallback(
    (text: string, input: Input) => {
      const s = latest.current;
      s.dispatch({ type: "say", message: { id: newId("m"), subjectId: s.subjectId, at: new Date().toISOString(), role: "student", text } });
      // Read the context after the student's message has landed, so a pending question sees it.
      reply(() => respond(input, context()));
    },
    [reply, context],
  );

  // ------------------------------------------------------------------ both modes

  const sendLive = useCallback(
    async (body: unknown) => {
      const subjectId = latest.current.subjectId;
      const answer = await request<{ messages: ChatMessage[]; usage: AiUsage }>(`/helper/${subjectId}/messages`, body).catch(showError);
      for (const m of answer?.messages ?? []) latest.current.dispatch({ type: "say", message: m });
      // The AI allowance after this message, so the sidebar's meter moves with the reply.
      if (answer?.usage) latest.current.dispatch({ type: "usage", usage: answer.usage });
    },
    [request, showError],
  );

  const say = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      if (isLive()) void sendLive({ text: t, selected: latest.current.selected });
      else sendDemo(t, { kind: "say", text: t });
    },
    [isLive, sendLive, sendDemo],
  );

  const pick = useCallback(
    (outcome: Outcome, topicIds: string[], label: string) => {
      if (isLive()) void sendLive({ pick: { outcome, topicIds, label } });
      else sendDemo(label, { kind: "pick", outcome, topicIds });
    },
    [isLive, sendLive, sendDemo],
  );

  const save = useCallback(
    (messageId: string, card: number, proposal: Proposal) => {
      if (isLive()) {
        const id = proposalIdOf(messageId, card);
        if (!id) return;
        void request<SaveAnswer>(`/helper/proposals/${id}/save`, { proposal })
          .then((a) => a && latest.current.dispatch({ type: "saved", ...a }))
          .catch(showError);
        return;
      }
      const before = context();
      const next = before.goal ? nextTopic(before.goal, before.statuses) : null;
      const open = revealed(before.subjectId, before.statuses, before.checkIns, next?.id ?? null, before.opened, before.experiences);
      latest.current.dispatch({ type: "save", messageId, card, proposal, at: new Date().toISOString() });
      reply(() => afterSave(proposal, context(), open));
    },
    [isLive, proposalIdOf, request, showError, context, reply],
  );

  const cancel = useCallback(
    (messageId: string, card: number) => {
      const id = isLive() ? proposalIdOf(messageId, card) : undefined;
      if (!isLive()) return latest.current.dispatch({ type: "cancel", messageId, card });
      if (!id) return;
      void request<{ message: ChatMessage }>(`/helper/proposals/${id}/cancel`)
        .then((a) => a && latest.current.dispatch({ type: "message", message: a.message }))
        .catch(showError);
    },
    [isLive, proposalIdOf, request, showError],
  );

  const undo = useCallback(
    (messageId: string, card: number) => {
      if (!isLive()) return latest.current.dispatch({ type: "undo", messageId, card });
      const id = proposalIdOf(messageId, card);
      const c = latest.current.messages.find((m) => m.id === messageId)?.cards?.[card];
      if (!id || c?.type !== "confirm") return;
      // What the save made, so the store can drop it once the server has deleted it.
      const removed = c.saved ?? { checkIns: [], experiences: [] };
      void request<{ message: ChatMessage }>(`/helper/proposals/${id}/undo`)
        .then((a) => a && latest.current.dispatch({ type: "message", message: a.message, removed }))
        .catch(showError);
    },
    [isLive, proposalIdOf, request, showError],
  );

  const loadOlder = useCallback(() => void latest.current.act.loadOlder(latest.current.subjectId), []);

  const messages = useMemo(() => store.messages.filter((m) => m.subjectId === store.subjectId), [store.messages, store.subjectId]);
  const hello = useMemo(() => greeting(toContext(store)), [store]);
  const more = store.moreMessages[store.subjectId] ?? false;

  return { messages, hello, thinking, more, loadOlder, say, pick, save, cancel, undo };
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
