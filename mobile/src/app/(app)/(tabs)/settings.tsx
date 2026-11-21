// The Settings tab (the web's /settings, the same sections and words): account, theme, AI
// usage, the record (export), privacy, delete everything, and the phone's own section:
// this app's version and the update check (src/lib/updates.ts).

import type { AiUsage } from "@shared/types";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import { api, ApiError } from "@/lib/api";
import { checkForUpdate, installedVersion, RELEASES_URL } from "@/lib/updates";
import { useStore } from "@/store/store";
import { useTheme, type ThemePref } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Frame } from "@/ui/Frame";
import { Mark } from "@/ui/Mark";
import { Segmented } from "@/ui/Segmented";
import { T } from "@/ui/Text";
import { backAt, basicReason, NEARLY, resetClock, resetWeekday } from "../../../../../frontend/lib/usage";

export default function Settings() {
  const { student, usage, claims, checkIns, experiences, act } = useStore();
  const { pref, setPref } = useTheme();
  const [name, setName] = useState(student?.name ?? "");

  // Opening Settings reads the allowance again, as on the web.
  useEffect(() => {
    void act.refreshUsage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Frame
      bottomInset={false}
      header={
        <View style={styles.top}>
          <Mark size={20} />
          <T size="section" weight={600}>
            Settings
          </T>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Section title="Account" note="Your name and the email you sign in with.">
          <Field label="Name" value={name} onChangeText={setName} maxLength={60} />
          <Button label="Save name" disabled={!name.trim() || name.trim() === student?.name} onPress={() => void act.rename(name.trim())} />
          <T tone="muted">{student?.email}</T>
          <Button kind="ghost" label="Log out" onPress={() => void act.signOut()} />
        </Section>

        <Section title="Theme" note="Follows your phone until you choose. Saves as soon as you pick.">
          <Segmented<ThemePref>
            value={pref}
            onChange={setPref}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Section>

        {usage && <Usage usage={usage} />}

        <Section title="Your record" note="Everything Trellis knows about you. You can read all of it, change any of it, and take it with you.">
          <Figures rows={[["Topics you sorted at signup", claims.length], ["Check-ins", checkIns.length], ["Answers to follow-up questions", experiences.length]]} />
          <ExportButton />
        </Section>

        <Section title="Privacy" note="A design rule, not a policy.">
          <T>Your record is private. No other student, teacher or group sees it, and Trellis has no screen that shows one person’s record to another.</T>
          <T tone="muted">
            To be exact about the limits: the person who runs Trellis can technically reach the database, as on any hosted service. They do not read records, and there is no admin screen for it. What you
            type to the helper is read by an AI model inside our own AWS account; it is not used to train models and is not shared with the model’s maker.
          </T>
        </Section>

        <AppSection />

        <Section title="Delete everything" note="Removes your account, your goals, your sort, every check-in and every note, permanently. There is no undo. Backups that still hold it are deleted within 14 days." danger>
          <DeleteAccount hasPassword={student?.hasPassword ?? false} />
        </Section>
      </ScrollView>
    </Frame>
  );
}

function Section({ title, note, children, danger }: { title: string; note: string; children: ReactNode; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: c.rule }]}>
      <T size="section" weight={600} tone={danger ? "stuck" : "text"}>
        {title}
      </T>
      <T size="small" tone="muted">
        {note}
      </T>
      <View style={[styles.panel, { backgroundColor: c.raised }]}>{children}</View>
    </View>
  );
}

function Figures({ rows }: { rows: [string, number][] }) {
  return (
    <View style={{ gap: 6 }}>
      {rows.map(([label, n]) => (
        <View key={label} style={styles.figure}>
          <T tone="muted" style={{ flex: 1 }}>
            {label}
          </T>
          <T weight={600} tabular>
            {n}
          </T>
        </View>
      ))}
    </View>
  );
}

