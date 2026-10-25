import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  FORGOT_PASSWORD_PATH,
  LOGIN_PATH,
  RESET_PASSWORD_PATH,
  safeRedirectPath,
} from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value);
}

async function verifyLink(searchParams: URLSearchParams): Promise<boolean> {
  const supabase = await createClient();

  // The default Supabase email template sends a PKCE `code`; a customised
  // template can send `token_hash` + `type` instead. Accept both.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return !error;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const destination = request.nextUrl.clone();
  destination.search = "";

  const next = safeRedirectPath(searchParams.get("next"));
  if (await verifyLink(searchParams)) {
    destination.pathname = next;
  } else if (next === RESET_PASSWORD_PATH) {
    // A dead reset link is answered where a new one can be requested.
    destination.pathname = FORGOT_PASSWORD_PATH;
    destination.searchParams.set("error", "expired");
  } else {
    destination.pathname = LOGIN_PATH;
    destination.searchParams.set("error", "confirmation");
  }

  return NextResponse.redirect(destination);
}
