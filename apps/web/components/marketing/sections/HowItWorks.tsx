import { HOW_IT_WORKS } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * HowItWorks — a genuine sequence (data → decision → action), so numbered steps
 * carry real meaning here. A connecting line ties the steps into one pipeline.
 */
export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading
        eyebrow={HOW_IT_WORKS.eyebrow}
        title={HOW_IT_WORKS.title}
        subtitle={HOW_IT_WORKS.subtitle}
      />
      <div className="relative mt-16 grid gap-8 md:grid-cols-4 md:gap-6">
        {/* Connecting line across the steps on desktop. */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-hairline-strong to-transparent md:block"
        />
        {HOW_IT_WORKS.steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 100}>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline-strong bg-surface font-mono text-sm font-semibold text-accent shadow-sm">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-strong">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
