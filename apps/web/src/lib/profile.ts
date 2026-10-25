import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const AVATAR_BUCKET = "avatars";

// Long enough to outlast a visit, short enough that a copied link soon stops
// working: the bucket is private, and this link is the only way in.
const AVATAR_URL_LIFETIME_SECONDS = 60 * 60;

export interface ProfileDetails {
  id: string;
  email: string;
  fullName: string | null;
  defaultCurrency: string;
  avatarPath: string | null;
  /** A short-lived link to the picture; null when there isn't one or it can't be read. */
  avatarUrl: string | null;
}

const FALLBACK_CURRENCY = "PHP";

// cache() so the settings page and the user menu share one lookup per request.
export const getProfile = cache(async (): Promise<ProfileDetails> => {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, default_currency, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;

  const avatarPath = data?.avatar_path ?? null;
  return {
    id: user.id,
    email: user.email,
    fullName: data?.full_name ?? user.fullName,
    defaultCurrency: data?.default_currency ?? FALLBACK_CURRENCY,
    avatarPath,
    avatarUrl: avatarPath ? await signedAvatarUrl(avatarPath) : null,
  };
});

async function signedAvatarUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_LIFETIME_SECONDS);
  // A missing picture falls back to initials rather than breaking the page.
  if (error) {
    console.error("Signing avatar URL failed", error);
    return null;
  }
  return data.signedUrl;
}
