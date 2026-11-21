import { router } from "expo-router";
import { AuthForm } from "@/auth/AuthForm";
import { useStore } from "@/store/store";

export default function Signup() {
  const { act } = useStore();
  return <AuthForm mode="signup" onSignedIn={() => void act.signedIn()} onSwitch={() => router.replace("/login")} />;
}
