import type { Conversation } from "@/lib/types";
import ConversationItem from "./ConversationItem";

interface ConversationListProps {
  conversations: Conversation[];
  hasConversations: boolean;
  activeConversationId: number | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationList({
  conversations,
  hasConversations,
  activeConversationId,
  onSelect,
}: ConversationListProps) {
  const emptyMessage = hasConversations
    ? "No matches found"
    : "No conversations yet";

  return (
    <nav className="conversation-list" aria-label="Conversation history">
      {conversations.length === 0 ? (
        <p className="empty-history">{emptyMessage}</p>
      ) : (
        conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={activeConversationId === conversation.id}
            onSelect={onSelect}
          />
        ))
      )}
    </nav>
  );
}
