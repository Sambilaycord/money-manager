import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading, AuthSwitch } from "../auth-heading";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading
        title="Welcome back"
        description="Sign in to pick up right where you left off."
      />
      <Suspense>
        <LoginForm />
      </Suspense>
      <AuthSwitch prompt="New here?" href="/signup" label="Create an account" />
    </>
  );
}
