import type { ChatMessage, CheckIn, Claim, ClaimKind, Experience, Student } from "../types";

// Sample student for the build without a backend. Replace with the API.
// The topics are real (see ./react-native.ts and ./redis.ts); this history is made up.
export const TODAY = "2026-11-03";

export const student: Student = {
  id: "nitesh",
  name: "Nitesh",
  email: "nitesh.k@students.local",
  joinedAt: "2026-10-12",
  hasPassword: true,
  goals: [
    { subjectId: "react-native", goalId: "goal-rn-first-app", since: "2026-10-12" },
  ],
};

function claims(at: string, list: [string, ClaimKind][]): Claim[] {
  return list.map(([topicId, claim]) => ({ topicId, claim, at }));
}

/** What Nitesh said at the sort, one answer per big topic. Held loosely.
 *  Redis is left untouched on purpose: no goal, no sort, no check-ins, so it starts from zero. */
export const sampleClaims: Claim[] = [
  ...claims("2026-10-12", [
    ["rn-intro", "know"], ["rn-prereq", "know"], ["rn-react", "shaky"], ["rn-env", "new"],
    ["rn-workflow", "new"], ["rn-core", "new"], ["rn-lists", "new"], ["rn-styling", "new"],
    ["rn-platform", "new"], ["rn-network", "new"], ["rn-interactions", "new"], ["rn-storage", "new"],
    ["rn-publish", "new"],
  ]),
];

/** Every status change, oldest first. Statuses are derived from these. */
export const sampleCheckIns: CheckIn[] = [
  { id: "c01", at: "2026-10-13T20:10:00+05:30", topicId: "rn-expo", outcome: "got",
    text: "read what expo actually is. it's tooling around react native, not a different framework" },
  { id: "c02", at: "2026-10-13T21:30:00+05:30", topicId: "rn-create-expo", outcome: "got",
    text: "made my first project with create-expo-app" },
  { id: "c03", at: "2026-10-14T19:40:00+05:30", topicId: "rn-device", outcome: "stuck",
    text: "app won't open on my phone, it just spins after scanning the qr code" },
  { id: "c04", at: "2026-10-14T22:15:00+05:30", topicId: "rn-device", outcome: "got",
    text: "phone and laptop were on different wifi. works now" },
  { id: "c05", at: "2026-10-16T20:30:00+05:30", topicId: "rn-fast-refresh", outcome: "got",
    text: "fast refresh, edits show up instantly" },
  { id: "c06", at: "2026-10-16T21:05:00+05:30", topicId: "rn-devmenu", outcome: "got",
    text: "found the shake menu, reload and debugger are there" },
  { id: "c07", at: "2026-10-17T21:20:00+05:30", topicId: "rn-logbox", outcome: "got",
    text: "logbox red screens, read the stack trace instead of panicking" },
  { id: "c08", at: "2026-10-19T19:50:00+05:30", topicId: "rn-jsx", outcome: "got",
    text: "jsx properly this time, braces for expressions" },
  { id: "c09", at: "2026-10-19T21:00:00+05:30", topicId: "rn-components", outcome: "got",
    text: "components and composing small ones" },
  { id: "c10", at: "2026-10-20T21:40:00+05:30", topicId: "rn-props", outcome: "stuck",
    text: "why can't I change a prop inside the child component" },
  { id: "c11", at: "2026-10-21T19:30:00+05:30", topicId: "rn-components", outcome: "got",
    text: "went back over components, the parent is the one rendering the child" },
  { id: "c12", at: "2026-10-21T21:10:00+05:30", topicId: "rn-props", outcome: "got",
    text: "props flow down, callbacks flow up" },
  { id: "c13", at: "2026-10-23T20:00:00+05:30", topicId: "rn-view", outcome: "got",
    text: "views and nesting them" },
  { id: "c14", at: "2026-10-23T20:45:00+05:30", topicId: "rn-text", outcome: "got",
    text: "text and how styles nest inside it" },
  { id: "c15", at: "2026-10-24T21:15:00+05:30", topicId: "rn-pressable", outcome: "got",
    text: "pressable with a pressed style" },
  { id: "c16", at: "2026-10-25T20:20:00+05:30", topicId: "rn-image", outcome: "partly",
    text: "local images fine, remote image just doesn't show up" },
  { id: "c17", at: "2026-10-26T21:00:00+05:30", topicId: "rn-button", outcome: "got",
    text: "button, and why I can't really style it" },
  { id: "c18", at: "2026-10-27T20:35:00+05:30", topicId: "rn-safearea", outcome: "got",
    text: "safe area so nothing hides under the notch" },
  { id: "c19", at: "2026-10-28T21:25:00+05:30", topicId: "rn-scrollview", outcome: "got",
    text: "scrollview, fine for short screens" },
  { id: "c20", at: "2026-10-30T22:06:40+05:30", topicId: "rn-flatlist", outcome: "stuck",
    text: "my flatlist doesn't update when I add an item", messageId: "m04" },
  { id: "c22", at: "2026-11-01T21:30:00+05:30", topicId: "rn-textinput", outcome: "partly",
    text: "text input sort of works but it resets when I type" },
];

