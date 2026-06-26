import type { MetadataRoute } from "next";
import { SITE } from "@/content/marketing/site";

/* Sitemap for search engines. Add a line per public marketing page. The
   dashboard and login are intentionally excluded (private / no-index). */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/how-it-works", "/teams", "/pricing", "/about", "/contact"];
  const now = new Date();
  return routes.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
