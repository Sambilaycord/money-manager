import { APP_NAME, APP_TAGLINE } from "@money-manager/shared";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SkyBackdrop } from "@/components/sky-backdrop";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: `${APP_NAME} · ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  applicationName: APP_NAME,
  description: SITE_DESCRIPTION,
  keywords: [
    "money manager",
    "budget app",
    "expense tracker",
    "personal finance",
    "utang tracker",
    "savings goals",
    "wishlist",
    "Philippines",
  ],
  category: "finance",
  // The preview image comes from app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  // Amounts and dates on the page aren't phone numbers or addresses to link.
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#cfe6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#050b1c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme before React hydrates, so the server's
    // markup and the browser's legitimately differ on this one attribute.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <SkyBackdrop />
        {children}
      </body>
    </html>
  );
}
