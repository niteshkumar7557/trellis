/**
 * =============================================================================
 * TRELLIS BACKEND API SERVICE
 * =============================================================================
 * This file contains ONLY the specific backend routes requested:
 * 
 * 1. POST /api/conversations              -> User posts first message of a new convo
 *                                            (Backend saves title in DB & generates AI response)
 * 2. POST /api/conversations/:id/messages -> User posts message to a specific conv-id
 *                                            (Backend appends message & generates AI response)
 * 3. GET  /api/sidebar                    -> Fetch sidebar data from ONLY ONE route (convs & goals)
 * 4. GET  /api/conversations/:id          -> Fetch conversation of a specific conv-id
 * 5. GET  /api/conversations              -> Fetch all convos
 * 6. GET  /api/goals                      -> Fetch all goals
 * 7. GET  /api/goals/:id                  -> Fetch specific goal-id data (with activity feed)
 * 8. GET  /api/profile                    -> Fetch profile data
 * 9. GET  /api/settings                   -> Fetch settings info
 * 10. POST /api/auth/signout              -> Sign-out route
 * 11. POST /api/auth                      -> 1 unified backend route for register & login
 *                                            (Backend checks if user exists or not)
 * 
 * ⏱️ CHAT WAITING DURATION:
 * Dummy 4 seconds wait time while waiting for backend response.
 * =============================================================================
 */

import type {
  Conversation,
  Goal,
  GoalDetail,
  UserProfile,
  SidebarData,
  SettingsData,
  AuthResponse,
  ChatMessage,
} from "./types";

import {
  DUMMY_CONVERSATIONS,
  DUMMY_GOALS,
  DUMMY_ACTIVITY,
  DUMMY_USER,
  DUMMY_SETTINGS,
} from "./dummy-data";

// Base URL for the Express backend
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

// ⏱️ Dummy 4 seconds wait time requested for chat UI waiting state
export const DUMMY_CHAT_WAIT_MS = 4000;

export async function waitDummyDelay(ms: number = DUMMY_CHAT_WAIT_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic safe fetch helper for backend communication.
 * When the server is unreachable or offline, it falls back gracefully
 * so the frontend UI stays responsive and error-free.
 */
async function requestBackend<T>(
  endpoint: string,
  options: RequestInit = {},
  fallback: T
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      console.warn(
        `[Trellis API] ${options.method || "GET"} ${endpoint} returned status ${response.status}. Using fallback data.`
      );
      return fallback;
    }

    const data = await response.json();
    return data as T;
  } catch (err) {
    console.info(
      `[Trellis API] Backend offline at ${url}. Using fallback data. (Ensure backend runs at ${API_BASE_URL}).`,
      err instanceof Error ? err.message : err
    );
    return fallback;
  }
}

// =============================================================================
// BACKEND API CLIENT (ONLY SPECIFIED ROUTES)
// =============================================================================