/** GET /api/export (everything the server holds) written to a file and handed to Android's share sheet. */
function ExportButton() {
  const { fail } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      icon="download"
      label={busy ? "Preparing…" : "Export my record"}
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          const data = await api("/export");
          const file = new File(Paths.cache, `trellis-export-${new Date().toISOString().slice(0, 10)}.json`);
          if (file.exists) file.delete();
          file.write(JSON.stringify(data, null, 2));
          await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your Trellis record" });
        } catch (err) {
          fail(err);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

function Usage({ usage }: { usage: AiUsage }) {
  const reason = basicReason(usage);
  return (
    <Section title="AI usage" note="An AI model reads what you type to the helper. Each account has a daily and a weekly allowance, shared across your subjects. The Got it, Partly and Stuck buttons never use it.">
      {usage.on ? (
        <>
          <Bar title="Today" pct={usage.day.usedPct} resets={`Resets at ${resetClock(usage.day.resetsAt)}`} />
          <Bar title="This week" pct={usage.week.usedPct} resets={`Resets ${resetWeekday(usage.week.resetsAt)} at ${resetClock(usage.week.resetsAt)}`} />
          {reason && (
            <T>
              {reason} The helper still answers in basic mode until {backAt(usage)}: it reads your message with simple rules instead of the AI, so it may ask you to pick the topic more often. Nothing you’ve
              saved is affected.
            </T>
          )}
        </>
      ) : (
        <T>AI reading is off on this server. The helper reads your messages with its built-in rules.</T>
      )}
    </Section>
  );
}

/** Percent only, never money (design: students see a percentage and a reset time). */
function Bar({ title, pct, resets }: { title: string; pct: number; resets: string }) {
  const { c } = useTheme();
  const near = pct >= NEARLY;
  return (
    <View style={{ gap: 6 }} accessibilityRole="progressbar" accessibilityLabel={`${title}: AI allowance used`} accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={styles.figure}>
        <T weight={500} style={{ flex: 1 }}>
          {title}
        </T>
        <T tabular tone={near ? "shakyInk" : "text"}>
          {pct}% used
        </T>
      </View>
      <View style={[styles.track, { backgroundColor: c.active }]}>
        <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: near ? c.shaky : c.text }} />
      </View>
      <T size="small" tone="muted">
        {resets}
      </T>
    </View>
  );
}

function AppSection() {
  const [state, setState] = useState<string | null>(null);
  return (
    <Section title="This app" note="Trellis for Android. Updates come from the download page, not the Play Store.">
      <T>Version {installedVersion()}</T>
      <Button
        label="Check for updates"
        onPress={async () => {
          setState("Checking…");
          try {
            const release = await checkForUpdate();
            if (!release) return setState("You have the latest version.");
            setState(null);
            Alert.alert(`Trellis ${release.version} is available`, "Download it, then open the file to install it over this one. Your sign-in and your map stay as they are.", [
              { text: "Later", style: "cancel" },
              { text: "Download", onPress: () => void Linking.openURL(release.apk ?? release.page) },
            ]);
          } catch {
            setState("Couldn't check for updates. Try again later.");
          }
        }}
      />
      {state && <T tone="muted">{state}</T>}
      <Button kind="ghost" label="Open the download page" trailing="external" onPress={() => void Linking.openURL(RELEASES_URL)} />
    </Section>
  );
}

/**
 * The server asks a password account for its password again (403 when wrong); a Google-only
 * account has none to ask for. Shown next to the field, not in the toast.
 */
function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const { act } = useStore();
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!asking) return <Button kind="danger" label="Delete everything" haptic="warning" onPress={() => setAsking(true)} />;
  return (
    <View style={{ gap: 10 }}>
      <T>Your account, goals, sort, check-ins and notes are removed for good. There is no undo.</T>
      {hasPassword && <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />}
      {error && <T tone="stuck">{error}</T>}
      <Button
        kind="danger"
        label={busy ? "Deleting…" : "Delete my account"}
        haptic="warning"
        disabled={busy || (hasPassword && !password)}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await act.deleteAccount(hasPassword ? password : undefined);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
            setBusy(false);
          }
        }}
      />
      <Button kind="ghost" label="Keep my account" onPress={() => (setAsking(false), setPassword(""), setError(null))} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  page: { paddingBottom: 32 },
  section: { padding: 16, gap: 6, borderTopWidth: 1 },
  panel: { marginTop: 8, padding: 14, borderRadius: 8, gap: 12 },
  figure: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
});
