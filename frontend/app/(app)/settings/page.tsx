"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import { goalById, subjectById } from "@shared/data";
import { student } from "@shared/data/student";
import { useStore } from "@/lib/store";
import { useTheme, type ThemePref } from "@/lib/theme";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const { claims, checkIns, experiences, messages, goalIds, dispatch } = useStore();
  const { pref, setPref } = useTheme();
  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [accountSaved, setAccountSaved] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const notes = experiences.length;
  const goals = Object.entries(goalIds).filter(([, g]) => g);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ student: { name, email }, goals: goalIds, claims, checkIns, experiences, messages }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trellis-record.json";
    a.click();
    URL.revokeObjectURL(url);
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
          onSubmit={(e) => {
            e.preventDefault();
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <div className={styles.panelFoot}>
            {accountSaved && <span className={styles.stamp}>Saved</span>}
            <button type="submit" className={ui.primary}>
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
          <p className={styles.prose}>
            Your record is yours alone. No teacher, admin, group organiser or classmate can see it — not now, and not as a
            “reporting feature” later. If a group you study with ever sees anything, it is anonymous totals of five people or
            more, and you can opt out of those completely.
          </p>
        </div>
      </section>

      <section className={styles.section} data-danger>
        <div className={styles.label}>
          <h2>Delete everything</h2>
          <p>Removes your goals, your sort, every check-in and every note, permanently. There is no undo.</p>
        </div>
        <div className={styles.panel}>
          <label className={styles.field}>
            <span>Type “delete my record” to confirm</span>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </label>
          <div className={styles.panelFoot}>
            <button
              type="button"
              className={ui.ghost}
              onClick={() => {
                dispatch({ type: "reset" });
                router.push("/map");
              }}
            >
              Restore the sample data
            </button>
            <button
              type="button"
              className={ui.danger}
              disabled={confirmText.trim().toLowerCase() !== "delete my record"}
              onClick={() => {
                dispatch({ type: "erase" });
                router.push("/start");
              }}
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
