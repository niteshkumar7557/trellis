/**
 * =============================================================================
 * CONVERSATION ROUTE: /c/[uid]
 * =============================================================================
 * Displays an existing conversation thread with Kero.
 * 
 * 🔗 BACKEND LINK:
 *  GET /api/conversations/:id -> Fetches conversation title and historical messages
 * =============================================================================
 */

import { notFound } from "next/navigation";
import ChatApp from "@/components/ChatApp";
import { api } from "@/lib/api";
import { DUMMY_CONVERSATIONS } from "@/lib/dummy-data";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { uid } = await params;

  // 🔗 BACKEND LINK: GET /api/conversations/:id
  // Fetches conversation record from your hosted backend API
  const conversation = await api.conversations.get(uid);

  if (!conversation) {
    notFound();
  }

  return (
    <ChatApp
      key={conversation.id}
      initialConversationId={conversation.id}
      initialMessages={conversation.messages}
      initialTitle={conversation.title}
    />
  );
}

// Generate static routes for fallback pre-rendering
export function generateStaticParams() {
  return DUMMY_CONVERSATIONS.map((c) => ({ uid: c.id || c.uid }));
}
