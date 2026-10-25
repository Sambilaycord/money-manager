"use client";

import { EMAIL_MAX_LENGTH, validateSignIn } from "@money-manager/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field, labelLinkClassName } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { FORGOT_PASSWORD_PATH } from "@/lib/routes";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { signIn } from "../actions";

const LINK_ERRORS: Record<string, string> = {
  confirmation: "That confirmation link is invalid or has expired. Try signing in, or sign up again.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const { state, isPending, bind, submit } = useAuthForm({
    action: signIn,
    initial: { email: "", password: "" },
    validate: validateSignIn,
  });
  const error = state.error ?? LINK_ERRORS[searchParams.get("error") ?? ""];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {error && <Alert tone="error">{error}</Alert>}
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
      <Field
        id="login-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        required
        {...bind("email")}
      />
      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        required
        labelAction={
          <Link href={FORGOT_PASSWORD_PATH} className={labelLinkClassName}>
            Forgot password?
          </Link>
        }
        {...bind("password")}
      />
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "mt-2 w-full", "lg")}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
