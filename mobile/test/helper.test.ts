// The helper's requests (docs/mobile.md §5): every message, tap, save, cancel and undo goes
// to the server, and the store applies what it answers. Nothing is saved without Save.

import type { ChatMessage, Proposal } from "@shared/types";
import { helperActions } from "@/helper/actions";

const proposal: Proposal = { updates: [{ topicId: "rn-flatlist", outcome: "got" }], experiences: [], said: "got it" };
const withCard: ChatMessage = {
  id: "m1",
  subjectId: "react-native",
  at: "2026-11-21T10:00:00Z",
  role: "helper",
  text: "Save this?",
  cards: [{ type: "confirm", proposalId: "p9", proposal, state: "open" }],
};
/** A fake of the API's POST: the type the actions expect, the answer the test chose. */
type Post = <T>(path: string, body?: unknown) => Promise<T | null>;

const usage = { on: true, day: { usedPct: 10, resetsAt: "x" }, week: { usedPct: 5, resetsAt: "y" }, basic: null };

function setup(answer: unknown) {
  const post = jest.fn(async () => answer);
  const dispatch = jest.fn();
  const actions = helperActions({ post: post as unknown as Post, dispatch, messages: () => [withCard], subjectId: () => "react-native" });
  return { post, dispatch, actions };
}

it("sends a typed message and adds both messages and the new usage", async () => {
  const student: ChatMessage = { ...withCard, id: "s", role: "student", text: "I did FlatList", cards: undefined };
  const { post, dispatch, actions } = setup({ messages: [student, withCard], usage });
  await actions.say("  I did FlatList ");
  expect(post).toHaveBeenCalledWith("/helper/react-native/messages", { text: "I did FlatList" });
  expect(dispatch).toHaveBeenCalledWith({ type: "say", message: student });
  expect(dispatch).toHaveBeenCalledWith({ type: "say", message: withCard });
  expect(dispatch).toHaveBeenCalledWith({ type: "usage", usage });
});

it("sends nothing for an empty message", async () => {
  const { post, actions } = setup(null);
  await actions.say("   ");
  expect(post).not.toHaveBeenCalled();
});

it("sends a tap (Got it on a topic) as a pick", async () => {
  const { post, actions } = setup({ messages: [], usage });
  await actions.pick("got", ["rn-flatlist"], "Got it: FlatList");
  expect(post).toHaveBeenCalledWith("/helper/react-native/messages", { pick: { outcome: "got", topicIds: ["rn-flatlist"], label: "Got it: FlatList" } });
});

it("saves a confirm card by its proposal id, with the student's edits, and applies the answer", async () => {
  const answer = { message: withCard, followUp: { ...withCard, id: "f" }, checkIns: [], experiences: [] };
  const { post, dispatch, actions } = setup(answer);
  const edited = { ...proposal, updates: [{ topicId: "rn-flatlist", outcome: "partly" as const }] };
  await actions.save("m1", 0, edited);
  expect(post).toHaveBeenCalledWith("/helper/proposals/p9/save", { proposal: edited });
  expect(dispatch).toHaveBeenCalledWith({ type: "saved", ...answer });
});

it("undoes a saved card and passes on what the undo removed", async () => {
  const saved: ChatMessage = { ...withCard, cards: [{ type: "confirm", proposalId: "p9", proposal, state: "saved", saved: { checkIns: ["c1"], experiences: [] } }] };
  const post = jest.fn(async (..._args: unknown[]) => ({ message: saved }));
  const dispatch = jest.fn();
  await helperActions({ post: post as unknown as Post, dispatch, messages: () => [saved], subjectId: () => "react-native" }).undo("m1", 0);
  expect(post.mock.calls[0]).toEqual(["/helper/proposals/p9/undo"]);
  expect(dispatch).toHaveBeenCalledWith({ type: "message", message: saved, removed: { checkIns: ["c1"], experiences: [] } });
});

it("does nothing for a card that has no proposal id", async () => {
  const { post, actions } = setup(null);
  await actions.cancel("missing", 0);
  expect(post).not.toHaveBeenCalled();
});
