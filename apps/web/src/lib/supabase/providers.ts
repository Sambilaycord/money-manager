import "server-only";
import { connection } from "next/server";
import { getSupabaseEnv } from "./env";

export type ProviderStatus = "enabled" | "disabled" | "unknown";

/**
 * Whether the Supabase project has Google sign-in switched on, read from its
 * public auth settings. "unknown" when Supabase can't be asked; each caller
 * decides what that means for it.
 */
export async function googleProviderStatus(): Promise<ProviderStatus> {
  // Read per request, so switching Google on shows the button without a
  // redeploy; this also stops prerendering here rather than mid-fetch.
  await connection();
  const env = getSupabaseEnv();
  if (!env) return "disabled";
  try {
    const response = await fetch(new URL("/auth/v1/settings", env.url), {
      headers: { apikey: env.anonKey },
      cache: "no-store",
    });
    if (!response.ok) return "unknown";
    const settings: unknown = await response.json();
    const external =
      typeof settings === "object" && settings !== null && "external" in settings
        ? settings.external
        : null;
    if (typeof external !== "object" || external === null || !("google" in external)) {
      return "unknown";
    }
    return external.google === true ? "enabled" : "disabled";
  } catch (error) {
    console.error("Checking the Google provider failed", error);
    return "unknown";
  }
}
