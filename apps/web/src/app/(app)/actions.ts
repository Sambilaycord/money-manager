"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Sign-out failed", error);
  redirect(LOGIN_PATH);
}
