"use client";

import {
  startTransition,
  useActionState,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { AuthFormState } from "@/lib/auth-form-state";

type Validation<Field extends string> =
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<Field, string>> };

interface AuthFormOptions<Field extends string> {
  action: (previous: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  initial: Record<Field, string>;
  /** The same shared rules the server applies, run as the person types. */
  validate: (values: Record<Field, string>) => Validation<Field>;
}

/**
 * Controlled auth form state. A field's own problem shows once it has been
 * left or the form submitted, so nobody is scolded mid-word; a problem the
 * server found ("already exists") shows until that field is changed.
 */
export function useAuthForm<Field extends string>({ action, initial, validate }: AuthFormOptions<Field>) {
  const [state, dispatch, isPending] = useActionState<AuthFormState, FormData>(action, {});
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState<Record<Field, string> | null>(null);

  const check = validate(values);
  const clientErrors: Partial<Record<Field, string>> = check.ok ? {} : check.fieldErrors;

  const errorFor = (field: Field): string | undefined => {
    if (touched[field] || submitted) {
      const problem = clientErrors[field];
      if (problem) return problem;
    }
    if (submitted && submitted[field] === values[field]) return state.fieldErrors?.[field];
    return undefined;
  };

  const bind = (field: Field) => ({
    name: field,
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    error: errorFor(field),
  });

  // Submitted by hand rather than through <form action>: React resets a form
  // after every action, which would wipe what the person typed on an error.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitted(values);
    if (!check.ok) {
      // After React has marked the fields, take the person to the first one.
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const formData = new FormData(form);
    startTransition(() => dispatch(formData));
  };

  return { state, isPending, values, bind, submit };
}
