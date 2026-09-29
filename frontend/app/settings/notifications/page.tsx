"use client";

// /settings/notifications — Notification preferences.
//
// Toggle each channel on/off and set a preferred check-in reminder time.
// Channels available: WhatsApp, Telegram, Discord, Email (from the tech stack).
//
// Each channel needs a setup step (phone number, bot token, webhook, etc.).
// That setup is shown inline when you enable a channel for the first time.
//
// TODO (backend):
//   - GET /notifications/settings → { channels: { id, enabled, config }[], reminderTime: string }
//   - PATCH /notifications/settings → { channels?, reminderTime? }
//   - POST /notifications/channels/:id/test → send a test message
//   - Channels are stored per-user on the server; toggling here persists immediately
//   - While paused (GET /pause returns isPaused: true), all channels are suppressed
//     server-side regardless of these settings

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelId = "whatsapp" | "telegram" | "discord" | "email";

interface Channel {
  id: ChannelId;
  label: string;
  description: string;
  icon: string; // emoji — no external icon deps needed
  setupPlaceholder: string;
  setupLabel: string;
}

interface ChannelState {
  enabled: boolean;
  configured: boolean;
  configValue: string; // phone number, chat ID, webhook URL, or email
}

// ─── Channel definitions ──────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Evening reminders via the Evolution API bot",
    icon: "💬",
    setupLabel: "Your WhatsApp number",
    setupPlaceholder: "+91 98765 43210",
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Reminders via the Kero Telegram bot",
    icon: "✈️",
    setupLabel: "Your Telegram username",
    setupPlaceholder: "@yourhandle",
  },
  {
    id: "discord",
    label: "Discord",
    description: "Reminders via the Kero Discord bot",
    icon: "🎮",
    setupLabel: "Your Discord user ID",
    setupPlaceholder: "123456789012345678",
  },
  {
    id: "email",
    label: "Email",
    description: "Sent via AWS SES — check your spam folder once",
    icon: "📧",
    setupLabel: "Email address",
    setupPlaceholder: "you@example.com",
  },
];

// ─── Mock initial state — replace with API data ───────────────────────────────

