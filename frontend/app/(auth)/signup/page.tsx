import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Start your map · Trellis" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
