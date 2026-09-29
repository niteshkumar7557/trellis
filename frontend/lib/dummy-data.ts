// Dummy data — replace with real API calls when backend is ready.

export interface DummyMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
}

export interface DummyConversation {
  uid: string;
  title: string;
  preview: string;
  time: string;
  messages: DummyMessage[];
}

export interface DummyGoal {
  uid: string;
  title: string;
  subject: string;
  progress: number; // 0–100
  status: "active" | "completed" | "paused";
  updatedAt: string;
  description: string;
}

export const DUMMY_CONVERSATIONS: DummyConversation[] = [
  {
    uid: "conv-001",
    title: "DNS finally clicked",
    preview: "I read through the DNS resolver flow today and it actually makes sense now.",
    time: "2h ago",
    messages: [
      { id: 1, role: "user", content: "I read through the DNS resolver flow today and it actually makes sense now. The recursive vs iterative lookup was the part that confused me before.", time: "2h ago" },
      { id: 2, role: "assistant", content: "That's great progress! The recursive/iterative distinction trips up a lot of people. Quick check — can you explain why a stub resolver typically uses recursive queries while nameservers use iterative ones?", time: "2h ago" },
      { id: 3, role: "user", content: "I think it's because the client just wants an answer and doesn't want to chase referrals itself? The nameserver does the chasing.", time: "2h ago" },
      { id: 4, role: "assistant", content: "Exactly right. The stub resolver delegates the work. Tomorrow, try tracing a real DNS query with `dig +trace example.com` — it'll make the iterative chain concrete. One concept at a time.", time: "2h ago" },
    ],
  },
  {
    uid: "conv-002",
    title: "Congestion control confusion",
    preview: "Tried TCP congestion control, didn't really get slow-start.",
    time: "Yesterday",
    messages: [
      { id: 5, role: "user", content: "Tried TCP congestion control today. I sort of get the idea but slow-start is confusing — why does it start slow if it's growing exponentially?", time: "Yesterday" },
      { id: 6, role: "assistant", content: "Great question — the name is misleading! 'Slow-start' refers to starting from a *small* window (1-2 segments), not to growing slowly. The window doubles every RTT, so it's actually quite aggressive. It's 'slow' compared to just blasting at full link speed from the start.", time: "Yesterday" },
      { id: 7, role: "user", content: "Oh okay, that makes more sense. So when does it stop doubling?", time: "Yesterday" },
      { id: 8, role: "assistant", content: "It stops doubling when the congestion window hits the *ssthresh* (slow-start threshold). After that, it switches to congestion avoidance — linear growth of +1 segment per RTT. If a packet is lost, ssthresh is halved, and it restarts. Try drawing the sawtooth graph — it'll click.", time: "Yesterday" },
    ],
  },
  {
    uid: "conv-003",
    title: "Starting UDP deep-dive",
    preview: "I want to really master just the UDP protocol first.",
    time: "2 days ago",
    messages: [
      { id: 9, role: "user", content: "I want to really master just the UDP protocol first before moving to TCP. Where should I start?", time: "2 days ago" },
      { id: 10, role: "assistant", content: "Smart move — UDP is simpler and gives you the baseline for understanding what TCP adds on top. Start with the UDP header: source port, dest port, length, checksum. That's it — just 8 bytes. Then explore *why* it's connectionless and what that means for applications like DNS and video streaming.", time: "2 days ago" },
    ],
  },
  {
    uid: "conv-004",
    title: "OSI model overview",
    preview: "Quick refresher on all seven layers — what's actually important?",
    time: "4 days ago",
    messages: [
      { id: 11, role: "user", content: "Quick refresher on all seven layers — what's actually important for exams vs real life?", time: "4 days ago" },
      { id: 12, role: "assistant", content: "For exams: know all 7 layers and their protocols. For real life: focus on layers 3 (Network — IP), 4 (Transport — TCP/UDP), and 7 (Application — HTTP, DNS). Layers 1-2 matter for networking hardware roles, layers 5-6 are mostly absorbed into layer 7 in practice. Don't skip the theory though — GATE loves OSI questions.", time: "4 days ago" },
    ],
  },
  {
    uid: "conv-005",
    title: "HTTP/2 vs HTTP/3",
    preview: "What exactly changed with QUIC and why does it matter?",
    time: "1 week ago",
    messages: [
      { id: 13, role: "user", content: "What exactly changed with QUIC and HTTP/3? Why does it matter?", time: "1 week ago" },
      { id: 14, role: "assistant", content: "The big shift: HTTP/3 runs over QUIC (UDP-based) instead of TCP. This eliminates head-of-line blocking at the transport layer — if one stream's packet is lost, the others aren't held up. It also bakes in TLS 1.3, so the handshake is faster (often 0-RTT). Practically, pages load faster on lossy networks like mobile.", time: "1 week ago" },
    ],
  },
];

export const DUMMY_GOALS: DummyGoal[] = [
  {
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
