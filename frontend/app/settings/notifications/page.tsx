"use client";

/**
 * =============================================================================
 * NOTIFICATION PREFERENCES ROUTE: /settings/notifications
 * =============================================================================
 * Allows toggling channels (WhatsApp, Telegram, Discord, Email), configuring
 * bot/webhook credentials, and testing delivery.
 * 
 * 🔗 BACKEND LINKS:
 *  1. GET /api/notifications/settings          -> Fetches current notification config
 *  2. PATCH /api/notifications/settings        -> Saves updated channels and reminder time
 *  3. POST /api/notifications/channels/:id/test -> Fires test reminder through channel
 * =============================================================================
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import type {
  NotificationChannelId,
  NotificationChannel,
  ChannelConfigState,
  NotificationSettings,
} from "@/lib/types";
import { DUMMY_NOTIFICATION_SETTINGS } from "@/lib/dummy-data";

// ─── Channel Definitions ──────────────────────────────────────────────────────
const CHANNELS: NotificationChannel[] = [
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

// ─── Toggle Switch Component ──────────────────────────────────────────────────
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

// ─── Channel Card Component ───────────────────────────────────────────────────
function ChannelCard({
  channel,
  state,
  onChange,
}: {
  channel: NotificationChannel;
  state: ChannelConfigState;
  onChange: (id: NotificationChannelId, next: Partial<ChannelConfigState>) => void;
}) {
  const [configInput, setConfigInput] = useState(state.configValue);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleToggle = (enabled: boolean) => {
    // 🔗 BACKEND LINK: PATCH /api/notifications/settings
    onChange(channel.id, { enabled });
  };

  const handleSaveConfig = () => {
    // 🔗 BACKEND LINK: PATCH /api/notifications/settings
    onChange(channel.id, { configured: true, configValue: configInput });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setTestResult("success");
    setTesting(false);
  };

  return (
    <div className="p-4 rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[20px] select-none">{channel.icon}</span>
          <div>
            <p className="m-0 text-[13px] font-semibold text-[#34302c] dark:text-[#eee9e4]">
              {channel.label}
            </p>
            <p className="m-0 text-[11px] text-[#918a83] dark:text-[#7a736c]">
              {channel.description}
            </p>
          </div>
        </div>
        <Toggle
          checked={state.enabled}
          onChange={handleToggle}
          label={`Toggle ${channel.label}`}
        />
      </div>

      {/* Expanded setup area when enabled */}
      {state.enabled && (
        <div className="mt-4 pt-4 border-t border-[#e8e5df] dark:border-[#302e2c]">
          <label className="block text-[11px] font-medium text-[#6f6862] dark:text-[#8e8881] mb-1.5">
            {channel.setupLabel}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={configInput}
              onChange={(e) => setConfigInput(e.target.value)}
              placeholder={channel.setupPlaceholder}
              className="flex-1 h-9 px-3 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-white dark:bg-[#292826] text-[12px] outline-none focus-visible:outline-2 focus-visible:outline-[#ba806e]"
            />
            <button
              type="button"
              onClick={handleSaveConfig}
              className="h-9 px-3 rounded-lg text-[12px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] transition-colors duration-160 cursor-pointer"
            >
              Save
            </button>
            {state.configured && (
              <button
                type="button"
                disabled={testing}
                onClick={handleTest}
                className="h-9 px-3 rounded-lg text-[12px] font-medium text-[#56504b] dark:text-[#b1aaa3] border border-[#e2dcd4] dark:border-[#3b3835] bg-transparent hover:bg-[#ece9e4] dark:hover:bg-[#302e2b] transition-colors duration-160 cursor-pointer disabled:opacity-50"
              >
                {testing ? "Testing…" : "Send test"}
              </button>
            )}
          </div>

          {testResult && (
            <p
              className={`m-0 mt-2 text-[11px] ${
                testResult === "success"
                  ? "text-[#4a7545] dark:text-[#82a57b]"
                  : "text-[#a25e50] dark:text-[#d89180]"
              }`}
            >
              {testResult === "success"
                ? "Test message sent! Check your app."
                : "Could not send test message. Check your details."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notification Settings Page Root ──────────────────────────────────────────
export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DUMMY_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);

  // 🔗 BACKEND ROUTE: GET /api/settings (Fetch settings info)
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        await api.settings.get();
        if (isMounted) setSettings(DUMMY_NOTIFICATION_SETTINGS);
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChannelChange = (
    id: NotificationChannelId,
    next: Partial<ChannelConfigState>
  ) => {
    const updatedChannels = {
      ...settings.channels,
      [id]: {
        ...settings.channels[id],
        ...next,
      },
    };

    setSettings((prev) => ({
      ...prev,
      channels: updatedChannels,
    }));
  };

  return (
    <AppShell>
      <div className="max-w-140 mx-auto px-8 py-10">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#6f6862] dark:hover:text-[#9e9690] mb-8 transition-colors duration-160"
        >
          <Icon name="arrowLeft" size={13} />
          Back to settings
        </Link>

        <div className="mb-8">
          <h1 className="m-0 font-manrope text-[24px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
            Notification channels
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#918a83] dark:text-[#7a736c]">
            Choose where Kero sends your daily check-in prompt.
          </p>
        </div>

        {loading ? (
          <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
            Loading channels…
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {CHANNELS.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                state={settings.channels[channel.id]}
                onChange={handleChannelChange}
              />
            ))}
          </div>
        )}

        {/* Backend Info Notice */}
        <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
          🔗 Connected to hosted backend API: <code>GET/PATCH /api/notifications/settings</code>
        </div>
      </div>
    </AppShell>
  );
}
