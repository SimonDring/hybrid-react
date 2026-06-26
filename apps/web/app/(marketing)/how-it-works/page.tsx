import type { Metadata } from "next";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";

import { HowItWorksHero } from "@/components/marketing/sections/HowItWorksHero";
import { ProblemSection } from "@/components/marketing/sections/ProblemSection";
import { SolutionSection } from "@/components/marketing/sections/SolutionSection";
import { HowItWorks } from "@/components/marketing/sections/HowItWorks";
import { FAQSection } from "@/components/marketing/sections/FAQSection";
import { CtaBanner } from "@/components/marketing/ui/CtaBanner";

export const metadata: Metadata = pageMeta(PAGE_SEO.howItWorks);

/* /how-it-works — the product explained in depth: the problem, the decision
   engine, the data→decision pipeline, then objections + a CTA. */
export default function HowItWorksPage() {
  return (
    <>
      <HowItWorksHero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <FAQSection />
      <CtaBanner
        title="See it on your own squad."
        body="Run a four-week pilot and watch the pipeline work with your players' real data."
        ctaLabel="Book a pilot"
        ctaHref="/contact"
        analyticsLabel="how_it_works_cta"
      />
    </>
  );
}
