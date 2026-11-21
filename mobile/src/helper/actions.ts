// The helper's requests (the live half of the web's useHelper.ts). The server runs the
// helper (backend-design.md §5): it reads the message (GLM 5, or the rules in basic mode),
// replies, and proposes; the phone only sends and applies the answers.
//
// Written as plain functions that are GIVEN `post` and `dispatch`, rather than a hook that
// reaches for them, so the tests can pass fakes and check exactly what is sent.

import type { AiUsage, ChatMessage, Outcome, Proposal, SubjectId } from "@shared/types";
import type { Action } from "@/store/reducer";

interface Deps {
  /** POST to the API; null when it failed (the caller has already shown the error). */
  post: <T>(path: string, body?: unknown) => Promise<T | null>;
  dispatch: (a: Action) => void;
  messages: () => ChatMessage[];
  subjectId: () => SubjectId;
}

export function helperActions({ post, dispatch, messages, subjectId }: Deps) {
  /** The proposal behind a confirm card: the server addresses Save, Cancel and Undo by it. */
  const cardOf = (messageId: string, index: number) => {
    const card = messages().find((m) => m.id === messageId)?.cards?.[index];
    return card?.type === "confirm" && card.proposalId ? card : null;
  };

  const send = async (body: unknown) => {
    const answer = await post<{ messages: ChatMessage[]; usage: AiUsage }>(`/helper/${subjectId()}/messages`, body);
    for (const message of answer?.messages ?? []) dispatch({ type: "say", message });
    if (answer?.usage) dispatch({ type: "usage", usage: answer.usage });
  };

  return {
    /** A typed message: one model call on the server (or the rules), never on a tap. */
    async say(text: string) {
      const t = text.trim();
      if (t) await send({ text: t });
    },
    /** A tap (Got it / Partly / Stuck, a choice): no model call, the rules read it. */
    async pick(outcome: Outcome, topicIds: string[], label: string) {
      await send({ pick: { outcome, topicIds, label } });
    },
    /** Save a confirm card, with whatever the student changed on it. */
    async save(messageId: string, index: number, proposal: Proposal) {
      const card = cardOf(messageId, index);
      if (!card) return;
      const answer = await post<{ message: ChatMessage; followUp: ChatMessage; checkIns: never[]; experiences: never[] }>(`/helper/proposals/${card.proposalId}/save`, { proposal });
      if (answer) dispatch({ type: "saved", ...answer });
    },
    async cancel(messageId: string, index: number) {
      const card = cardOf(messageId, index);
      if (!card) return;
      const answer = await post<{ message: ChatMessage }>(`/helper/proposals/${card.proposalId}/cancel`);
      if (answer) dispatch({ type: "message", message: answer.message });
    },
    /** Undo a save: the server deletes what it made; `removed` tells the store which rows. */
    async undo(messageId: string, index: number) {
      const card = cardOf(messageId, index);
      if (!card) return;
      const removed = card.saved ?? { checkIns: [], experiences: [] };
      const answer = await post<{ message: ChatMessage }>(`/helper/proposals/${card.proposalId}/undo`);
      if (answer) dispatch({ type: "message", message: answer.message, removed });
    },
  };
}
