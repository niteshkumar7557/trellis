import type { Conversation } from "@/lib/types";
import BrandMark from "./BrandMark";
import ConversationList from "./ConversationList";
import Icon from "./Icon";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

interface SidebarProps {
  conversations: Conversation[];
  totalConversations: number;
  searchQuery: string;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  activeConversationId: number | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
}

export default function Sidebar({
  conversations,
  totalConversations,
  searchQuery,
  searchOpen,
  onToggleSearch,
  onSearchChange,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Conversation sidebar">
      <BrandMark />

      <button className="new-chat-button" type="button" onClick={onNewChat}>
        <Icon name="plus" size={17} />
        <span>New conversation</span>
        <kbd>⌘ K</kbd>
      </button>

      <div className="conversation-heading">
        <span>Conversations</span>
        <button
          className="icon-button"
          type="button"
          aria-label="Search conversations"
          onClick={onToggleSearch}
        >
          <Icon name="search" size={17} />
        </button>
      </div>

      {searchOpen && (
        <input
          className="search-input"
          autoFocus
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
      )}

      <ConversationList
        conversations={conversations}
        hasConversations={totalConversations > 0}
        activeConversationId={activeConversationId}
        onSelect={onSelectConversation}
      />

      <div className="sidebar-bottom">
        <WorkspaceSwitcher />
        <p className="sidebar-note">Kero can make mistakes. Check important info.</p>
      </div>
    </aside>
  );
}
