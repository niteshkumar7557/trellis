import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageRowProps {
  message: ChatMessage;
}

export default function MessageRow({ message }: MessageRowProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`message-row ${message.role} flex gap-3 mb-[30px] ${
        isAssistant ? "" : "justify-end"
      }`}
    >
      {isAssistant && (
        <div className="avatar assistant-avatar shrink-0 w-[27px] h-[27px] grid place-items-center rounded-full text-white bg-[#b98170] font-manrope text-[12px] font-semibold">
          K
        </div>
      )}
      <div
        className={`message-block ${
          isAssistant ? "max-w-[580px]" : "max-w-[510px] text-right"
        }`}
      >
        <div className="message-author mb-1.5 text-[#7a736c] dark:text-[#817a73] text-[11px]">
          {isAssistant ? "Kero" : "You"}{" "}
          <time className="ml-[7px] text-[#8f8881] dark:text-[#817a73] text-[10px]">
            {message.time}
          </time>
        </div>
        {isAssistant ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="inline-block py-3 px-[15px] rounded-[14px_14px_3px_14px] text-white dark:text-[#f5f1ed] bg-[#3b3835] dark:bg-[#b8806f] text-[15px] max-[700px]:text-[14px] leading-[1.5] tracking-[-0.01em] text-left">
            {message.content}
          </p>
        )}
      </div>
    </article>
  );
}
