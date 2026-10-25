"use client";

import { validatePasswordChange } from "@money-manager/shared";
import Link from "next/link";
import { PasswordChecklist, PasswordMatch } from "@/components/auth/password-checklist";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { labelLinkClassName } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { FORGOT_PASSWORD_PATH } from "@/lib/routes";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const { state, isPending, values, bind, submit } = useAuthForm({
    action: changePassword,
    initial: { currentPassword: "", password: "", confirmPassword: "" },
    validate: validatePasswordChange,
  });

  if (state.message) return <Alert tone="info">{state.message}</Alert>;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <PasswordField
        id="settings-current-password"
        label="Current password"
        autoComplete="current-password"
        required
        labelAction={
          <Link href={FORGOT_PASSWORD_PATH} className={labelLinkClassName}>
            Forgot it?
          </Link>
        }
        {...bind("currentPassword")}
      />
      <PasswordField
        id="settings-new-password"
        label="New password"
        autoComplete="new-password"
        required
        hint={<PasswordChecklist id="settings-new-password-rules" password={values.password} />}
        hintId="settings-new-password-rules"
        {...bind("password")}
      />
      <PasswordField
        id="settings-confirm-password"
        label="Retype new password"
        autoComplete="new-password"
        required
        hint={
          <PasswordMatch
            id="settings-password-match"
            password={values.password}
            confirmPassword={values.confirmPassword}
          />
        }
        hintId="settings-password-match"
        {...bind("confirmPassword")}
      />
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
          {isPending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
