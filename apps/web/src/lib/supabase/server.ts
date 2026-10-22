import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./env";

// Supabase client for Server Components, Route Handlers and Server Actions.
export async function createClient() {
  // cookies() comes first: under Cache Components it is what marks the caller as
  // request-time, so nothing below runs during the static prerender.
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
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
