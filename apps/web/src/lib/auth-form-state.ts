/** What an auth or password form's server action hands back to the form. */
export interface AuthFormState {
  /** About the form as a whole, shown above it. */
  error?: string;
  /** Shown in place of the form once it has done its job. */
  message?: string;
  /** Problems with single fields, shown under each one. */
  fieldErrors?: Record<string, string>;
}
