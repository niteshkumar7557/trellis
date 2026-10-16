/**
 * Formats time for individual chat messages.
 * Only shows the clock time (no day or date).
 * e.g. "10:14 PM", "9:05 AM"
 */
export function formatMessageTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "Just now";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    // If it's already a time string like "10:14 PM" or "Just now", return as is
    return typeof dateInput === "string" ? dateInput : "Just now";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats time for the sidebar and conversations list.
 * Only shows the date or "Today" (no time of day).
 * e.g. "Today", "Yesterday", "Oct 16"
 */
export function formatSidebarTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "Today";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return typeof dateInput === "string" ? dateInput : "Today";
  }

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isSameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Formats date for the thread divider banner.
 * e.g. "Today", "Yesterday", "October 16, 2026"
 */
export function formatDividerDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "Today";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return "Today";
  }

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Default export alias for messages
export const formatTime = formatMessageTime;
