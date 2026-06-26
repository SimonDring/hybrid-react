import type { ReactNode } from "react";
import { SITE } from "@/content/marketing/site";
import { TopNav } from "@/components/marketing/layout/TopNav";
import { Footer } from "@/components/marketing/layout/Footer";
import { Analytics } from "@/components/marketing/layout/Analytics";

/*
  Marketing route group layout. Everything under app/(marketing)/ — the landing,
  about, pricing and contact pages — shares this top nav + footer and the Inter
  body font. The "(marketing)" folder name is a route GROUP: it doesn't appear in
  the URL, so these pages live at /, /about, /pricing, /contact. The /dashboard
  app and /login keep their own layouts and are unaffected.
*/

// Organization structured data helps search engines understand the brand.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  description: SITE.description,
  url: SITE.url,
};

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="font-body">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Analytics />
      <TopNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
