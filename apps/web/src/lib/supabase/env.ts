export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Returns the Supabase env vars, or null until they hold real values.
 *
 * The proxy runs on every request and `createServerClient` throws on an
 * unparseable URL, so an unprovisioned project would otherwise take the whole
 * site down instead of failing closed on the private pages only.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  if (!URL.canParse(url)) return null;

  return { url, anonKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    );
  }
  return env;
}
