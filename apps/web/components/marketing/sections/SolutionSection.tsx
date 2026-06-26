import { SOLUTION } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { FeatureCard } from "@/components/marketing/ui/FeatureCard";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * SolutionSection — the value proposition: a decision engine, not a dashboard.
 * Three pillars, the middle one accented as the core differentiator.
 */
export function SolutionSection() {
  return (
    <Section id="solution" tone="raised">
      <SectionHeading
        eyebrow={SOLUTION.eyebrow}
        title={SOLUTION.title}
        subtitle={SOLUTION.body}
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {SOLUTION.pillars.map((pillar, i) => (
          <Reveal key={pillar.title} delay={i * 80}>
            <FeatureCard
              title={pillar.title}
              body={pillar.body}
              accent={i === 1}
              icon={<PillarIcon index={i} />}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function PillarIcon({ index }: { index: number }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (index === 0)
    return (
      <svg {...common}>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  if (index === 1)
    return (
      <svg {...common}>
        <path d="M3 12h4l3 8 4-16 3 8h4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 6h16M4 12h10M4 18h7" />
    </svg>
  );
}
