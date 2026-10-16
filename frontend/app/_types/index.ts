
// ─── Chat & Conversation Types ───────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;              // Unique message ID
  role: MessageRole;       // Who sent the message
  content: string;        // Message content
  time: string;           // Human-readable relative time (e.g. "Just now", "2h ago")
  createdAt?: string;     // ISO timestamp from the server
}

export interface Conversation {
  id: string;              // Unique conversation ID
  title: string;           // AI-generated or user-provided topic title
  preview: string;         // Snippet of the latest message for sidebar display
  time: string;           // Relative timestamp of last activity
  createdAt?: string;     // ISO timestamp of creation
  updatedAt?: string;     // ISO timestamp of last update
  messages: ChatMessage[]; // All messages belonging to this conversation
}

export interface WireMessage {
  role: MessageRole;
  content: string;
}

// ─── User Profile & Auth Types ───────────────────────────────────────────────

export interface jwtPayload {
  id: number;
  role: string;
  name: string;
  email: string;
  exp: number;
  iat: number;
}

export interface UserProfile {
  id?: number | string;
  name: string;
  initials: string;
  email: string;
  role?: string;
  joinedAt?: string;
  totalConversations?: number;
}

// ─── Settings & Notification Types ──────────────────────────────────────────

export type NotificationChannelId = "whatsapp" | "telegram" | "discord" | "email";

export interface NotificationChannel {
  id: NotificationChannelId;
  label: string;
  description: string;
  icon: string;
  setupLabel: string;
  setupPlaceholder: string;
}

export interface ChannelConfigState {
  enabled: boolean;
  configured: boolean;
  configValue: string;
}

export interface NotificationSettings {
  channels: Record<NotificationChannelId, ChannelConfigState>;
  reminderTime: string; // e.g. "20:00"
}

export interface PauseState {
  isPaused: boolean;
  resumeDate: string | null;
}
