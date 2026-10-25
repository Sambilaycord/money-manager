"use server";

import {
  emailProblem,
  normalizeEmail,
  validateNewPassword,
  validateSignIn,
  validateSignUp,
} from "@money-manager/shared";
import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthFormState } from "@/lib/auth-form-state";
import {
  HOME_PATH,
  RESET_PASSWORD_PATH,
  safeRedirectPath,
} from "@/lib/routes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";


const NOT_CONFIGURED: AuthFormState = {
  error: "Sign-in isn't available yet: Supabase hasn't been configured.",
};

const TOO_MANY_ATTEMPTS = "Too many attempts. Wait a minute, then try again.";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Where emailed links come back to: this site's /auth/confirm, then `next`. */
async function confirmUrl(next?: string): Promise<string | undefined> {
  const origin = (await headers()).get("origin");
  if (!origin) return undefined;
  const url = new URL("/auth/confirm", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

function isRateLimited(error: AuthError): boolean {
  return error.status === 429 || error.code?.startsWith("over_") === true;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const result = validateSignIn({
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.value);
  if (error) {
    if (error.code === "invalid_credentials") return { error: "That email and password don't match." };
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email first: open the link we sent when you signed up." };
    }
    if (isRateLimited(error)) return { error: TOO_MANY_ATTEMPTS };
    console.error("Sign-in failed", error);
    return { error: "Signing in didn't work. Try again." };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const result = validateSignUp({
    fullName: readString(formData, "fullName"),
    email: readString(formData, "email"),
    password: readString(formData, "password"),
    confirmPassword: readString(formData, "confirmPassword"),
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors };

  const { fullName, email, password } = result.value;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: await confirmUrl() },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: error.message } };
    if (isRateLimited(error)) return { error: "Too many sign-up emails just now. Try again in a few minutes." };
    console.error("Sign-up failed", error);
    return { error: "Your account couldn't be created. Try again." };
  }

  // A session comes back immediately only when email confirmation is turned
  // off in the Supabase project; otherwise the user must click the email link.
  if (data.session) redirect(HOME_PATH);

  return { message: `Check ${email} for a link to confirm your account.` };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const email = normalizeEmail(readString(formData, "email"));
  const problem = emailProblem(email);
  if (problem) return { fieldErrors: { email: problem } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await confirmUrl(RESET_PASSWORD_PATH),
  });
  if (error && isRateLimited(error)) return { error: TOO_MANY_ATTEMPTS };
  if (error) console.error("Requesting a password reset failed", error);

  // The same answer whether or not the address has an account, so this form
  // can't be used to find out who is signed up.
  return {
    message: `If ${email} has an account, a link to reset its password is on its way. It works once and expires in an hour.`,
  };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const result = validateNewPassword({
    password: readString(formData, "password"),
    confirmPassword: readString(formData, "confirmPassword"),
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: result.value.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: "Choose a password different from your current one." } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: error.message } };
    if (error.code === "session_not_found" || error.status === 401) {
      return { error: "Your reset link has expired. Request a new one." };
    }
    console.error("Updating password failed", error);
    return { error: "Your password couldn't be changed. Try again." };
  }

  // Whoever knew the old password may still be signed in somewhere; a reset
  // is the moment to end those sessions. This device stays signed in.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("Signing out other devices after reset failed", signOutError);

  redirect(HOME_PATH);
}
