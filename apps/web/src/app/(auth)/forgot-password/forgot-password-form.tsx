"use client";

import { EMAIL_MAX_LENGTH, emailProblem } from "@money-manager/shared";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { requestPasswordReset } from "../actions";

function validateEmail(values: { email: string }) {
  const problem = emailProblem(values.email);
  return problem ? { ok: false as const, fieldErrors: { email: problem } } : { ok: true as const };
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { state, isPending, bind, submit } = useAuthForm({
    action: requestPasswordReset,
    initial: { email: "" },
    validate: validateEmail,
  });
  const linkExpired = searchParams.get("error") === "expired";

  if (state.message) return <Alert tone="info">{state.message}</Alert>;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {!state.error && linkExpired && (
        <Alert tone="error">That reset link is invalid or has expired. Request a new one below.</Alert>
      )}
      <Field
        id="forgot-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        required
        {...bind("email")}
      />
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "mt-2 w-full", "lg")}>
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
