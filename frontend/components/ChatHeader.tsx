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
    <header className="chat-header">
      <div className="model-label">
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarLabel}
          title={sidebarLabel}
          onClick={onToggleSidebar}
        >
          <Icon name="sidebar" size={17} />
        </button>
        <span className="status-dot" />
        <span className="chat-title" title={title}>
          {title}
        </span>
        <span className="model-version">1.0</span>
      </div>
      <div className="header-actions">
        <button
          className="theme-toggle"
          type="button"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={16} />
        </button>
        <button
          className="icon-button header-menu"
          type="button"
          aria-label="Open chat options"
        >
          <Icon name="menu" size={18} />
        </button>
      </div>
    </header>
  );
}
