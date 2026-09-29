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
      className={`conversation-item w-full pt-2.5 px-2.5 pb-[9px] block border-0 rounded-[7px] text-left cursor-pointer transition-[color,background-color] duration-[180ms] ease-out ${
        isActive
          ? "is-active text-[#2d2926] bg-[#eae6e0] dark:text-[#eee9e4] dark:bg-[#34312e]"
          : "text-[#56504b] dark:text-[#b1aaa3] bg-transparent hover:bg-[#ece9e4] dark:hover:bg-[#302e2b]"
      }`}
      type="button"
      onClick={() => onSelect(conversation)}
    >
      <span className="conversation-title block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-normal">
        {conversation.title}
      </span>
      <span className="conversation-meta block overflow-hidden text-ellipsis whitespace-nowrap mt-1 text-[#6f6862] dark:text-[#8e8881] text-[11px] leading-normal">
        <span>{conversation.preview}</span>
        <time className="float-right ml-[5px]">{conversation.time}</time>
      </span>
    </button>
  );
}
