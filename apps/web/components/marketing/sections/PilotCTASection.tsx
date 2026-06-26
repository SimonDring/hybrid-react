import { PILOT_CTA } from "@/content/marketing/landing";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";

/**
 * PilotCTASection — the closing conversion block. The single biggest ask on the
 * page, given its own breathing room and an ambient glow to draw the eye.
 */
export function PilotCTASection() {
  return (
    <section id="pilot" className="relative overflow-hidden">
      <GlowBackdrop />
      <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
        <Eyebrow className="flex justify-center">{PILOT_CTA.eyebrow}</Eyebrow>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-tight text-strong sm:text-4xl lg:text-5xl">
          {PILOT_CTA.title}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-body">
          {PILOT_CTA.body}
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <CtaLink href={PILOT_CTA.primaryCta.href} variant="primary" size="lg" label="closing_primary">
            {PILOT_CTA.primaryCta.label}
          </CtaLink>
          <CtaLink href={PILOT_CTA.secondaryCta.href} variant="ghost" size="lg" label="closing_secondary">
            {PILOT_CTA.secondaryCta.label}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
