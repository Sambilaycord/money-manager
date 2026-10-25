"use client";

import { FULL_NAME_MAX_LENGTH } from "@money-manager/shared";
import { startTransition, useActionState, type FormEvent } from "react";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CurrencyOption } from "@/lib/currencies";
import { updateProfile, type SettingsFormState } from "./actions";

interface ProfileFormProps {
  fullName: string | null;
  email: string;
  defaultCurrency: string;
  currencyOptions: CurrencyOption[];
}

export function ProfileForm({ fullName, email, defaultCurrency, currencyOptions }: ProfileFormProps) {
  const [state, dispatch, isPending] = useActionState<SettingsFormState, FormData>(updateProfile, {});

  // Submitted by hand rather than through <form action>: React resets a form
  // after every action, which would blank the currency combobox, whose text
  // React doesn't own.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.saved && !isPending && <Alert tone="info">Saved.</Alert>}
      <Field
        id="settings-full-name"
        label="Name"
        name="fullName"
        defaultValue={fullName ?? ""}
        placeholder="How the app greets you"
        maxLength={FULL_NAME_MAX_LENGTH}
        autoComplete="name"
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">Email</p>
        <p className="text-sm text-muted break-all">{email}</p>
      </div>
      <div className="sm:max-w-xs">
        <CurrencyCombobox
          label="Default currency"
          name="defaultCurrency"
          options={currencyOptions}
          defaultCode={defaultCurrency}
        />
      </div>
      <p className="text-xs text-muted">
        New accounts and budgets start in your default currency. Existing ones keep theirs.
      </p>
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
