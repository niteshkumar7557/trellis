import type { Conversation } from "@/lib/types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  return (
    <button
      className={`conversation-item ${isActive ? "is-active" : ""}`}
      type="button"
      onClick={() => onSelect(conversation)}
    >
      <span className="conversation-title">{conversation.title}</span>
      <span className="conversation-meta">
        <span>{conversation.preview}</span>
        <time>{conversation.time}</time>
      </span>
    </button>
  );
}
