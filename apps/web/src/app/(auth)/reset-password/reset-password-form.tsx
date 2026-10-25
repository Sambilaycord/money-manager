"use client";

import { validateNewPassword } from "@money-manager/shared";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { PasswordChecklist, PasswordMatch } from "@/components/auth/password-checklist";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { updatePassword } from "../actions";

export function ResetPasswordForm() {
  const { state, isPending, values, bind, submit } = useAuthForm({
    action: updatePassword,
    initial: { password: "", confirmPassword: "" },
    validate: validateNewPassword,
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <PasswordField
        id="reset-password"
        label="New password"
        autoComplete="new-password"
        required
        hint={<PasswordChecklist id="reset-password-rules" password={values.password} />}
        hintId="reset-password-rules"
        {...bind("password")}
      />
      <PasswordField
        id="reset-confirm-password"
        label="Retype new password"
        autoComplete="new-password"
        required
        hint={
          <PasswordMatch
            id="reset-password-match"
            password={values.password}
            confirmPassword={values.confirmPassword}
          />
        }
        hintId="reset-password-match"
        {...bind("confirmPassword")}
      />
      <p className="text-xs text-muted">
        Saving signs you out on your other devices, in case someone else knew your old password.
      </p>
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "mt-2 w-full", "lg")}>
        {isPending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
