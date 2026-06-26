import { SUITABLE } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * SuitableTeams — who it's for. Team-type cards qualify the buyer; the sport
 * chips show breadth without over-claiming (the gym engine biases toward the
 * sport's demands today, see content notes).
 */
export function SuitableTeams() {
  return (
    <Section id="suitable">
      <SectionHeading
        eyebrow={SUITABLE.eyebrow}
        title={SUITABLE.title}
        subtitle={SUITABLE.subtitle}
      />

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {SUITABLE.teamTypes.map((type, i) => (
          <Reveal key={type.title} delay={i * 80}>
            <div className="h-full rounded-card border border-hairline bg-surface p-6 shadow-md">
              <h3 className="font-display text-lg font-semibold text-strong">
                {type.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{type.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-10 rounded-card border border-hairline bg-surface/50 p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-soft">
            Tuned for the demands of
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {SUITABLE.sports.map((sport) => (
              <span
                key={sport}
                className="rounded-pill border border-hairline-strong bg-surface-2 px-3.5 py-1.5 text-sm text-body"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
