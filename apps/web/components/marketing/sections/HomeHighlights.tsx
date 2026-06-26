import { HOME, SOLUTION } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { FeatureCard } from "@/components/marketing/ui/FeatureCard";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * HomeHighlights — the home page's value triad. Reuses SOLUTION.pillars so the
 * core promise stays in one place; the full argument lives on /how-it-works.
 */
export function HomeHighlights() {
  return (
    <Section>
      <SectionHeading
        eyebrow={HOME.highlights.eyebrow}
        title={HOME.highlights.title}
        subtitle={HOME.highlights.subtitle}
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {SOLUTION.pillars.map((pillar, i) => (
          <Reveal key={pillar.title} delay={i * 80}>
            <FeatureCard title={pillar.title} body={pillar.body} accent={i === 1} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
