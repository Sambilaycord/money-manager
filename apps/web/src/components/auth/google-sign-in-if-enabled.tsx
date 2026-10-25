import { googleProviderStatus } from "@/lib/supabase/providers";
import { GoogleSignIn } from "./google-sign-in";

/**
 * "Continue with Google", shown only once Google sign-in is switched on in
 * Supabase, so the button appears by itself when the provider is set up and
 * never offers a sign-in that can't work. Hidden too if Supabase can't be asked.
 */
export async function GoogleSignInIfEnabled() {
  if ((await googleProviderStatus()) !== "enabled") return null;
  return <GoogleSignIn />;
}
