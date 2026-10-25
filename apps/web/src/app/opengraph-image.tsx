import { APP_NAME, APP_TAGLINE } from "@money-manager/shared";
import { ImageResponse } from "next/og";
import { BrandMarkImage } from "@/components/brand-mark-image";

// The preview shown when a link to the site is shared, on every page that
// doesn't set its own. Built once at build time.

export const alt = `${APP_NAME}: ${APP_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          // The day sky, as on the site.
          background: "linear-gradient(180deg, #cfe6fb 0%, #f4f9fe 100%)",
          color: "#0f2440",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <BrandMarkImage size={132} />
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>{APP_NAME}</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 56, fontWeight: 600, letterSpacing: -1.5 }}>
          {APP_TAGLINE}
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: "#586a83" }}>
          Accounts, spending, budgets, utang, and savings in one calm place.
        </div>
      </div>
    ),
    size,
  );
}
