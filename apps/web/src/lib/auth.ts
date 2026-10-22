import "server-only";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * The single place pages read the signed-in user. It re-checks the session
 * itself rather than trusting the proxy, and returns only what the UI needs.
 *
 * Reads cookies, so callers must render inside a <Suspense> boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect(LOGIN_PATH);

  const fullName = data.user.user_metadata.full_name;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: typeof fullName === "string" && fullName.trim() ? fullName : null,
  };
}
