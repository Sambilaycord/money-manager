import { APP_NAME, APP_TAGLINE } from "@money-manager/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignInIfEnabled } from "@/components/auth/google-sign-in-if-enabled";
import { AuthHeading, AuthSwitch } from "../auth-heading";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create a free account",
  description:
    `Create a free ${APP_NAME} account to track your money on the web and your phone. ${APP_TAGLINE}`,
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <>
      <AuthHeading
        title="Let's get started"
        description="One free, private account for the website and the mobile app. It takes a minute."
      />
      {/* Asks Supabase whether Google sign-in is on, so the form doesn't wait on it. */}
      <Suspense fallback={null}>
        <GoogleSignInIfEnabled />
      </Suspense>
      <SignupForm />
      <AuthSwitch prompt="Already have an account?" href="/login" label="Sign in" />
    </>
  );
}
