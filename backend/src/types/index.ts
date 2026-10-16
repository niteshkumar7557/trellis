export type MessageRole = "user" | "assistant";

export interface UserPayload {
  id: number;
  role: string;
  name: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  time: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  createdAt?: string;
  updatedAt?: string;
  messages: ChatMessage[];
}
