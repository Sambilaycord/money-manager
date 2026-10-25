export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
/**
 * Not public: the emailed reset link signs the person in first, through
 * /auth/confirm, and this page then sets a new password for that session.
 */
export const RESET_PASSWORD_PATH = "/reset-password";

/** Added to the /auth/confirm callback when it's the end of a Google sign-in. */
export const GOOGLE_SIGN_IN_FLAG = "via_google";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  FORGOT_PASSWORD_PATH,
  // Generated metadata files for search engines, link previews, and home
  // screens. They hold no user data, and a crawler sent to the login page
  // instead would see none of them.
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/apple-icon",
]);
// Signed-in people are sent on from these. Forgot password stays open to them:
// settings links to it for someone who no longer knows their current password.
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
