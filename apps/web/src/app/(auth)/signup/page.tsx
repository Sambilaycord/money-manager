import type { Metadata } from "next";
import { AuthHeading, AuthSwitch } from "../auth-heading";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <AuthHeading
        title="Let's get started"
        description="One free, private account for the website and the mobile app. It takes a minute."
      />
      <SignupForm />
      <AuthSwitch prompt="Already have an account?" href="/login" label="Sign in" />
    </>
  );
}
