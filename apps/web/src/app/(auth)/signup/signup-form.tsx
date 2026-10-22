"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signUp, type AuthFormState } from "../actions";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(signUp, {});

  if (state.message) return <Alert tone="info">{state.message}</Alert>;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Name" name="fullName" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "mt-2")}>
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
