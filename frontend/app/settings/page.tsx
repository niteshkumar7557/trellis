"use client";

// /settings — Account settings.
//
// Sections:
//   1. Profile         — name, email (read-only until edit API is ready)
//   2. Notifications   — link to /settings/notifications
//   3. Privacy & Data  — delete everything (permanent, confirmed)
//
// Design rule from docs: "You can delete everything, permanently, from inside
// the app." — this must be real and reachable, not buried.
//
// TODO (backend):
//   - GET /me → { name, email, createdAt }
//   - PATCH /me → { name } (email change needs separate verification flow)
//   - DELETE /me → permanent account deletion (require typed confirmation)
//   - Auth: redirect to /login if not authenticated

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USER = {
  name: "Nitesh Kumar",
  email: "nitesh@example.com",
  createdAt: "September 2026",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteModal({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const confirmed = typed === "delete my account";

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

        {/* What gets deleted — no hiding it */}
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

        {/* Type-to-confirm */}
        <p className="m-0 mb-1.5 text-[12px] text-[#6f6862] dark:text-[#a29a93]">
          Type{" "}
          <code className="text-[11px] px-1.5 py-0.5 rounded bg-[#f4f2ee] dark:bg-[#2a2826] border border-[#e2dcd4] dark:border-[#403b36] text-[#a25e50] dark:text-[#d89180]">
            delete my account
          </code>{" "}
          to confirm
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="delete my account"
          autoFocus
          className="w-full h-[40px] px-3 mb-4 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] placeholder-[#8f8881] dark:placeholder-[#77716b] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[40px] rounded-lg text-[13px] font-medium text-[#6f6862] dark:text-[#8e8881] border border-[#ddd8d2] dark:border-[#3b3835] bg-transparent hover:bg-[#ebe8e3] dark:hover:bg-[#2e2c2a] transition-colors duration-[160ms] cursor-pointer"
          >
            Cancel
          </button>
          {/* TODO: DELETE /me → then redirect to /login */}
          <button
            type="button"
            disabled={!confirmed}
            className="flex-1 h-[40px] rounded-lg text-[13px] font-semibold text-white bg-[#a25e50] hover:bg-[#8a3030] disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-[160ms] cursor-pointer"
          >
            Delete everything
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(MOCK_USER.name);

  return (
    <AppShell>
      <div className="max-w-[560px] mx-auto px-8 py-10">
        {/* Header */}
        <p className="m-0 mb-1 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#9d6252] dark:text-[#db9c88]">
          Settings
        </p>
        <h1 className="mt-0 mb-8 font-manrope text-[28px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
          Your account
        </h1>

        {/* Profile */}
        <Section title="Profile">
          <div className="px-4 py-4 border-b border-[#e8e5df] dark:border-[#302e2c]">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 grid place-items-center rounded-full bg-[#ba806e] text-white text-[14px] font-semibold shrink-0">
                {/* TODO: initials from real user name */}
                NK
              </span>
              <div>
                <p className="m-0 text-[13px] font-semibold text-[#34302c] dark:text-[#eee9e4]">
                  {name}
                </p>
                <p className="m-0 text-[12px] text-[#918a83] dark:text-[#7a736c]">
                  Member since {MOCK_USER.createdAt}
                </p>
              </div>
            </div>

            {/* Inline name edit */}
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 h-[36px] px-3 rounded-lg border border-[#ded9d1] dark:border-[#45413d] text-[#373330] dark:text-[#eee9e4] bg-[#faf9f7] dark:bg-[#292826] text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-[#bd8875] focus-visible:outline-offset-2"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    // TODO: PATCH /me { name }
                    setEditingName(false);
                  }}
                  className="px-3 h-[36px] rounded-lg text-[12px] font-semibold text-white bg-[#ba806e] hover:bg-[#a86e5f] transition-colors duration-[160ms] cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="px-3 h-[36px] rounded-lg text-[12px] font-medium text-[#6f6862] dark:text-[#8e8881] border border-[#ddd8d2] dark:border-[#3b3835] bg-transparent hover:bg-[#ebe8e3] dark:hover:bg-[#2e2c2a] transition-colors duration-[160ms] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-[12px] font-semibold text-[#9d6252] dark:text-[#db9c88] border-0 bg-transparent p-0 cursor-pointer hover:underline"
              >
                Edit name
              </button>
            )}
          </div>

          <Row label="Email" value={MOCK_USER.email} />
          {/* Email change needs a verification flow — placeholder for now */}
          {/* TODO: implement email change with verification token */}
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            label="Notification channels"
            value="WhatsApp, Email"
            action="Manage"
            href="/settings/notifications"
          />
          <Row
            label="Pause all notifications"
            value="Exams, a break, or just some quiet"
            action="Pause Kero"
            href="/pause"
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy & data">
          <Row
            label="Your data is private"
            value="No teacher, admin, or classmate can see your record — ever"
          />
          <Row
            label="Export my data"
            value="Download everything Kero knows about you"
            action="Export"
            // TODO: GET /me/export → triggers download of JSON / CSV
            onClick={() => {
              console.log("TODO: trigger data export download");
            }}
          />
          <Row
            label="Delete everything"
            value="Permanently remove your account and all data"
            action="Delete"
            destructive
            onClick={() => setShowDeleteModal(true)}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Trellis" value="Early access · Version 0.1" />
          <Row
            label="What we promise you"
            value="Private record · Delete anytime · No punishment for gaps"
          />
        </Section>

        {/* Sign out */}
        <div className="mt-2">
          {/* TODO: POST /auth/signout → clear session/tokens → redirect /login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6f6862] dark:text-[#8e8881] no-underline hover:text-[#9d6252] dark:hover:text-[#e1a18e] transition-colors duration-[160ms]"
          >
            <Icon name="arrowRight" size={15} />
            Sign out
          </Link>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteModal onClose={() => setShowDeleteModal(false)} />
      )}
    </AppShell>
  );
}
