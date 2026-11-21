// Log in and Sign up, one form (the web's app/(auth)/AuthForm.tsx, the same words).
// Continue with Google first, then email and password. Errors from the server are shown
// under the form in the server's own words; the API already words them for students.

import type { Student } from "@shared/types";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/google";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Frame } from "@/ui/Frame";
import { Mark } from "@/ui/Mark";
import { T } from "@/ui/Text";

// Where "Forgot your password?" sends the email, as on the web (an env value, never
// written into the code). Without it, the text just says "Email the admin".
const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL;

interface Props {
  mode: "login" | "signup";
  onSignedIn: (student: Student) => void;
  onSwitch: () => void;
}

export function AuthForm({ mode, onSignedIn, onSwitch }: Props) {
  const { c } = useTheme();
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = email.trim() !== "" && password !== "" && (!signup || name.trim() !== "");

  /** Both ways in end here: run it, show the server's words if it fails. */
  const attempt = async (work: () => Promise<Student | null>) => {
    setBusy(true);
    setError(null);
    try {
      const student = await work();
      if (student) onSignedIn(student);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    attempt(() =>
      // The server trims and lower-cases the email itself (zod); the app only trims the
      // spaces a phone keyboard likes to add.
      signup
        ? signIn("register", { name: name.trim(), email: email.trim(), password })
        : signIn("login", { email: email.trim(), password }),
    );

  return (
    <Frame>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Mark size={22} />
            <T size="section" weight={600}>
              Trellis
            </T>
          </View>

          <View style={styles.form}>
            <T size="figure" weight={600}>
              {signup ? "Start your map" : "Welcome back"}
            </T>
            <T size="lede" tone="muted" style={styles.lede}>
              {signup ? "Two minutes to set up. No streaks, no reminders, no one watching." : "Your map is where you left it."}
            </T>

            <Button label="Continue with Google" icon="google" disabled={busy} onPress={() => attempt(signInWithGoogle)} />
            <T size="small" tone="muted" style={styles.or}>
              or with email
            </T>

            <View style={styles.fields}>
              {signup && <Field label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={60} />}
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={signup ? "new-password" : "current-password"}
                maxLength={72}
                hint={signup ? "At least 8 characters." : undefined}
                returnKeyType="go"
                onSubmitEditing={() => ready && submit()}
              />
              {error && (
                <View accessibilityRole="alert" style={[styles.error, { backgroundColor: c.stuckBg }]}>
                  <T tone="stuckInk">{error}</T>
                </View>
              )}
              <Button kind="primary" label={busy ? "One moment…" : signup ? "Create account" : "Log in"} disabled={!ready || busy} onPress={submit} />
            </View>

            {!signup && (
              <T size="small" tone="muted" style={styles.fine}>
                Forgot your password?{" "}
                {ADMIN_EMAIL ? (
                  <T size="small" weight={500} onPress={() => Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=Trellis%20password%20reset`)}>
                    Email the admin
                  </T>
                ) : (
                  "Email the admin"
                )}{" "}
                from the address you signed up with, and you’ll get a link to set a new one.
              </T>
            )}

            <Pressable accessibilityRole="link" onPress={onSwitch} style={styles.switch} hitSlop={8}>
              <T tone="muted">
                {signup ? "Already have a map? " : "New here? "}
                <T weight={500} style={{ textDecorationLine: "underline" }}>
                  {signup ? "Log in" : "Start your map"}
                </T>
              </T>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Frame>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 40, flexGrow: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  form: { flex: 1, justifyContent: "center", paddingVertical: 32 },
  lede: { marginTop: 8, marginBottom: 28 },
  or: { textAlign: "center", marginVertical: 16 },
  fields: { gap: 16 },
  error: { padding: 12, borderRadius: 8 },
  fine: { marginTop: 20 },
  switch: { marginTop: 24, minHeight: 44, justifyContent: "center" },
});
