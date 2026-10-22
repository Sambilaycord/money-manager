export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);
const AUTH_PAGES = new Set(["/login", "/signup"]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.has(pathname);
}

/**
 * Only same-site relative paths are allowed as a post-login destination, so a
 * crafted `?next=https://evil.example` link can't bounce a user off-site.
 */
export function safeRedirectPath(next: unknown): string {
  if (typeof next !== "string") return HOME_PATH;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return HOME_PATH;
  }
  return next;
}
