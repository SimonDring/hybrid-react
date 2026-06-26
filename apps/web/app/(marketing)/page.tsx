import type { Metadata } from "next";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";

import { Hero } from "@/components/marketing/sections/Hero";
import { SocialProofStrip } from "@/components/marketing/sections/SocialProofStrip";
import { HomeHighlights } from "@/components/marketing/sections/HomeHighlights";
import { ComparisonTeaser } from "@/components/marketing/sections/ComparisonTeaser";
import { ExploreCards } from "@/components/marketing/sections/ExploreCards";
import { PilotCTASection } from "@/components/marketing/sections/PilotCTASection";

export const metadata: Metadata = pageMeta(PAGE_SEO.home);

/*
  The home page is deliberately LEAN: hook (hero) → proof → highlights → the
  cost-story teaser → where-to-next → closing CTA. The depth lives on the
  dedicated pages (/how-it-works, /teams) so the landing lands fast and the key
  message is above the fold. Re-order by editing this list.
*/
export default function HomePage() {
  return (
    <>
      <Hero />
      <SocialProofStrip />
      <HomeHighlights />
      <ComparisonTeaser />
      <ExploreCards />
      <PilotCTASection />
    </>
  );
}
