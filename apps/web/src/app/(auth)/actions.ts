"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HOME_PATH, safeRedirectPath } from "@/lib/routes";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  message?: string;
}

const MIN_PASSWORD_LENGTH = 8;
const NOT_CONFIGURED: AuthFormState = {
  error: "Sign-in isn't available yet: Supabase hasn't been configured.",
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const email = readString(formData, "email");
  const password = formData.get("password");
  if (!looksLikeEmail(email) || typeof password !== "string" || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseEnv()) return NOT_CONFIGURED;

  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email");
  const password = formData.get("password");

  if (!fullName) return { error: "Enter your name." };
  if (!looksLikeEmail(email)) return { error: "Enter a valid email address." };
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  });
  if (error) return { error: error.message };

  // A session comes back immediately only when email confirmation is turned
  // off in the Supabase project; otherwise the user must click the email link.
  if (data.session) redirect(HOME_PATH);

  return { message: `Check ${email} for a link to confirm your account.` };
}
