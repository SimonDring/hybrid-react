import type { Metadata } from "next";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";
import { PRICING_HERO, PRICING_FAQ } from "@/content/marketing/pricing";

import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";
import { PricingTiers } from "@/components/marketing/sections/PricingTiers";
import { FAQSection } from "@/components/marketing/sections/FAQSection";
import { CtaBanner } from "@/components/marketing/ui/CtaBanner";

export const metadata: Metadata = pageMeta(PAGE_SEO.pricing);

/* Pricing page — founder-stage tiers + pricing FAQ. When prices firm up, add a
   `price` to each tier in content/marketing/pricing.ts. */
export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <GlowBackdrop />
        <div className="relative mx-auto max-w-3xl px-5 pb-8 pt-20 text-center sm:px-6 lg:px-8 lg:pt-28">
          <Eyebrow className="flex justify-center">{PRICING_HERO.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-strong sm:text-5xl">
            {PRICING_HERO.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-body">
            {PRICING_HERO.subtitle}
          </p>
        </div>
      </section>

      <PricingTiers />

      <FAQSection
        eyebrow="Pricing"
        title={PRICING_FAQ.heading}
        items={PRICING_FAQ.items}
      />

      <CtaBanner
        title="Not sure which fits?"
        body="Tell us about your squad and we'll point you to the right starting point."
        ctaLabel="Talk to us"
        ctaHref="/contact"
        analyticsLabel="pricing_cta"
      />
    </>
  );
}
