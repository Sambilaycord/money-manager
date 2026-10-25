import { ImageResponse } from "next/og";
import { BrandMarkImage } from "@/components/brand-mark-image";

// The home-screen icon on iPhones and iPads, which crop it into a rounded
// square themselves, so it's drawn full-bleed on a soft sky background.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #e2effc 0%, #f4f9fe 100%)",
        }}
      >
        <BrandMarkImage size={124} />
      </div>
    ),
    size,
  );
}
