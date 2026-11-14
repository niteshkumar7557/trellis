import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Start your map · Trellis" };

export default function SignupPage() {
  // Suspense: the form reads ?error= from the URL, which Next renders on the client.
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
