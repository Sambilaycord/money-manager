import { APP_NAME, APP_TAGLINE } from "@money-manager/shared";
import type { MetadataRoute } from "next";
import { HOME_PATH } from "@/lib/routes";

/** Lets the site be added to a phone's home screen with its own name and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    start_url: HOME_PATH,
    display: "standalone",
    // The day sky's top colour, matching the theme-color in the root layout.
    background_color: "#eef5fc",
    theme_color: "#cfe6fb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
