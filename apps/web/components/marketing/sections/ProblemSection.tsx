import { PROBLEM } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * ProblemSection — names the pain before the pitch. Three failure modes of the
 * "more data" status quo, so the solution lands as relief, not a feature list.
 */
export function ProblemSection() {
  return (
    <Section id="problem">
      <SectionHeading
        eyebrow={PROBLEM.eyebrow}
        title={PROBLEM.title}
        subtitle={PROBLEM.body}
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {PROBLEM.pains.map((pain, i) => (
          <Reveal key={pain.title} delay={i * 80}>
            <div className="h-full rounded-card border border-hairline bg-surface/60 p-6">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-adjust/30 bg-adjust-soft font-mono text-sm text-adjust">
                ✕
              </div>
              <h3 className="font-display text-lg font-semibold text-strong">
                {pain.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{pain.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
