import type { Metadata } from "next";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";

import { TeamsHero } from "@/components/marketing/sections/TeamsHero";
import { TwoModes } from "@/components/marketing/sections/TwoModes";
import { ComparisonStory } from "@/components/marketing/sections/ComparisonStory";
import { SuitableTeams } from "@/components/marketing/sections/SuitableTeams";
import { Differentiation } from "@/components/marketing/sections/Differentiation";
import { LeadMagnet } from "@/components/marketing/sections/LeadMagnet";
import { CtaBanner } from "@/components/marketing/ui/CtaBanner";

export const metadata: Metadata = pageMeta(PAGE_SEO.teams);

/* /teams — the commercial wedge: the two surfaces (player mobile / coach web),
   the cost "maths", who it's for, why it beats the alternatives, then capture. */
export default function TeamsPage() {
  return (
    <>
      <TeamsHero />
      <TwoModes />
      <ComparisonStory />
      <SuitableTeams />
      <Differentiation />
      <LeadMagnet />
      <CtaBanner
        title="Bring one squad. See what changes."
        body="A four-week pilot, no long contract. We onboard your players and stand up your dashboard."
        ctaLabel="Book a pilot"
        ctaHref="/contact"
        analyticsLabel="teams_cta"
      />
    </>
  );
}
