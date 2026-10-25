import { APP_NAME } from "@money-manager/shared";

// The site's public address, for links search engines and social previews
// need in full (canonical URLs, the sitemap, Open Graph images).
//
// NEXT_PUBLIC_SITE_URL wins when set. Otherwise Vercel's own production
// domain is used, which Vercel sets on every deployment. Both are read at
// build time, so changing either needs a redeploy.

function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured);
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelDomain) return new URL(`https://${vercelDomain}`);
  return new URL("http://localhost:3000");
}

export const SITE_URL = siteUrl();

/** What search results and link previews say about the site. */
export const SITE_DESCRIPTION = `${APP_NAME} is a free money manager for the web and your phone: track accounts, spending, budgets, utang, and savings goals in pesos or any currency, all in one calm place.`;

/**
 * Pages behind sign-in. Search engines can't see them anyway, so they're kept
 * out of the index and the crawl rather than leaving a trail of login redirects.
 */
export const PRIVATE_PATHS = [
  "/dashboard",
  "/transactions",
  "/accounts",
  "/utang",
  "/budgets",
  "/reports",
  "/wishlist",
  "/settings",
  "/auth/",
] as const;
