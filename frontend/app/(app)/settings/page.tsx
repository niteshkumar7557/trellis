"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [confirming, setConfirming] = useState(false);

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

  // Throws back to the dialog on failure, so it can show the error where the student is.
  const deleteRecord = async (password?: string) => {
    await act.erase(needsPassword ? password : undefined);
    router.push(live ? "/" : "/start");
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
            {/* Disabled, not just read-only: read-only looked editable and invited a click
                that did nothing. Changing it needs a way to prove the new address is yours,
                which comes with email in a later version (backend-design.md §4). A disabled
                input isn't submitted with the form, which is fine: the form only saves the
                name. */}
            <input type="email" value={student.email} disabled aria-describedby="email-note" />
            <small id="email-note" className={styles.hint}>
              The email you sign in with can&rsquo;t be changed yet.
            </small>
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
            <button type="button" className={ui.danger} onClick={() => setConfirming(true)}>
              <Icon name="trash" />
              Delete my record…
            </button>
          </div>
        </div>
        {confirming && (
          <ConfirmDelete
            needsPassword={needsPassword}
            onCancel={() => setConfirming(false)}
            onConfirm={deleteRecord}
          />
        )}
      </section>
    </div>
  );
}

const PHRASE = "delete my record";

/**
 * The last step before deleting, as a pop-up: typing the phrase (and the password, for a
 * password account) only appears once the student has asked to delete, so the settings
 * page doesn't show a half-filled destructive form to everyone who opens it.
 *
 * A native <dialog> opened with showModal(): the browser traps focus inside it, closes it
 * on Esc, makes the page behind inert and puts it above everything (the "top layer").
 * Writing that by hand, as the ⌘K search does for its own reasons, is a lot more code to
 * get the same thing.
 */
function ConfirmDelete({
  needsPassword,
  onCancel,
  onConfirm,
}: {
  needsPassword: boolean;
  onCancel: () => void;
  onConfirm: (password?: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = text.trim().toLowerCase() === PHRASE && (!needsPassword || password.length > 0);

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="delete-title"
      aria-describedby="delete-what"
      // Esc fires "cancel"; let the parent unmount it instead of the browser closing it
      // behind React's back.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      // A press on the dim area outside the box lands on the <dialog> element itself.
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <form
        className={styles.dialogBox}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready) return;
          setBusy(true);
          setError(null);
          try {
            await onConfirm(password);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong.");
            setBusy(false);
          }
        }}
      >
        <h2 id="delete-title" className={styles.dialogTitle}>
          Delete your record?
        </h2>
        <p id="delete-what" className={styles.prose}>
          Your account, goals, sort, check-ins and notes are removed for good. There is no undo.
        </p>
        <label className={styles.field}>
          <span>Type &ldquo;{PHRASE}&rdquo; to confirm</span>
          <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoFocus />
        </label>
        {needsPassword && (
          <label className={styles.field}>
            <span>Your password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
        )}
        {error && (
          <p className={styles.dialogError} role="alert">
            {error}
          </p>
        )}
        <div className={styles.panelFoot}>
          <button type="button" className={ui.ghost} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={ui.danger} disabled={!ready || busy}>
            <Icon name="trash" />
            {busy ? "Deleting…" : "Delete my record"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
