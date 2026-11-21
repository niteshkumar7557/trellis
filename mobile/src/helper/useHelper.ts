// The helper conversation for the subject on screen: the store's messages, the actions
// (actions.ts) wired to the API and the store, and what the screen derives from them
// (the greeting before anything is said, the suggestion chips under the latest reply).
// The derived parts are shared/helper.ts's, so they say what the web says.

import { greeting, suggestionsFor, type HelperContext } from "@shared/helper";
import { useCallback, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useStore, type Store } from "@/store/store";
import { helperActions } from "./actions";

function toContext(s: Store): HelperContext {
  return {
    subjectId: s.subjectId,
    goal: s.goal,
    statuses: s.statuses,
    claims: s.claims,
    checkIns: s.checkIns,
    experiences: s.experiences,
    messages: s.messages.filter((m) => m.subjectId === s.subjectId),
    selected: null, // a phone has no side panel; "finished it" needs a named topic
    opened: s.opened,
  };
}

export function useHelper() {
  const store = useStore();
  const latest = useRef(store);
  latest.current = store;
  const [thinking, setThinking] = useState(false);

  const post = useCallback(async <T,>(path: string, body?: unknown): Promise<T | null> => {
    setThinking(true);
    try {
      return await api<T>(path, { method: "POST", body });
    } catch (err) {
      latest.current.fail(err);
      return null;
    } finally {
      setThinking(false);
    }
  }, []);

  const actions = useMemo(
    () =>
      helperActions({
        post,
        dispatch: (a) => latest.current.dispatch(a),
        messages: () => latest.current.messages,
        subjectId: () => latest.current.subjectId,
      }),
    [post],
  );

  const messages = useMemo(() => store.messages.filter((m) => m.subjectId === store.subjectId), [store.messages, store.subjectId]);
  const hello = useMemo(() => greeting(toContext(store)), [store]);
  const suggestions = useMemo(() => {
    if (thinking) return [];
    const last = messages.at(-1);
    const reply = !last ? hello : last.role === "helper" ? last : null;
    return reply ? suggestionsFor(reply, toContext(store)) : [];
  }, [thinking, messages, hello, store]);

  return { ...actions, messages, hello, suggestions, thinking, more: store.moreMessages[store.subjectId] ?? false, loadOlder: () => store.act.loadOlder(store.subjectId) };
}

export type Helper = ReturnType<typeof useHelper>;