export const api = {
  // ─── 1. Conversations & Chat ────────────────────────────────────────────────
  conversations: {
    /**
     * 🔗 BACKEND ROUTE: POST /api/conversations
     * Purpose: User posts first message on a new conversation.
     *          Backend generates a smart title, saves it in DB, generates AI response,
     *          and returns the created conversation thread.
     * Request Body: { message: string }
     * Expected Response: Conversation object { id, title, preview, messages: [...] }
     */
    async create(message: string): Promise<Conversation> {
      const newId = `conv-${Date.now()}`;
      const fallback: Conversation = {
        id: newId,
        title: message.slice(0, 30) + (message.length > 30 ? "…" : ""),
        preview: message,
        time: "Just now",
        updatedAt: "Just now",
        messages: [
          {
            id: `msg-${Date.now()}`,
            role: "user",
            content: message,
            time: "Just now",
          },
          {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content:
              "I received your study update! When your backend is running, the real AI response from Express will appear here.",
            time: "Just now",
          },
        ],
      };

      return requestBackend<Conversation>(
        "/api/conversations",
        {
          method: "POST",
          body: JSON.stringify({ message }),
        },
        fallback
      );
    },

    /**
     * 🔗 BACKEND ROUTE: POST /api/conversations/:id/messages
     * Purpose: User posts a message on a specific conv-id.
     *          Backend saves the user message, generates AI response, and saves it.
     * Request Body: { content: string }
     * Expected Response: { assistantMessage: ChatMessage } or updated Conversation
     */
    async sendMessage(
      conversationId: string,
      content: string
    ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
      const fallback: { userMessage: ChatMessage; assistantMessage: ChatMessage } = {
        userMessage: {
          id: `msg-${Date.now()}`,
          role: "user",
          content,
          time: "Just now",
        },
        assistantMessage: {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content:
            "Got it! Precision study prompt and direction will be returned by your backend.",
          time: "Just now",
        },
      };

      return requestBackend<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
        fallback
      );
    },

    /**
     * 🔗 BACKEND ROUTE: GET /api/conversations/:id
     * Purpose: Fetch conversation data and historical messages for a specific conv-id.
     * Expected Response: Conversation { id, title, preview, time, messages: [...] }
     */
    async get(id: string): Promise<Conversation | null> {
      const fallback =
        DUMMY_CONVERSATIONS.find((c) => c.id === id || c.uid === id) || null;

      return requestBackend<Conversation | null>(
        `/api/conversations/${encodeURIComponent(id)}`,
        { method: "GET" },
        fallback
      );
    },

    /**
     * 🔗 BACKEND ROUTE: GET /api/conversations
     * Purpose: Fetch all user conversations (archive list).
     * Expected Response: Array of Conversation objects: [{ id, title, preview, time, messages }]
     */
    async list(): Promise<Conversation[]> {
      return requestBackend<Conversation[]>(
        "/api/conversations",
        { method: "GET" },
        DUMMY_CONVERSATIONS
      );
    },
  },

  // ─── 2. Sidebar Route (ONE SINGLE ROUTE) ────────────────────────────────────
  sidebar: {
    /**
     * 🔗 BACKEND ROUTE: GET /api/sidebar
     * Purpose: Fetch ALL sidebar data from a SINGLE route (conversations and goals).
     * Expected Response: { conversations: Conversation[], goals: Goal[], user?: UserProfile }
     */
    async get(): Promise<SidebarData> {
      const fallback: SidebarData = {
        conversations: DUMMY_CONVERSATIONS,
        goals: DUMMY_GOALS,
        user: DUMMY_USER,
      };

      return requestBackend<SidebarData>(
        "/api/sidebar",
        { method: "GET" },
        fallback
      );
    },
  },

  // ─── 3. Goals ───────────────────────────────────────────────────────────────
  goals: {
    /**
     * 🔗 BACKEND ROUTE: GET /api/goals
     * Purpose: Fetch all user goals.
     * Expected Response: Array of Goal objects: [{ id, title, subject, progress, status, updatedAt, description }]
     */
    async list(): Promise<Goal[]> {
      return requestBackend<Goal[]>(
        "/api/goals",
        { method: "GET" },
        DUMMY_GOALS
      );
    },

    /**
     * 🔗 BACKEND ROUTE: GET /api/goals/:id
     * Purpose: Fetch a specific goal-id's data including recent activity check-ins.
     * Expected Response: GoalDetail object { id, title, progress, activity: [...] }
     */
    async get(id: string): Promise<GoalDetail | null> {
      const foundGoal = DUMMY_GOALS.find((g) => g.id === id || g.uid === id);
      const fallback: GoalDetail | null = foundGoal
        ? { ...foundGoal, activity: DUMMY_ACTIVITY }
        : null;

      return requestBackend<GoalDetail | null>(
        `/api/goals/${encodeURIComponent(id)}`,
        { method: "GET" },
        fallback
      );
    },
  },

  // ─── 4. Profile ─────────────────────────────────────────────────────────────
  profile: {
    /**
     * 🔗 BACKEND ROUTE: GET /api/profile
     * Purpose: Fetch authenticated user profile data & study stats.
     * Expected Response: UserProfile object { name, initials, email, joinedAt, totalGoals, ... }
     */
    async get(): Promise<UserProfile> {
      return requestBackend<UserProfile>(
        "/api/profile",
        { method: "GET" },
        DUMMY_USER
      );
    },
  },

  // ─── 5. Settings ────────────────────────────────────────────────────────────
  settings: {
    /**
     * 🔗 BACKEND ROUTE: GET /api/settings
     * Purpose: Fetch settings info (user details, pause status, notification options).
     * Expected Response: SettingsData object { user, isPaused, resumeDate, notifications }
     */
    async get(): Promise<SettingsData> {
      return requestBackend<SettingsData>(
        "/api/settings",
        { method: "GET" },
        DUMMY_SETTINGS
      );
    },
  },

  // ─── 6. Authentication (1 Unified Route + Sign-out) ─────────────────────────
  auth: {
    /**
     * 🔗 BACKEND ROUTE: POST /api/auth
     * Purpose: 1 backend route for register and login!
     *          Backend checks if the user already exists or not:
     *          - If exists -> validates password & logs in
     *          - If does not exist -> creates user & registers
     * Request Body: { email: string, password: string, name?: string }
     * Expected Response: { user: UserProfile, token: string }
     */
    async authenticate(credentials: {
      email: string;
      password: string;
      name?: string;
    }): Promise<AuthResponse> {
      const fallback: AuthResponse = {
        user: {
          ...DUMMY_USER,
          name: credentials.name || DUMMY_USER.name,
          email: credentials.email,
          initials: (credentials.name || credentials.email).slice(0, 2).toUpperCase(),
        },
        token: "mock-jwt-token",
      };

      return requestBackend<AuthResponse>(
        "/api/auth",
        {
          method: "POST",
          body: JSON.stringify(credentials),
        },
        fallback
      );
    },

    /**
     * 🔗 BACKEND ROUTE: POST /api/auth/signout
     * Purpose: Signs out user session on the backend.
     * Expected Response: { success: boolean }
     */
    async signout(): Promise<{ success: boolean }> {
      return requestBackend<{ success: boolean }>(
        "/api/auth/signout",
        { method: "POST" },
        { success: true }
      );
    },
  },
};
