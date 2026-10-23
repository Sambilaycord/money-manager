import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { CharacterCount } from "./character-count";

const controlClassName =
  "h-10 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15";

function FieldShell({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  /**
   * Caps the input and shows a live "12 / 80" counter under it. Needs a
   * controlled `value`, since the counter reads the current text.
   */
  characterLimit?: number;
}

export function Field({
  label,
  name,
  id = name,
  className = "",
  characterLimit,
  ...inputProps
}: FieldProps) {
  const countId = `${id}-count`;
  const length = typeof inputProps.value === "string" ? inputProps.value.length : 0;
  return (
    <FieldShell id={id} label={label}>
      <input
        id={id}
        name={name}
        aria-describedby={characterLimit ? countId : undefined}
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
