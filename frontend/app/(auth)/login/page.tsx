import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Log in · Trellis" };

export default function LoginPage() {
  // Suspense: the form reads ?error= from the URL, which Next renders on the client.
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
