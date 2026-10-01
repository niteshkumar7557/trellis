/**
 * =============================================================================
 * TRELLIS FRONTEND TYPES
 * =============================================================================
 * Unified data models for the Trellis / Kero application.
 * All data interfaces match the exact backend JSON schemas.
 * =============================================================================
 */

// ─── Chat & Conversation Types ───────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

/**
 * A single message inside a conversation.
 * 🔗 Backend model: Maps to table `messages` in DB.
 */
export interface ChatMessage {
  id: string;              // Unique message ID (UUID or string)
  role: MessageRole;       // Who sent the message
  content: string;        // Markdown or plain text message content
  time: string;           // Human-readable relative time (e.g. "Just now", "2h ago")
  createdAt?: string;     // ISO timestamp from the server
}

/**
 * A conversation thread with Kero.
 * 🔗 Backend model: Maps to table `conversations` in DB.
 */
export interface Conversation {
  id: string;              // Unique conversation ID (UUID or slug like "conv-001")
  title: string;           // AI-generated or user-provided topic title (stored in DB)
  preview: string;         // Snippet of the latest message for sidebar display
  time: string;           // Relative timestamp of last activity (e.g. "Today", "Yesterday")
  updatedAt?: string;     // ISO timestamp of last update
  messages: ChatMessage[]; // All messages belonging to this conversation
}

export interface WireMessage {
  role: MessageRole;
  content: string;
}

// ─── Goal & Activity Types ───────────────────────────────────────────────────

export type GoalStatus = "active" | "completed" | "paused";

/**
 * A user's study goal.
 * 🔗 Backend model: Maps to table `goals` in DB.
 */
export interface Goal {
  id: string;              // Unique goal ID (e.g. "goal-001")
  title: string;           // Name of the goal (e.g. "Master Computer Networks")
  subject: string;         // The parent subject (e.g. "Computer Networks")
  progress: number;        // Completion percentage (0 to 100)
  status: GoalStatus;      // Current state of the goal
  updatedAt: string;       // Relative or formatted date string
  description: string;     // Goal summary / motivation
}

/**
 * Log entry for what a student accomplished or bounced off.
 * 🔗 Backend model: Maps to table `goal_activities` or `checkins` in DB.
 */
export interface GoalActivity {
  id: string | number;
  date: string;
  note: string;
}

export interface GoalDetail extends Goal {
  activity: GoalActivity[];
}

// ─── User Profile & Settings Types ───────────────────────────────────────────

/**
 * Authenticated user profile information.
 * 🔗 Backend route: GET /api/profile
 */
export interface UserProfile {
  id?: string;
  name: string;
  initials: string;
  email: string;
  joinedAt: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalConversations: number;
}

/**
 * 🔗 Backend route: GET /api/sidebar
 * Single endpoint returning all sidebar data together (conversations, goals, and user).
 */
export interface SidebarData {
  conversations: Conversation[];
  goals: Goal[];
  user?: UserProfile;
}

/**
 * 🔗 Backend route: GET /api/settings
 * Single endpoint returning full settings info.
 */
export interface SettingsData {
  user: UserProfile;
  isPaused: boolean;
  resumeDate: string | null;
  notifications: Record<string, boolean>;
}

/**
 * 🔗 Backend route: POST /api/auth
 * Response from the unified login/register endpoint.
 */
export interface AuthResponse {
  user: UserProfile;
  token: string;
}

// ─── Subject & Graph Types (UI Data Structures) ───────────────────────────────

export type TopicMasteryState = "solid" | "shaky" | "unseen";

/**
 * A subject available for learning.
 */
export interface Subject {
  id: string;              // Slug identifier (e.g. "networking", "react")
  name: string;            // Display title (e.g. "Computer Networking")
  topicCount: number;      // Number of dependency topics in this subject
  description?: string;
}

/**
 * A topic node inside the subject's dependency tree.
 */
export interface Topic {
  id: string;
  name: string;
  state: TopicMasteryState;
  isNext?: boolean;        // Whether Kero recommends doing this topic next
  isSkippable?: boolean;   // Whether Trellis identified this as skippable for the goal
  prerequisites: string[]; // Topics that must be solid before this one
  dependents: string[];    // Topics that unlock after this one
}

/**
 * Graph data structure for Cytoscape.js / visual rendering.
 */
export interface TopicGraph {
  nodes: Topic[];
  edges: Array<{
    source: string;
    target: string;
  }>;
}

// ─── Notification & Pause Types (UI State) ────────────────────────────────────

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

// ─── Legacy compatibility aliases ─────────────────────────────────────────────
export type DummyMessage = ChatMessage;
export type DummyConversation = Conversation;
export type DummyGoal = Goal;