/** What Nitesh said about how things went: what felt easy, what was hard, what made it click. */
export const sampleExperiences: Experience[] = [
  { id: "e01", at: "2026-10-14T19:41:00+05:30", topicId: "rn-device", kind: "hard",
    text: "why the phone can't reach the dev server", line: "Why the phone can't reach the dev server." },
  { id: "e02", at: "2026-10-14T22:16:00+05:30", topicId: "rn-device", kind: "clicked",
    text: "the phone loads the code from my laptop, so they need the same network",
    line: "The phone loads the code from my laptop, so they need the same network." },
  { id: "e03", at: "2026-10-19T21:01:00+05:30", topicId: "rn-components", kind: "easy",
    text: "splitting a screen into small pieces felt natural", line: "Splitting a screen into small pieces felt natural." },
  { id: "e04", at: "2026-10-20T21:41:00+05:30", topicId: "rn-props", kind: "hard",
    text: "how the child is supposed to change something it was given",
    line: "How the child is supposed to change something it was given." },
  { id: "e05", at: "2026-10-21T21:11:00+05:30", topicId: "rn-props", kind: "clicked",
    text: "the parent owns the data; the child calls a function the parent passed down",
    line: "The parent owns the data; the child calls a function the parent passed down." },
  { id: "e06", at: "2026-10-25T20:21:00+05:30", topicId: "rn-image", kind: "hard",
    text: "remote image doesn't show up", line: "A remote image doesn't show up." },
  { id: "e07", at: "2026-10-28T21:26:00+05:30", topicId: "rn-scrollview", kind: "easy",
    text: "fine for short screens, just wrap the content", line: "Fine for short screens; just wrap the content." },
  { id: "e08", at: "2026-10-30T22:06:30+05:30", topicId: "rn-flatlist", kind: "hard",
    text: "I push the new item into the array and nothing re-renders",
    line: "I push the new item into the array and nothing re-renders.", messageId: "m04" },
  { id: "e09", at: "2026-11-01T21:31:00+05:30", topicId: "rn-textinput", kind: "hard",
    text: "it resets when I type", line: "It resets when I type." },
];

/** The helper conversation so far. Older history came in before the helper existed. */
const flatlistStuck = {
  updates: [{ topicId: "rn-flatlist", outcome: "stuck" as const }],
  experiences: [] as Experience[],
  said: "my flatlist doesn't update when I add an item",
};

export const sampleMessages: ChatMessage[] = [
  { id: "m01", subjectId: "react-native", at: "2026-10-30T22:05:00+05:30", role: "student",
    text: "my flatlist doesn't update when I add an item" },
  { id: "m02", subjectId: "react-native", at: "2026-10-30T22:05:02+05:30", role: "helper",
    text: "Sounds like you're stuck on FlatList. What's confusing about it?",
    asks: { kind: "hard", pending: flatlistStuck } },
  { id: "m03", subjectId: "react-native", at: "2026-10-30T22:06:30+05:30", role: "student",
    text: "I push the new item into the array and nothing re-renders" },
  { id: "m04", subjectId: "react-native", at: "2026-10-30T22:06:32+05:30", role: "helper",
    text: "Here's what I'll save. Change anything that's wrong.",
    cards: [{
      type: "confirm",
      state: "saved",
      saved: { checkIns: ["c20"], experiences: ["e08"] },
      proposal: {
        ...flatlistStuck,
        experiences: [{ topicId: "rn-flatlist", kind: "hard",
          text: "I push the new item into the array and nothing re-renders",
          line: "I push the new item into the array and nothing re-renders." }],
      },
    }] },
  { id: "m05", subjectId: "react-native", at: "2026-10-30T22:06:41+05:30", role: "helper",
    text: "Saved. You may be stuck because of State: FlatList needs it, and you said React basics was shaky. Here's a prompt that starts there.",
    cards: [{ type: "prompt", topicId: "rn-state" }] },
];
