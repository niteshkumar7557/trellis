/**
 * =============================================================================
 * FALLBACK / SEED DATA FOR TRELLIS
 * =============================================================================
 * This file contains default development and offline fallback data.
 * When the backend API is online, data is fetched live from your Express/PostgreSQL
 * endpoints (via `lib/api.ts`).
 * If the backend is unreachable or not yet populated, `lib/api.ts` gracefully
 * falls back to these records so the UI remains interactive and error-free.
 * 
 * 🔗 BACKEND INTEGRATION NOTE:
 * You can seed your PostgreSQL database with the exact structures below!
 * =============================================================================
 */

import type {
  Conversation,
  Goal,
  GoalActivity,
  Subject,
  UserProfile,
  NotificationSettings,
  PauseState,
} from "./types";

// ─── Default Conversations ───────────────────────────────────────────────────

export const DUMMY_CONVERSATIONS: (Conversation & { uid: string })[] = [
  {
    id: "conv-001",
    uid: "conv-001",
    title: "DNS finally clicked",
    preview: "I read through the DNS resolver flow today and it actually makes sense now.",
    time: "2h ago",
    updatedAt: "Today",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "I read through the DNS resolver flow today and it actually makes sense now. The recursive vs iterative lookup was the part that confused me before.",
        time: "2h ago",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "That's great progress! The recursive/iterative distinction trips up a lot of people. Quick check — can you explain why a stub resolver typically uses recursive queries while nameservers use iterative ones?",
        time: "2h ago",
      },
      {
        id: "msg-3",
        role: "user",
        content: "I think it's because the client just wants an answer and doesn't want to chase referrals itself? The nameserver does the chasing.",
        time: "2h ago",
      },
      {
        id: "msg-4",
        role: "assistant",
        content: "Exactly right. The stub resolver delegates the work. Tomorrow, try tracing a real DNS query with `dig +trace example.com` — it'll make the iterative chain concrete. One concept at a time.",
        time: "2h ago",
      },
    ],
  },
  {
    id: "conv-002",
    uid: "conv-002",
    title: "Congestion control confusion",
    preview: "Tried TCP congestion control, didn't really get slow-start.",
    time: "Yesterday",
    updatedAt: "Yesterday",
    messages: [
      {
        id: "msg-5",
        role: "user",
        content: "Tried TCP congestion control today. I sort of get the idea but slow-start is confusing — why does it start slow if it's growing exponentially?",
        time: "Yesterday",
      },
      {
        id: "msg-6",
        role: "assistant",
        content: "Great question — the name is misleading! 'Slow-start' refers to starting from a *small* window (1-2 segments), not to growing slowly. The window doubles every RTT, so it's actually quite aggressive. It's 'slow' compared to just blasting at full link speed from the start.",
        time: "Yesterday",
      },
      {
        id: "msg-7",
        role: "user",
        content: "Oh okay, that makes more sense. So when does it stop doubling?",
        time: "Yesterday",
      },
      {
        id: "msg-8",
        role: "assistant",
        content: "It stops doubling when the congestion window hits the *ssthresh* (slow-start threshold). After that, it switches to congestion avoidance — linear growth of +1 segment per RTT. If a packet is lost, ssthresh is halved, and it restarts. Try drawing the sawtooth graph — it'll click.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "conv-003",
    uid: "conv-003",
    title: "Starting UDP deep-dive",
    preview: "I want to really master just the UDP protocol first.",
    time: "2 days ago",
    updatedAt: "2 days ago",
    messages: [
      {
        id: "msg-9",
        role: "user",
        content: "I want to really master just the UDP protocol first before moving to TCP. Where should I start?",
        time: "2 days ago",
      },
      {
        id: "msg-10",
        role: "assistant",
        content: "Smart move — UDP is simpler and gives you the baseline for understanding what TCP adds on top. Start with the UDP header: source port, dest port, length, checksum. That's it — just 8 bytes. Then explore *why* it's connectionless and what that means for applications like DNS and video streaming.",
        time: "2 days ago",
      },
    ],
  },
  {
    id: "conv-004",
    uid: "conv-004",
    title: "OSI model overview",
    preview: "Quick refresher on all seven layers — what's actually important?",
    time: "4 days ago",
    updatedAt: "4 days ago",
    messages: [
      {
        id: "msg-11",
        role: "user",
        content: "Quick refresher on all seven layers — what's actually important for exams vs real life?",
        time: "4 days ago",
      },
      {
        id: "msg-12",
        role: "assistant",
        content: "For exams: know all 7 layers and their protocols. For real life: focus on layers 3 (Network — IP), 4 (Transport — TCP/UDP), and 7 (Application — HTTP, DNS). Layers 1-2 matter for networking hardware roles, layers 5-6 are mostly absorbed into layer 7 in practice. Don't skip the theory though — GATE loves OSI questions.",
        time: "4 days ago",
      },
    ],
  },
  {
    id: "conv-005",
    uid: "conv-005",
    title: "HTTP/2 vs HTTP/3",
    preview: "What exactly changed with QUIC and why does it matter?",
    time: "1 week ago",
    updatedAt: "1 week ago",
    messages: [
      {
        id: "msg-13",
        role: "user",
        content: "What exactly changed with QUIC and HTTP/3? Why does it matter?",
        time: "1 week ago",
      },
      {
        id: "msg-14",
        role: "assistant",
        content: "The big shift: HTTP/3 runs over QUIC (UDP-based) instead of TCP. This eliminates head-of-line blocking at the transport layer — if one stream's packet is lost, the others aren't held up. It also bakes in TLS 1.3, so the handshake is faster (often 0-RTT). Practically, pages load faster on lossy networks like mobile.",
        time: "1 week ago",
      },
    ],
  },
];

// ─── Default Goals ───────────────────────────────────────────────────────────

export const DUMMY_GOALS: (Goal & { uid: string })[] = [
  {
    id: "goal-001",
    uid: "goal-001",
    title: "Master Computer Networks",
    subject: "Computer Networks",
    progress: 42,
    status: "active",
    updatedAt: "Today",
    description:
      "Deep understanding of networking fundamentals: DNS, TCP/IP, UDP, HTTP, and beyond. Focus on practical intuition, not just definitions.",
  },
  {
    id: "goal-002",
    uid: "goal-002",
    title: "Crack Data Structures & Algorithms",
    subject: "DSA",
    progress: 68,
    status: "active",
    updatedAt: "Yesterday",
    description:
      "Arrays, trees, graphs, dynamic programming — thorough preparation for coding interviews with consistent daily practice.",
  },
  {
    id: "goal-003",
    uid: "goal-003",
    title: "Operating Systems for GATE",
    subject: "Operating Systems",
    progress: 25,
    status: "active",
    updatedAt: "3 days ago",
    description:
      "Processes, threads, scheduling, memory management, file systems. Target: strong conceptual base for GATE CS 2027.",
  },
  {
    id: "goal-004",
    uid: "goal-004",
    title: "Linear Algebra Refresh",
    subject: "Mathematics",
    progress: 100,
    status: "completed",
    updatedAt: "2 weeks ago",
    description:
      "Vectors, matrices, eigenvalues — the core ideas behind ML math. Goal fully achieved.",
  },
];

// ─── Default Goal Activity ───────────────────────────────────────────────────

export const DUMMY_ACTIVITY: GoalActivity[] = [
  { id: 1, date: "Today", note: "Studied DNS resolver flow — it finally clicked." },
  { id: 2, date: "Yesterday", note: "Tried TCP congestion control. Slow-start still fuzzy." },
  { id: 3, date: "2 days ago", note: "Read UDP vs TCP overview. Good conceptual base." },
  { id: 4, date: "4 days ago", note: "Started OSI model revision." },
];

// ─── Default User Profile ────────────────────────────────────────────────────

export const DUMMY_USER: UserProfile = {
  name: "Nitesh Kumar",
  initials: "NK",
  email: "nitesh@example.com",
  joinedAt: "September 2026",
  totalGoals: 4,
  activeGoals: 3,
  completedGoals: 1,
  totalConversations: 5,
};

// ─── Default Subjects Available at Launch ────────────────────────────────────

export const DUMMY_AVAILABLE_SUBJECTS: Subject[] = [
  { id: "networking", name: "Computer Networking", topicCount: 24, description: "Protocols, routing, TCP/IP, and application layer." },
  { id: "react", name: "React", topicCount: 18, description: "Component architecture, hooks, rendering lifecycle, and state." },
  { id: "dbms", name: "DBMS · PostgreSQL", topicCount: 21, description: "Relational modeling, indexing, transactions, and SQL queries." },
  { id: "express", name: "Backend · Express", topicCount: 15, description: "REST architecture, middleware, routing, and error handling." },
  { id: "dsa", name: "Data Structures & Algorithms", topicCount: 40, description: "Core data structures, algorithm analysis, and problem patterns." },
  { id: "os", name: "Operating Systems", topicCount: 28, description: "Processes, virtual memory, concurrency, and file systems." },
];

// ─── Default Topics for Networking ──────────────────────────────────────────

export const DUMMY_TOPICS: string[] = [
  "OSI Model",
  "TCP/IP Stack",
  "IP Addressing & Subnetting",
  "ARP & RARP",
  "DNS",
  "HTTP & HTTPS",
  "TCP — Connection & Teardown",
  "UDP",
  "Sliding Window Protocol",
  "Congestion Control",
  "Retransmission Timeouts",
  "Routing Algorithms",
  "OSPF & BGP",
  "NAT & PAT",
  "Firewalls & Packet Filtering",
];

// ─── Default Pause State ─────────────────────────────────────────────────────

export const DUMMY_PAUSE_STATE: PauseState = {
  isPaused: false,
  resumeDate: null,
};

// ─── Default Notification Settings ───────────────────────────────────────────

export const DUMMY_NOTIFICATION_SETTINGS: NotificationSettings = {
  reminderTime: "20:00",
  channels: {
    whatsapp: { enabled: false, configured: false, configValue: "" },
    telegram: { enabled: false, configured: false, configValue: "" },
    discord: { enabled: false, configured: false, configValue: "" },
    email: { enabled: true, configured: true, configValue: "nitesh@example.com" },
  },
};

export const DUMMY_SETTINGS = {
  user: DUMMY_USER,
  isPaused: false,
  resumeDate: null,
  notifications: {
    whatsapp: false,
    telegram: false,
    discord: false,
    email: true,
  },
};

