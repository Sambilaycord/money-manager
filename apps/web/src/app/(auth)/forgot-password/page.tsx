import type { Metadata } from "next";
import { Suspense } from "react";
import { LOGIN_PATH } from "@/lib/routes";
import { AuthHeading, AuthSwitch } from "../auth-heading";
import { ForgotPasswordForm } from "./forgot-password-form";

// A utility step, not a page anyone searches for.
export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Forgot your password?"
        description="It happens. Enter your email and we'll send you a link to choose a new one."
      />
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <AuthSwitch prompt="Remembered it?" href={LOGIN_PATH} label="Back to sign in" />
    </>
  );
}
