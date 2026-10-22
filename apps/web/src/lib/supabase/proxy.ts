import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH, isAuthPage, isPublicPath } from "@/lib/routes";
import { getSupabaseEnv } from "./env";

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

/**
 * Refreshes the Supabase session on every request and guards private pages.
 *
 * Everything except the landing and auth pages holds personal financial data,
 * so the guard fails closed: no session, an unreachable Supabase, or missing
 * env vars all send the visitor to the login page.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const env = getSupabaseEnv();

  if (!env) {
    return isPublic ? NextResponse.next({ request }) : redirectTo(request, LOGIN_PATH, pathname);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Supabase requires getUser() to run immediately after creating the client,
  // with nothing in between, or sessions can be dropped at random.
  let isSignedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    isSignedIn = data.user !== null;
  } catch (error) {
    console.error("Supabase session check failed; treating request as signed out", error);
  }

  if (!isPublic && !isSignedIn) {
    return redirectTo(request, LOGIN_PATH, pathname);
  }

  if (isAuthPage(pathname) && isSignedIn) {
    return redirectTo(request, HOME_PATH);
  }

  return response;
}
