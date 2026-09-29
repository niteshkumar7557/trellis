import Icon from "./Icon";

interface ChatHeaderProps {
  title: string;
  sidebarOpen: boolean;
  darkMode: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

export default function ChatHeader({
  title,
  sidebarOpen,
  darkMode,
  onToggleSidebar,
  onToggleTheme,
}: ChatHeaderProps) {
  const sidebarLabel = sidebarOpen ? "Hide sidebar" : "Show sidebar";
  const themeLabel = darkMode ? "Switch to light mode" : "Switch to dark mode";

  return (
    <header className="chat-header h-[60px] px-5 flex items-center justify-between border-b border-[#eeeae5] dark:border-[#2e2c2a] bg-[#fbfaf8] dark:bg-[#1d1c1b]">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Sidebar toggle */}
        <button
          className="sidebar-toggle w-[30px] h-[30px] p-0 shrink-0 inline-grid place-items-center border border-[#ded9d1] dark:border-[#45413d] rounded-lg text-[#8f8881] dark:text-[#aaa29a] bg-[#faf9f7] dark:bg-[#292826] transition-[color,border-color,background-color] duration-[180ms] hover:border-[#cdbdb5] hover:text-[#48423d] hover:bg-white dark:hover:border-[#896055] dark:hover:text-[#e1a18e] dark:hover:bg-[#35302d] cursor-pointer"
          type="button"
          aria-label={sidebarLabel}
          title={sidebarLabel}
          onClick={onToggleSidebar}
        >
          <Icon name="sidebar" size={16} />
        </button>

        {/* Active status dot + conversation title */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Green dot — dark ring adapts to dark bg */}
          <span className="status-dot shrink-0 w-[7px] h-[7px] rounded-full bg-[#82a57b] shadow-[0_0_0_3px_#eaf3e7] dark:shadow-[0_0_0_3px_#1e2e1b]" />
          <span
            className="chat-title overflow-hidden text-ellipsis whitespace-nowrap font-manrope text-[13px] font-semibold text-[#4b4540] dark:text-[#d9d2cc] max-w-[360px]"
            title={title}
          >
            {title}
          </span>
        </div>
      </div>

      {/* Header actions */}
      <div className="flex items-center gap-1.5">
        <button
          className="theme-toggle w-[30px] h-[30px] p-0 inline-grid place-items-center border border-[#ded9d1] dark:border-[#45413d] rounded-full text-[#8f8881] dark:text-[#aaa29a] bg-[#faf9f7] dark:bg-[#292826] transition-[color,border-color,background-color,transform] duration-[180ms] hover:border-[#cdbdb5] hover:text-[#9d6252] hover:bg-white hover:-rotate-[10deg] dark:hover:border-[#896055] dark:hover:text-[#e1a18e] dark:hover:bg-[#35302d] cursor-pointer"
          type="button"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={15} />
        </button>


      </div>
    </header>
  );
}
