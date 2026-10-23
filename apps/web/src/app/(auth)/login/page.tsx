import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">Sign in to see your accounts and spending.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
          Create an account
        </Link>
      </p>
    </>
  );
}
