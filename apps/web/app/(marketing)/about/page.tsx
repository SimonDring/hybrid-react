import type { Metadata } from "next";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";
import { ABOUT_CTA } from "@/content/marketing/about";

import { AboutHero } from "@/components/marketing/sections/AboutHero";
import { AboutStory } from "@/components/marketing/sections/AboutStory";
import { AboutBeliefs } from "@/components/marketing/sections/AboutBeliefs";
import { AboutTeam } from "@/components/marketing/sections/AboutTeam";
import { CtaBanner } from "@/components/marketing/ui/CtaBanner";

export const metadata: Metadata = pageMeta(PAGE_SEO.about);

/* About page — mission, beliefs, team. Founder-stage and deliberately small;
   add sections here as the story grows. */
export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutStory />
      <AboutBeliefs />
      <AboutTeam />
      <CtaBanner
        title={ABOUT_CTA.title}
        body={ABOUT_CTA.body}
        ctaLabel={ABOUT_CTA.cta.label}
        ctaHref={ABOUT_CTA.cta.href}
        analyticsLabel="about_cta"
      />
    </>
  );
}
