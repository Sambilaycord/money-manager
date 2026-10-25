"use client";

import { EMAIL_MAX_LENGTH, FULL_NAME_MAX_LENGTH, validateSignUp } from "@money-manager/shared";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { PasswordChecklist, PasswordMatch } from "@/components/auth/password-checklist";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { signUp } from "../actions";

export function SignupForm() {
  const { state, isPending, values, bind, submit } = useAuthForm({
    action: signUp,
    initial: { fullName: "", email: "", password: "", confirmPassword: "" },
    validate: validateSignUp,
  });

  if (state.message) return <Alert tone="info">{state.message}</Alert>;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        id="signup-full-name"
        label="Name"
        autoComplete="name"
        maxLength={FULL_NAME_MAX_LENGTH}
        required
        {...bind("fullName")}
      />
      <Field
        id="signup-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        required
        {...bind("email")}
      />
      <PasswordField
        id="signup-password"
        label="Password"
        autoComplete="new-password"
        required
        hint={<PasswordChecklist id="signup-password-rules" password={values.password} />}
        hintId="signup-password-rules"
        {...bind("password")}
      />
      <PasswordField
        id="signup-confirm-password"
        label="Retype password"
        autoComplete="new-password"
        required
        hint={
          <PasswordMatch
            id="signup-password-match"
            password={values.password}
            confirmPassword={values.confirmPassword}
          />
        }
        hintId="signup-password-match"
        {...bind("confirmPassword")}
      />
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "mt-2 w-full", "lg")}>
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
