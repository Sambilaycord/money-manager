import "server-only";
import type { Database } from "@money-manager/shared";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { requireSupabaseEnv } from "./env";

// Supabase client for Server Components, Route Handlers and Server Actions.
export async function createClient() {
  // cookies() comes first: under Cache Components it is what marks the caller as
  // request-time, so nothing below runs during the static prerender.
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();
  // Sign-in runs here on the server, so without this Supabase would record
  // every session's device as the server ("node") instead of the browser,
  // and the signed-in devices list in settings couldn't tell them apart.
  const userAgent = (await headers()).get("user-agent");

  return createServerClient<Database>(url, anonKey, {
    global: { headers: userAgent ? { "User-Agent": userAgent } : {} },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't write cookies; the proxy refreshes the
          // session on every request, so the write isn't lost.
        }
      },
    },
  });
}
