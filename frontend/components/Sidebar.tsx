import Link from "next/link";
import type { Conversation } from "@/lib/types";
import BrandMark from "./BrandMark";
import ConversationList from "./ConversationList";
import Icon from "./Icon";

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
    <aside
      className="sidebar w-[286px] h-svh flex-[0_0_286px] min-h-0 self-start sticky top-0 pt-7 px-4 pb-[18px] flex flex-col overflow-hidden border-r border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120] transition-[width,flex-basis,padding,border-color,opacity] duration-[240ms] ease-out"
      aria-label="Goals sidebar"
    >
      <BrandMark />

      {/* New goal — primary CTA, terracotta fill */}
      <button
        className="new-chat-button w-full h-[43px] mt-[34px] px-3 flex items-center gap-[9px] border border-[#ba806e] dark:border-[#a86e5f] rounded-lg text-white bg-[#ba806e] dark:bg-[#a86e5f] text-[13px] font-medium shadow-[0_1px_3px_rgba(184,128,110,0.25)] dark:shadow-none transition-[background-color,border-color] duration-[180ms] ease-out hover:bg-[#a86e5f] dark:hover:bg-[#96604f] hover:border-[#a86e5f] cursor-pointer"
        type="button"
        onClick={onNewChat}
      >
        <Icon name="target" size={17} />
        <span>New goal</span>
        <kbd className="ml-auto text-white/60 text-[11px] font-inherit">⌘ K</kbd>
      </button>

      {/* New conversation — secondary, ghost style.
          Both buttons start the same fresh thread; Kero classifies intent
          from the user's first message on the backend. User can create a
          new goal from the conversation tab too — Kero handles it. */}
      <button
        className="w-full h-[38px] mt-2 px-3 flex items-center gap-[9px] border border-[#ded9d1] dark:border-[#3b3835] rounded-lg text-[#6f6862] dark:text-[#8e8881] bg-transparent text-[13px] font-medium transition-[background-color,border-color,color] duration-[180ms] ease-out hover:border-[#cdbdb5] dark:hover:border-[#4a4541] hover:text-[#34302c] dark:hover:text-[#eee9e4] hover:bg-[#faf9f7] dark:hover:bg-[#292826] cursor-pointer"
        type="button"
        onClick={onNewChat}
      >
        <Icon name="plus" size={15} />
        <span>New conversation</span>
      </button>

      {/* Goals / conversation list */}
      <div className="conversation-heading mt-[31px] mx-2 mb-2 flex items-center justify-between text-[#6f6862] dark:text-[#8e8881] text-[11px] font-semibold tracking-[0.07em] uppercase">
        <span>Your goals</span>
        <button
          className="icon-button w-[30px] h-[30px] p-0 inline-grid place-items-center border-0 rounded-md text-[#918a83] dark:text-[#99928b] bg-transparent hover:text-[#48423d] dark:hover:text-[#eee9e4] hover:bg-[#ebe8e3] dark:hover:bg-[#35322f] cursor-pointer"
          type="button"
          aria-label="Search goals"
          onClick={onToggleSearch}
        >
          <Icon name="search" size={17} />
        </button>
      </div>

      {searchOpen && (
        <input
          className="search-input w-full h-[34px] mb-2 px-2.5 border border-[#ded9d1] dark:border-[#45413d] rounded-[7px] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[12px] placeholder-[#8f8881] dark:placeholder-[#77716b] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2"
          autoFocus
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search goals…"
          aria-label="Search goals"
        />
      )}

      {/* Each conversation = one goal thread */}
      <ConversationList
        conversations={conversations}
        hasConversations={totalConversations > 0}
        activeConversationId={activeConversationId}
        onSelect={onSelectConversation}
      />

      {/* Bottom links — Settings, Pause */}
      <div className="sidebar-bottom mt-auto">
        {/* 
          TODO (backend): Replace with real user from auth context.
          Show initials + name from the session/user API.
        */}
        <div className="flex items-center gap-[9px] py-2 px-[9px] mb-1">
          <span className="avatar shrink-0 w-[26px] h-[26px] grid place-items-center rounded-full bg-[#ba806e] text-white text-[9px] font-semibold">
            AS
          </span>
          <span className="text-[12px] font-medium text-[#393531] dark:text-[#eee9e4] leading-normal">
            Nitesh
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-[9px]" aria-label="App links">
          <Link
            href="/pause"
            className="flex items-center gap-[7px] py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-[180ms] ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
          >
            <Icon name="pause" size={13} />
            Pause Kero
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-[7px] py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-[180ms] ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
          >
            <Icon name="settings" size={13} />
            Settings
          </Link>
          {/* TODO: POST /auth/signout → clear tokens → redirect /login */}
          <Link
            href="/login"
            className="flex items-center gap-[7px] py-1.5 text-[#6f6862] dark:text-[#8e8881] text-[11px] font-medium no-underline transition-colors duration-[180ms] ease-out hover:text-[#9d6252] dark:hover:text-[#e1a18e]"
          >
            <Icon name="arrowRight" size={13} />
            Sign out
          </Link>
        </nav>
      </div>
    </aside>
  );
}
