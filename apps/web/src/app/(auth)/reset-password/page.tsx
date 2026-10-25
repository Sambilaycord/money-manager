import type { Metadata } from "next";
import { AuthHeading } from "../auth-heading";
import { ResetPasswordForm } from "./reset-password-form";

// A utility step, not a page anyone searches for.
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/**
 * Reached through the emailed reset link, which /auth/confirm turns into a
 * session first; the proxy sends anyone without one to sign in.
 */
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading
        title="A fresh start"
        description="Choose a new password. You'll use it on the website and the mobile app."
      />
      <ResetPasswordForm />
    </>
  );
}
