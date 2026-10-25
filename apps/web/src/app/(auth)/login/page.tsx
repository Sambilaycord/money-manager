import { APP_NAME } from "@money-manager/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignInIfEnabled } from "@/components/auth/google-sign-in-if-enabled";
import { AuthHeading, AuthSwitch } from "../auth-heading";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${APP_NAME} to see your accounts, spending, budgets, and savings.`,
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <>
      <AuthHeading
        title="Welcome back"
        description="Sign in to pick up right where you left off."
      />
      {/* Separate boundaries, so the email form never waits on the Google check. */}
      <Suspense fallback={null}>
        <GoogleSignInIfEnabled />
      </Suspense>
      <Suspense>
        <LoginForm />
      </Suspense>
      <AuthSwitch prompt="New here?" href="/signup" label="Create an account" />
    </>
  );
}
