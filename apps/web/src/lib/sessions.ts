import "server-only";
import { describeUserAgent } from "@money-manager/shared";
import { createClient } from "@/lib/supabase/server";

export interface SignedInDevice {
  id: string;
  /** e.g. "Chrome on Windows". */
  name: string;
  /** ISO timestamps. */
  signedInAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

/**
 * Where the signed-in user is signed in, most recently active first. Read
 * through list_my_sessions, which only ever returns the caller's own sessions.
 */
export async function listSignedInDevices(): Promise<SignedInDevice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_sessions");
  if (error) throw error;

  return data.map((session) => ({
    id: session.id,
    name: describeUserAgent(session.user_agent),
    signedInAt: session.created_at,
    lastActiveAt: session.last_active_at,
    isCurrent: session.is_current,
  }));
}
