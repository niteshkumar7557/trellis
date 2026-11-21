// The app's state (docs/mobile.md §8): who's signed in and their record, for every screen.
//
// mode
//   loading      at start, while the stored session is checked (the splash stays up)
//   signed-out   no session, or the server refused it: Log in and Sign up exist
//   offline      a session is stored but the server couldn't be reached: "Can't reach
//                Trellis" with Retry (never Log in: the student IS signed in)
//   live         signed in, the record loaded from GET /api/state
//
// Screens call act.* and never call the API for the record themselves; each action waits
// for the server and applies its answer through the reducer. A failed action shows its
// message in the error toast (`error`) and changes nothing.

import { goalById } from "@shared/data";
import { deriveStatuses } from "@shared/graph";
import type { AiUsage, ChatMessage, CheckIn, Claim, ClaimKind, Experience, Goal, PromptTake, Status, Student, SubjectId } from "@shared/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { ApiError, api, whenSignedOut } from "@/lib/api";
import { restoreSession, signOut as endSession } from "@/lib/auth";
import { initial, reducer, type Action, type Record_ } from "./reducer";

export type Mode = "loading" | "signed-out" | "offline" | "live";

/** What GET /api/state answers (backend-design.md §4). */
interface ServerState {
  student: Student;
  goalIds: Partial<Record<SubjectId, string>>;
  claims: Claim[];
  checkIns: CheckIn[];
  experiences: Experience[];
  opened: string[];
  promptTakes: PromptTake[];
  messages: ChatMessage[];
  moreMessages: Partial<Record<SubjectId, boolean>>;
  usage: AiUsage;
}

export interface Actions {
  /** After Log in, Sign up or Google: load the record. */
  signedIn: () => Promise<void>;
  /** Try again after "Can't reach Trellis". */
  retry: () => Promise<void>;
  /** Pull to refresh: load the record again, keeping the subject on screen. */
  reload: () => Promise<void>;
  setSubject: (subjectId: SubjectId) => void;
  setGoal: (subjectId: SubjectId, goalId: string) => Promise<boolean>;
  addClaims: (claims: { topicId: string; claim: ClaimKind }[]) => Promise<boolean>;
  open: (topicId: string) => Promise<void>;
  editCheckIn: (checkIn: CheckIn) => Promise<void>;
  removeCheckIn: (id: string) => Promise<boolean>;
  editExperience: (experience: Experience) => Promise<void>;
  removeExperience: (id: string) => Promise<boolean>;
  tookPrompt: (topicId: string, via: PromptTake["via"]) => Promise<void>;
  rename: (name: string) => Promise<void>;
  requestSubject: (text: string) => Promise<void>;
  loadOlder: (subjectId: SubjectId) => Promise<void>;
  refreshUsage: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account. Throws ApiError (403 for a wrong password) for the screen to show. */
  deleteAccount: (password?: string) => Promise<void>;
}

export interface Store extends Record_ {
  mode: Mode;
  statuses: Map<string, Status>;
  goal: Goal | null;
  today: string;
  error: string | null;
  clearError: () => void;
  fail: (err: unknown) => void;
  dispatch: (a: Action) => void;
  act: Actions;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [record, dispatch] = useReducer(reducer, initial);
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState<string | null>(null);
  // The latest record, for actions that read it after an await.
  const latest = useRef(record);
  useEffect(() => {
    latest.current = record;
  });

  const fail = useCallback((err: unknown) => {
    setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
  }, []);

  // Stable, so the toast's 5-second timer (which depends on it) isn't restarted by every
  // change to the record (found in review).
  const clearError = useCallback(() => setError(null), []);

  const signedOut = useCallback(() => {
    dispatch({ type: "clear" });
    setMode("signed-out");
  }, []);

  /** Load the record. A network failure means offline, not signed out. */
  const load = useCallback(async () => {
    try {
      const s = await api<ServerState>("/state");
      // Keep the subject on screen if it has a goal, else open one that does.
      const current = latest.current.subjectId;
      const subjectId = s.goalIds[current] ? current : ((Object.keys(s.goalIds)[0] as SubjectId | undefined) ?? current);
      dispatch({ type: "hydrate", record: { ...s, subjectId } });
      setMode("live");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return signedOut();
      setMode((m) => (m === "live" ? m : "offline")); // a failed pull-to-refresh keeps the map
      fail(err);
    }
  }, [fail, signedOut]);

  const start = useCallback(async () => {
    const session = await restoreSession();
    if (session === "signed-in") return load();
    setMode(session);
  }, [load]);

