"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // "local" ends only this browser's session. Supabase's default is global,
  // which would also sign out every other browser and the mobile app; ending
  // those is a deliberate choice in Settings → Session instead.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Sign-out failed", error);
  redirect(LOGIN_PATH);
}
