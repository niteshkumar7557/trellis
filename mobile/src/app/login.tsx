import { router } from "expo-router";
import { AuthForm } from "@/auth/AuthForm";
import { useStore } from "@/store/store";

export default function Login() {
  const { act } = useStore();
  // Signed in: load the record; the store's mode turns "live" and the router swaps these
  // screens for the app's (see _layout.tsx).
  return <AuthForm mode="login" onSignedIn={() => void act.signedIn()} onSwitch={() => router.replace("/signup")} />;
}
