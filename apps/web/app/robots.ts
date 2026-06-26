import type { MetadataRoute } from "next";
import { SITE } from "@/content/marketing/site";

/* Robots policy: let crawlers index the marketing pages, keep the app private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
