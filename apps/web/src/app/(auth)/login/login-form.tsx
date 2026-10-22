"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signIn, type AuthFormState } from "../actions";

const LINK_ERRORS: Record<string, string> = {
  confirmation: "That confirmation link is invalid or has expired. Try signing in, or sign up again.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(signIn, {});
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""];
  const error = state.error ?? linkError;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "mt-2")}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
