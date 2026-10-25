import { passwordRules } from "@money-manager/shared";
import { CheckIcon } from "@/components/icons";

/**
 * Every password rule, ticked off as it is met. Read with the input through
 * aria-describedby rather than announced on each keystroke, which would be noise.
 */
export function PasswordChecklist({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
      {passwordRules(password).map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1.5 ${rule.met ? "text-income" : "text-muted"}`}
        >
          <span
            aria-hidden="true"
            className={`flex size-3.5 shrink-0 items-center justify-center rounded-full ${
              rule.met ? "bg-mint" : "border border-border"
            }`}
          >
            {rule.met && <CheckIcon width={10} height={10} strokeWidth={3} />}
          </span>
          {rule.label}
          <span className="sr-only">{rule.met ? "(done)" : "(still needed)"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Confirms a matching retype; a mismatch is reported as the field's error instead. */
export function PasswordMatch({ id, password, confirmPassword }: { id: string; password: string; confirmPassword: string }) {
  const matches = confirmPassword.length > 0 && confirmPassword === password;
  return (
    <p id={id} className={`text-xs ${matches ? "text-income" : "sr-only"}`}>
      {matches ? "Passwords match." : ""}
    </p>
  );
}
