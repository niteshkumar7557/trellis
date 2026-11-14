import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Set a new password · Trellis" };

// The admin's one-time link lands here: /reset?token=… (backend-design.md §4, "Forgotten
// passwords"). A server component reads the token from the URL and hands it to the form.
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetForm token={token ?? ""} />;
}
