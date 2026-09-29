export default function TypingIndicator() {
  return (
    <div
      className="typing-indicator h-[30px] px-[13px] inline-flex items-center gap-1 border border-[#eeeae5] dark:border-[#3b3835] rounded-xl bg-white dark:bg-[#252422]"
      aria-label="Kero is thinking"
    >
      <span className="w-1 h-1 rounded-full bg-[#b7aea7] dark:bg-[#958b83] animate-[typing-pulse_1.1s_infinite_ease-in-out]" />
      <span className="w-1 h-1 rounded-full bg-[#b7aea7] dark:bg-[#958b83] animate-[typing-pulse_1.1s_infinite_ease-in-out] [animation-delay:0.14s]" />
      <span className="w-1 h-1 rounded-full bg-[#b7aea7] dark:bg-[#958b83] animate-[typing-pulse_1.1s_infinite_ease-in-out] [animation-delay:0.28s]" />
    </div>
  );
}
