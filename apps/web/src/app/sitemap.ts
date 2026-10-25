import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Only the public pages; everything else needs an account. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency: "monthly",
    priority,
  });
  return [page("/", 1), page("/signup", 0.8), page("/login", 0.5)];
}
