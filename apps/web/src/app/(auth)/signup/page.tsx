import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">
        One account for the website and the mobile app.
      </p>
      <SignupForm />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
          Sign in
        </Link>
      </p>
    </>
  );
}
