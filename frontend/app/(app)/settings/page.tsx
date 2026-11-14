"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import { goalById, subjectById } from "@shared/data";
import { ApiError, api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useTheme, type ThemePref } from "@/lib/theme";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const { claims, checkIns, experiences, messages, goalIds, student, mode, act, fail } = useStore();
  const { pref, setPref } = useTheme();
  const [name, setName] = useState(student.name);
  const [accountSaved, setAccountSaved] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const notes = experiences.length;
  const goals = Object.entries(goalIds).filter(([, g]) => g);
  const live = mode === "live";
  // Deleting a password account asks for the password again (backend-design.md §4).
  const needsPassword = live && student.hasPassword;

  const download = (data: unknown, filename: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live: the server's export, which is everything it holds (not just what this page has
  // loaded: older chat messages are included). Demo: what this browser holds.
  const exportData = async () => {
    if (!live) return download({ student, goals: goalIds, claims, checkIns, experiences, messages }, "trellis-sample.json");
    try {
      download(await api("/export"), `trellis-export-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      fail(err);
    }
  };

  const deleteRecord = async () => {
    setDeleteError(null);
    try {
      await act.erase(needsPassword ? password : undefined);
      router.push(live ? "/" : "/start");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <section className={styles.section}>
        <div className={styles.label}>
          <h2>Account</h2>
          <p>Your name and the email you sign in with.</p>
        </div>
        <form
          className={styles.panel}
          onSubmit={async (e) => {
            e.preventDefault();
            await act.rename(name.trim());
            setAccountSaved(true);
            setTimeout(() => setAccountSaved(false), 2000);
          }}
        >
          <label className={styles.field}>
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className={styles.field}>
            <span>Email</span>
            {/* Read-only: changing it needs a way to prove the new address is yours, which
                comes with email in a later version (backend-design.md §4). */}
            <input type="email" value={student.email} readOnly aria-readonly="true" />
          </label>
          <div className={styles.panelFoot}>
            {accountSaved && <span className={styles.stamp}>Saved</span>}
            {live && (
              <button
                type="button"
                className={ui.ghost}
                onClick={async () => {
                  await act.signOut();
                  router.push("/");
                }}
              >
                Log out
              </button>
            )}
            <button type="submit" className={ui.primary} disabled={!name.trim() || name.trim() === student.name}>
              Save
            </button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.label}>
          <h2>Theme</h2>
          <p>Follows your system until you choose. Saves as soon as you pick.</p>
        </div>
        <div className={styles.panel}>
          <div className={styles.inline}>
            <div className={ui.segmented} role="radiogroup" aria-label="Theme">
              {(["system", "light", "dark"] as ThemePref[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={pref === p}
                  className={ui.segment}
                  onClick={() => {
                    setPref(p);
                    setThemeSaved(true);
                    setTimeout(() => setThemeSaved(false), 1600);
                  }}
                >
                  <Icon name={p === "light" ? "sun" : p === "dark" ? "moon" : "settings"} size={14} />
                  {p === "system" ? "System" : p === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
            {themeSaved && <span className={styles.stamp}>Saved</span>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.label}>
          <h2>Your record</h2>
          <p>Everything Trellis knows about you. You can read all of it, change any of it, and take it with you.</p>
        </div>
        <div className={styles.panel}>
          <dl className={styles.facts}>
            <div>
              <dt>Goals</dt>
              <dd>
                {goals.length
                  ? goals.map(([s, g]) => `${goalById.get(g!)?.name} (${subjectById.get(s as never)?.shortName})`).join(" · ")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Topics you sorted at signup</dt>
              <dd className="num">{claims.length}</dd>
            </div>
            <div>
              <dt>Check-ins</dt>
              <dd className="num">{checkIns.length}</dd>
            </div>
            <div>
              <dt>Answers to follow-up questions</dt>
              <dd className="num">{notes}</dd>
            </div>
          </dl>
          <div className={styles.panelFoot}>
            <Link href="/check-ins" className={ui.btn}>
              Read and edit check-ins
            </Link>
            <button type="button" className={ui.btn} onClick={exportData}>
              <Icon name="download" />
              Download as JSON
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.label}>
          <h2>Privacy</h2>
          <p>A design rule, not a policy.</p>
        </div>
        <div className={styles.panel}>
          {/* The exact promise from design.md §11, limits included. */}
          <p className={styles.prose}>
            Your record is private. No other student, teacher or group sees it, and Trellis has no screen that shows one
            person&rsquo;s record to another.
          </p>
          <p className={styles.prose}>
            To be exact about the limits: the person who runs Trellis can technically reach the database, as on any hosted
            service. They do not read records, and there is no admin screen for it. What you type to the helper is read by an
            AI model inside our own AWS account; it is not used to train models and is not shared with the model&rsquo;s maker.
          </p>
        </div>
      </section>

      <section className={styles.section} data-danger>
        <div className={styles.label}>
          <h2>Delete everything</h2>
          <p>
            Removes your account, your goals, your sort, every check-in and every note, permanently. There is no undo. Backups
            that still hold it are deleted within 14 days.
          </p>
        </div>
        <div className={styles.panel}>
          <label className={styles.field}>
            <span>Type “delete my record” to confirm</span>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </label>
          {needsPassword && (
            <label className={styles.field}>
              <span>Your password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
          )}
          {deleteError && (
            <p className={styles.prose} role="alert">
              {deleteError}
            </p>
          )}
          <div className={styles.panelFoot}>
            {!live && (
              <button
                type="button"
                className={ui.ghost}
                onClick={() => {
                  act.reset();
                  router.push("/map");
                }}
              >
                Restore the sample data
              </button>
            )}
            <button
              type="button"
              className={ui.danger}
              disabled={confirmText.trim().toLowerCase() !== "delete my record" || (needsPassword && !password)}
              onClick={deleteRecord}
            >
              <Icon name="trash" />
              Delete my record
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
