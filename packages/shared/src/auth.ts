// Sign-in, sign-up, and password rules, shared so the website and the mobile
// app judge input the same way. Supabase's own auth settings enforce the same
// password rules (supabase/config.toml), because the mobile app signs up
// directly and never passes through these checks.

/** Matches the profiles.full_name CHECK constraint. */
export const FULL_NAME_MAX_LENGTH = 120;

export const PASSWORD_MIN_LENGTH = 8;
/** Supabase hashes passwords with bcrypt, which only reads the first 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;
/** The longest address the email standards allow. */
export const EMAIL_MAX_LENGTH = 254;

export type PasswordRuleId = "length" | "lowercase" | "uppercase" | "number";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  met: boolean;
}

/** Every rule with whether `password` meets it, for a live checklist. */
export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: "lowercase", label: "A lowercase letter", met: /\p{Ll}/u.test(password) },
    { id: "uppercase", label: "An uppercase letter", met: /\p{Lu}/u.test(password) },
    { id: "number", label: "A number", met: /\p{Nd}/u.test(password) },
  ];
}

export function passwordProblem(password: string): string | null {
  if (!password) return "Enter a password.";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "That password is too long. Keep it under 72 characters.";
  }
  const unmet = passwordRules(password).filter((rule) => !rule.met);
  if (unmet.length === 0) return null;
  return `Your password needs ${unmet.map((rule) => rule.label.toLowerCase()).join(", ")}.`;
}

/** Trimmed and lowercased, so "Ana@Mail.com " and "ana@mail.com" are one account. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Deliberately loose: one @, something on each side, a dot in the domain, no
// spaces. Whether the mailbox exists is only proven by the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailProblem(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return "Enter your email address.";
  if (normalized.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(normalized)) {
    return "Enter a valid email address, like ana@example.com.";
  }
  return null;
}

// Letters from any script, with the marks some of them combine with, plus the
// spaces, apostrophes, hyphens, and periods that names use: "María José",
// "O'Brien", "Jean-Luc", "Ma. Cristina". Digits and symbols are left out.
const NAME_PATTERN = /^[\p{L}\p{M}](?:[\p{L}\p{M}'’. -]*[\p{L}\p{M}.])?$/u;

/** Trims and collapses spaces, so stray spacing never reaches the database. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function nameProblem(name: string): string | null {
  const normalized = normalizeName(name);
  if (!normalized) return "Enter your name.";
  if (normalized.length > FULL_NAME_MAX_LENGTH) {
    return `Keep your name to ${FULL_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!NAME_PATTERN.test(normalized)) {
    return "Use letters, spaces, and ' - . only.";
  }
  return null;
}

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type AuthValidation<Field extends string, Value> =
  | { ok: true; value: Value }
  | { ok: false; fieldErrors: FieldErrors<Field> };

function collect<Field extends string, Value>(
  problems: Record<Field, string | null>,
  value: Value,
): AuthValidation<Field, Value> {
  const fieldErrors: FieldErrors<Field> = {};
  for (const [field, problem] of Object.entries(problems) as [Field, string | null][]) {
    if (problem) fieldErrors[field] = problem;
  }
  return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: true, value };
}

function confirmationProblem(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return "Type your password again.";
  return confirmPassword === password ? null : "The passwords don't match.";
}

export type SignUpField = "fullName" | "email" | "password" | "confirmPassword";

export function validateSignUp(input: Record<SignUpField, string>) {
  return collect<SignUpField, { fullName: string; email: string; password: string }>(
    {
      fullName: nameProblem(input.fullName),
      email: emailProblem(input.email),
      password: passwordProblem(input.password),
      confirmPassword: confirmationProblem(input.password, input.confirmPassword),
    },
    {
      fullName: normalizeName(input.fullName),
      email: normalizeEmail(input.email),
      password: input.password,
    },
  );
}

export type SignInField = "email" | "password";

/**
 * Only checks that something plausible was typed: an existing account's
 * password may predate today's rules, so it isn't held to them here.
 */
export function validateSignIn(input: Record<SignInField, string>) {
  return collect<SignInField, { email: string; password: string }>(
    {
      email: emailProblem(input.email),
      password: input.password ? null : "Enter your password.",
    },
    { email: normalizeEmail(input.email), password: input.password },
  );
}

export type NewPasswordField = "password" | "confirmPassword";

export function validateNewPassword(input: Record<NewPasswordField, string>) {
  return collect<NewPasswordField, { password: string }>(
    {
      password: passwordProblem(input.password),
      confirmPassword: confirmationProblem(input.password, input.confirmPassword),
    },
    { password: input.password },
  );
}

export type PasswordChangeField = "currentPassword" | NewPasswordField;

/** Changing a password while signed in: the current one proves it's really them. */
export function validatePasswordChange(input: Record<PasswordChangeField, string>) {
  const sameAsCurrent =
    input.password.length > 0 && input.password === input.currentPassword
      ? "Choose a password different from your current one."
      : null;
  return collect<PasswordChangeField, { currentPassword: string; password: string }>(
    {
      currentPassword: input.currentPassword ? null : "Enter your current password.",
      password: sameAsCurrent ?? passwordProblem(input.password),
      confirmPassword: confirmationProblem(input.password, input.confirmPassword),
    },
    { currentPassword: input.currentPassword, password: input.password },
  );
}
