"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { controlClassName, describedBy, errorIdFor, FieldShell } from "./field";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  name: string;
  id: string;
  error?: string;
  /** A small link on the label's row, like "Forgot password?". */
  labelAction?: ReactNode;
  /** Live guidance under the input, such as the rules checklist. */
  hint?: ReactNode;
  /** The id of `hint`, so screen readers read it with the input. */
  hintId?: string;
}

/** A password input with a button to show what was typed, which helps on phones. */
export function PasswordField({
  label,
  name,
  id,
  error,
  labelAction,
  hint,
  hintId,
  className = "",
  ...inputProps
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} labelAction={labelAction} error={error}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error && errorIdFor(id), hint ? hintId : undefined)}
          className={`${controlClassName} w-full pr-11 ${className}`.trim()}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          {isVisible ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
        </button>
      </div>
      {hint}
    </FieldShell>
  );
}