  useEffect(() => {
    void start();
    // The server refused the session mid-use (logged out elsewhere, account deleted).
    whenSignedOut(signedOut);
    return () => whenSignedOut(null);
  }, [start, signedOut]);

  /** Runs a request; on failure shows the message and returns null. */
  const attempt = useCallback(
    async <T,>(request: () => Promise<T>): Promise<T | null> => {
      try {
        return await request();
      } catch (err) {
        fail(err);
        return null;
      }
    },
    [fail],
  );

  const act = useMemo<Actions>(
    () => ({
      signedIn: load,
      retry: start,
      reload: load,
      setSubject: (subjectId) => dispatch({ type: "subject", subjectId }),
      async setGoal(subjectId, goalId) {
        // PUT answers 204, so "worked" is "didn't throw": attempt() gives undefined, not null.
        if ((await attempt(() => api(`/goals/${subjectId}`, { method: "PUT", body: { goalId } }))) === null) return false;
        dispatch({ type: "goal", subjectId, goalId });
        return true;
      },
      async addClaims(claims) {
        const saved = await attempt(() => api<Claim[]>("/claims", { method: "POST", body: { claims } }));
        if (saved) dispatch({ type: "claims", claims: saved });
        return saved !== null;
      },
      async open(topicId) {
        if ((await attempt(() => api("/opened", { method: "POST", body: { topicId } }))) === null) return;
        dispatch({ type: "open", topicId });
      },
      async editCheckIn(c) {
        const saved = await attempt(() => api<CheckIn>(`/check-ins/${c.id}`, { method: "PATCH", body: { topicId: c.topicId, outcome: c.outcome, text: c.text } }));
        if (saved) dispatch({ type: "edit", checkIn: saved });
      },
      async removeCheckIn(id) {
        if ((await attempt(() => api(`/check-ins/${id}`, { method: "DELETE" }))) === null) return false;
        dispatch({ type: "remove", id });
        return true;
      },
      async editExperience(e) {
        // The server rebuilds the clean prompt line from the text itself.
        const saved = await attempt(() => api<Experience>(`/experiences/${e.id}`, { method: "PATCH", body: { text: e.text, kind: e.kind } }));
        if (saved) dispatch({ type: "editExperience", experience: saved });
      },
      async removeExperience(id) {
        if ((await attempt(() => api(`/experiences/${id}`, { method: "DELETE" }))) === null) return false;
        dispatch({ type: "removeExperience", id });
        return true;
      },
      async tookPrompt(topicId, via) {
        const take = await attempt(() => api<PromptTake>("/prompt-takes", { method: "POST", body: { topicId, via } }));
        if (take) dispatch({ type: "took", take });
      },
      async rename(name) {
        const student = await attempt(() => api<Student>("/me", { method: "PATCH", body: { name } }));
        if (student) dispatch({ type: "student", student });
      },
      async requestSubject(text) {
        await attempt(() => api("/subject-requests", { method: "POST", body: { text } }));
      },
      async loadOlder(subjectId) {
        const first = latest.current.messages.find((m) => m.subjectId === subjectId);
        if (!first) return;
        const page = await attempt(() => api<{ messages: ChatMessage[]; more: boolean }>(`/helper/${subjectId}/messages?before=${first.id}&limit=50`));
        if (page) dispatch({ type: "older", subjectId, ...page });
      },
      async refreshUsage() {
        // A meter that couldn't refresh isn't worth an error; the next helper reply brings new numbers.
        const usage = await api<AiUsage>("/usage").catch(() => null);
        if (usage) dispatch({ type: "usage", usage });
      },
      async signOut() {
        await endSession();
        signedOut();
      },
      async deleteAccount(password) {
        await api("/me", { method: "DELETE", body: password ? { password } : {} });
        await endSession(); // the server deleted the token with the account; forget our copy
        signedOut();
      },
    }),
    [attempt, load, start, signedOut],
  );

  const value = useMemo<Store>(() => {
    const goalId = record.goalIds[record.subjectId];
    return {
      ...record,
      mode,
      statuses: deriveStatuses(record.claims, record.checkIns),
      goal: goalId ? (goalById.get(goalId) ?? null) : null,
      today: new Date().toISOString().slice(0, 10),
      error,
      clearError,
      fail,
      dispatch,
      act,
    };
  }, [record, mode, error, act, fail, clearError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore needs <StoreProvider> above it (src/app/_layout.tsx)");
  return store;
}
