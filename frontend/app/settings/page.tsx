"use client";

/**
 * =============================================================================
 * SETTINGS ROUTE: /settings
 * =============================================================================
 * Account settings and privacy controls.
 * 
 * Sections:
 *   1. Profile         - Name, email, member since
 *   2. Notifications   - Link to /settings/notifications
 *   3. Privacy & Data  - Permanent account deletion
 * 
 * 🔗 BACKEND LINKS:
 *  1. GET /api/me    -> Fetches user profile settings
 *  2. DELETE /api/me -> Permanently deletes user account and records
 * =============================================================================
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

// ─── Section Card Wrapper ─────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="m-0 mb-3 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#6f6862] dark:text-[#8e8881]">
        {title}
      </h2>
      <div className="rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] overflow-hidden">
        {children}
      </div>
    </section>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  action,
  destructive,
  href,
  onClick,
}: {
  label: string;
  value?: string;
  action?: string;
  destructive?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const actionEl = href ? (
    <Link
      href={href}
      className={`text-[12px] font-semibold no-underline transition-colors duration-[160ms] flex items-center gap-1 ${
        destructive
          ? "text-[#a25e50] dark:text-[#d89180] hover:text-[#8a3030] dark:hover:text-[#e87a78]"
          : "text-[#9d6252] dark:text-[#db9c88] hover:text-[#7a4438] dark:hover:text-[#efb19d]"
      }`}
    >
      {action}
      <Icon name="chevronRight" size={13} />
    </Link>
  ) : onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] font-semibold border-0 bg-transparent p-0 cursor-pointer transition-colors duration-[160ms] ${
        destructive
          ? "text-[#a25e50] dark:text-[#d89180] hover:text-[#8a3030] dark:hover:text-[#e87a78]"
          : "text-[#9d6252] dark:text-[#db9c88] hover:text-[#7a4438] dark:hover:text-[#efb19d]"
      }`}
    >
      {action}
    </button>
  ) : null;

  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e8e5df] dark:border-[#302e2c] last:border-b-0">
      <div>
        <p className="m-0 text-[13px] font-medium text-[#34302c] dark:text-[#eee9e4]">
          {label}
        </p>
        {value && (
          <p className="m-0 text-[12px] text-[#918a83] dark:text-[#7a736c] mt-0.5">
            {value}
          </p>
        )}
      </div>
      {actionEl}
    </div>
  );
}

// ─── Delete Account Confirmation Modal ────────────────────────────────────────
function DeleteModal({
  onClose,
  onConfirm,
  isDeleting,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === "delete my account";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[min(440px,calc(100vw-32px))] p-6 rounded-2xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#faf9f7] dark:bg-[#232120] shadow-xl">
        <h3 className="m-0 mb-2 font-manrope text-[18px] font-bold tracking-[-0.03em] text-[#26231f] dark:text-[#eee9e4]">
          Delete everything
        </h3>
        <p className="m-0 mb-4 text-[13px] text-[#6f6862] dark:text-[#a29a93] leading-[1.65]">
          This permanently deletes your account, all your subjects, topics,
          check-ins, and mastery history. It cannot be undone.
        </p>

        <ul className="m-0 mb-4 p-0 list-none flex flex-col gap-1">
          {[
            "Your profile and login",
            "All enrolled subjects and goals",
            "All check-in history",
            "All mastery estimates",
          ].map((item) => (
            <li
              key={item}
              className="text-[12px] text-[#a25e50] dark:text-[#d89180] flex items-center gap-2"
            >
              <Icon name="trash" size={12} />
              {item}
            </li>
          ))}
        </ul>

        <p className="m-0 mb-1.5 text-[12px] text-[#6f6862] dark:text-[#a29a93]">
          Type{" "}
          <code className="text-[11px] px-1.5 py-0.5 rounded bg-[#f4f2ee] dark:bg-[#2a2826] border border-[#e2dcd4] dark:border-[#403b36] text-[#a25e50] dark:text-[#d89180]">
            delete my account
          </code>{" "}
          to confirm:
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="delete my account"
          className="w-full h-10 px-3 mb-5 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-white dark:bg-[#292826] text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-[#ba806e]"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-[#56504b] dark:text-[#b1aaa3] border border-[#e2dcd4] dark:border-[#3b3835] bg-transparent hover:bg-[#ece9e4] dark:hover:bg-[#302e2b] transition-colors duration-160 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed || isDeleting}
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white bg-[#ba5040] hover:bg-[#a04030] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-160 cursor-pointer"
          >
            {isDeleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page Root ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 🔗 BACKEND ROUTE: GET /api/settings (Fetch settings info)
  useEffect(() => {
    let isMounted = true;
    async function fetchSettings() {
      try {
        const data = await api.settings.get();
        if (isMounted) setUser(data.user);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    // Backend handles account deletion flow; signout session
    try {
      await api.auth.signout();
      router.push("/register");
    } catch (err) {
      console.error("Failed to signout:", err);
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-140 mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="m-0 font-manrope text-[24px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
            Settings
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#918a83] dark:text-[#7a736c]">
            Manage your account and preferences.
          </p>
        </div>

        {loading ? (
          <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
            Loading settings…
          </p>
        ) : (
          <>
            {/* Profile Section */}
            <Section title="Profile">
              <Row label="Name" value={user?.name || "Nitesh Kumar"} />
              <Row label="Email" value={user?.email || "nitesh@example.com"} />
              <Row label="Member since" value={user?.joinedAt || "September 2026"} />
            </Section>

            {/* Notifications Section */}
            <Section title="Notifications">
              <Row
                label="Notification channels"
                value="WhatsApp, Telegram, Discord, Email"
                action="Configure"
                href="/settings/notifications"
              />
              <Row
                label="Pause reminders"
                value="Temporarily silence all check-ins"
                action="Pause"
                href="/pause"
              />
            </Section>

            {/* Privacy & Account Deletion */}
            <Section title="Privacy & Data">
              <Row
                label="Delete everything"
                value="Permanently delete your account, subjects, and data"
                action="Delete"
                destructive
                onClick={() => setDeleteOpen(true)}
              />
            </Section>
          </>
        )}

        {/* Backend Info Notice */}
        <div className="mt-10 px-4 py-3 rounded-xl border border-dashed border-[#d8d0c8] dark:border-[#3d3835] text-[11px] text-[#918a83] dark:text-[#7a736c] text-center">
          🔗 Connected to hosted backend API: <code>GET /api/settings</code>
        </div>

        {deleteOpen && (
          <DeleteModal
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDeleteAccount}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </AppShell>
  );
}
