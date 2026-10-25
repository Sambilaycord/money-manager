import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { CharacterCount } from "./character-count";

export const controlClassName =
  "h-10 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15 " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15";

/** The small link that sits on a field's label row, like "Forgot password?". */
export const labelLinkClassName =
  "rounded text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary";

/** The id an input's error message gets, for aria-describedby. */
export function errorIdFor(id: string): string {
  return `${id}-error`;
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={errorIdFor(id)} className="text-xs font-medium text-danger">
      {message}
    </p>
  );
}

export function FieldShell({
  id,
  label,
  labelAction,
  error,
  children,
}: {
  id: string;
  label: string;
  /** A small link on the label's row, like "Forgot password?". */
  labelAction?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {labelAction}
      </div>
      {children}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** Joins the ids an input is described by, skipping the ones not shown. */
export function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const present = ids.filter((id): id is string => Boolean(id));
  return present.length > 0 ? present.join(" ") : undefined;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  /**
   * Caps the input and shows a live "12 / 80" counter under it. Needs a
   * controlled `value`, since the counter reads the current text.
   */
  characterLimit?: number;
  /** Shown under the input in red, and marks the input invalid for screen readers. */
  error?: string;
}

export function Field({
  label,
  name,
  id = name,
  className = "",
  characterLimit,
  error,
  ...inputProps
}: FieldProps) {
  const countId = `${id}-count`;
  const length = typeof inputProps.value === "string" ? inputProps.value.length : 0;
  return (
    <FieldShell id={id} label={label} error={error}>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error && errorIdFor(id), characterLimit !== undefined && countId)}
        className={`${controlClassName} ${className}`.trim()}
        {...inputProps}
        maxLength={characterLimit ?? inputProps.maxLength}
      />
      {characterLimit && <CharacterCount id={countId} length={length} limit={characterLimit} />}
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
}

export function SelectField({ label, name, options, id = name, ...selectProps }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label}>
      <select id={id} name={name} className={controlClassName} {...selectProps}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