const INITIAL_STATES: Record<ChannelId, ChannelState> = {
  whatsapp: { enabled: false, configured: false, configValue: "" },
  telegram: { enabled: false, configured: false, configValue: "" },
  discord: { enabled: false, configured: false, configValue: "" },
  email: { enabled: true, configured: true, configValue: "nitesh@example.com" },
};

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-[40px] h-[22px] rounded-full border transition-[background-color,border-color] duration-[200ms] cursor-pointer shrink-0 ${
        checked
          ? "bg-[#ba806e] border-[#ba806e]"
          : "bg-[#e8e3dc] dark:bg-[#302e2c] border-[#e0d8d2] dark:border-[#3d3835]"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform duration-[200ms] ${
          checked ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Channel card ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  state,
  onChange,
}: {
  channel: Channel;
  state: ChannelState;
  onChange: (id: ChannelId, next: Partial<ChannelState>) => void;
}) {
  const [configInput, setConfigInput] = useState(state.configValue);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleToggle = (enabled: boolean) => {
    // TODO: PATCH /notifications/settings { channels: [{ id: channel.id, enabled }] }
    onChange(channel.id, { enabled });
  };

  const handleSaveConfig = () => {
    // TODO: PATCH /notifications/settings { channels: [{ id: channel.id, config: configInput }] }
    onChange(channel.id, { configured: true, configValue: configInput });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    // TODO: POST /notifications/channels/:id/test
    await new Promise((r) => setTimeout(r, 1000)); // simulate API call
    setTesting(false);
    setTestResult("success");
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div className="border-b border-[#e8e5df] dark:border-[#302e2c] last:border-b-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="text-[20px] shrink-0">{channel.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[13px] font-semibold text-[#34302c] dark:text-[#eee9e4]">
            {channel.label}
          </p>
          <p className="m-0 text-[12px] text-[#918a83] dark:text-[#7a736c]">
            {channel.description}
          </p>
        </div>
        <Toggle
          checked={state.enabled}
          onChange={handleToggle}
          label={`Toggle ${channel.label}`}
        />
      </div>

      {/* Setup panel — shown when enabled but not yet configured */}
      {state.enabled && !state.configured && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-xl border border-[#e0d5cf] dark:border-[#3d3531] bg-[#fdf9f7] dark:bg-[#272422]">
            <p className="m-0 mb-2 text-[12px] font-medium text-[#6f6862] dark:text-[#a29a93]">
              {channel.setupLabel}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={channel.setupPlaceholder}
                value={configInput}
                onChange={(e) => setConfigInput(e.target.value)}
                className="flex-1 h-[36px] px-3 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] placeholder-[#8f8881] dark:placeholder-[#77716b] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2"
              />
              <button
                type="button"
                disabled={!configInput.trim()}
                onClick={handleSaveConfig}
                className="px-3 h-[36px] rounded-lg text-[12px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-[160ms] cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configured state — show value + test button */}
      {state.enabled && state.configured && (
        <div className="px-4 pb-4 flex items-center gap-3">
          <span className="text-[12px] text-[#918a83] dark:text-[#7a736c]">
            {state.configValue}
          </span>
          <button
            type="button"
            onClick={() => onChange(channel.id, { configured: false })}
            className="text-[11px] text-[#9d6252] dark:text-[#db9c88] border-0 bg-transparent p-0 cursor-pointer hover:underline"
          >
            Change
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#e0d8d2] dark:border-[#403b36] text-[#6f6862] dark:text-[#8e8881] bg-transparent hover:border-[#cdbdb5] dark:hover:border-[#5a5048] hover:text-[#34302c] dark:hover:text-[#eee9e4] transition-colors duration-[160ms] cursor-pointer disabled:opacity-50"
          >
            <Icon name="zap" size={11} />
            {testing ? "Sending…" : testResult === "success" ? "Sent!" : "Test"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsSettingsPage() {
  const [channels, setChannels] = useState(INITIAL_STATES);
  const [reminderTime, setReminderTime] = useState("20:00"); // 8 PM default

  const updateChannel = (id: ChannelId, next: Partial<ChannelState>) => {
    setChannels((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
    // TODO: PATCH /notifications/settings
  };

  return (
    <AppShell>
      <div className="max-w-[560px] mx-auto px-8 py-10">
        {/* Header */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#6f6862] dark:hover:text-[#9e9690] mb-6 transition-colors duration-[160ms]"
        >
          <Icon name="arrowLeft" size={13} />
          Settings
        </Link>

        <p className="m-0 mb-1 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#9d6252] dark:text-[#db9c88]">
          Notifications
        </p>
        <h1 className="mt-0 mb-2 font-manrope text-[26px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
          Where should Kero reach you?
        </h1>
        <p className="mt-0 mb-8 text-[13px] text-[#6f6862] dark:text-[#a29a93] leading-[1.65]">
          Kero sends one evening reminder per day — just a nudge to do your
          check-in. Enable as many channels as you want.
        </p>

        {/* Channel cards */}
        <section className="mb-8">
          <h2 className="m-0 mb-3 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#6f6862] dark:text-[#8e8881]">
            Channels
          </h2>
          <div className="rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] overflow-hidden">
            {CHANNELS.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                state={channels[ch.id]}
                onChange={updateChannel}
              />
            ))}
          </div>
        </section>

        {/* Reminder time */}
        <section className="mb-8">
          <h2 className="m-0 mb-3 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#6f6862] dark:text-[#8e8881]">
            Reminder time
          </h2>
          <div className="rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] px-4 py-4">
            <p className="m-0 mb-3 text-[13px] text-[#3f3a36] dark:text-[#d7d1cb]">
              When should Kero send the evening check-in reminder?
            </p>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => {
                  setReminderTime(e.target.value);
                  // TODO: PATCH /notifications/settings { reminderTime: e.target.value }
                }}
                className="h-[36px] px-3 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2 cursor-pointer"
              />
              <span className="text-[12px] text-[#918a83] dark:text-[#7a736c]">
                in your local timezone
              </span>
            </div>
          </div>
        </section>

        {/* Pause shortcut */}
        <div className="p-4 rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120] flex items-center justify-between">
          <div>
            <p className="m-0 text-[13px] font-medium text-[#34302c] dark:text-[#eee9e4]">
              Need a break from all notifications?
            </p>
            <p className="m-0 text-[12px] text-[#918a83] dark:text-[#7a736c]">
              Pause Kero entirely — no messages, no guilt.
            </p>
          </div>
          <Link
            href="/pause"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#6f6862] dark:text-[#8e8881] border border-[#e0d8d2] dark:border-[#403b36] bg-transparent hover:border-[#cdbdb5] dark:hover:border-[#5a5048] hover:text-[#34302c] dark:hover:text-[#eee9e4] no-underline transition-colors duration-[160ms] shrink-0"
          >
            <Icon name="pause" size={13} />
            Pause
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
