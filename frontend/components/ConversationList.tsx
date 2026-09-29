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
  const emptyMessage = hasConversations ? "No matches found" : "No goals yet";

  return (
    <nav
      className="conversation-list flex flex-col gap-[2px] min-h-0 overflow-y-auto -ml-1 pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Goals list"
    >
      {conversations.length === 0 ? (
        <p className="empty-history mt-3 mx-2 text-[#6f6862] dark:text-[#77716b] text-[11px] leading-[1.5]">
          {emptyMessage}
          {!hasConversations && (
            <>
              <br />
              <span className="text-[#918a83] dark:text-[#6f6862]">
                Press &ldquo;New goal&rdquo; to start.
              </span>
            </>
          )}
        </p>
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
