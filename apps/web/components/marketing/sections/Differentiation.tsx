import { DIFFERENTIATION } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * Differentiation — the moat. Each row contrasts a familiar category (what it
 * gives you) with the decision layer we add on top. Frames us as the missing
 * "so what do I do" rather than yet another data tool.
 */
export function Differentiation() {
  return (
    <Section id="differentiation" tone="raised">
      <SectionHeading
        eyebrow={DIFFERENTIATION.eyebrow}
        title={DIFFERENTIATION.title}
        subtitle={DIFFERENTIATION.subtitle}
      />
      <div className="mt-14 space-y-4">
        {DIFFERENTIATION.rows.map((row, i) => (
          <Reveal key={row.them} delay={i * 80}>
            <div className="grid items-center gap-4 rounded-card border border-hairline bg-surface p-5 sm:grid-cols-[1fr_auto_1fr] sm:p-6">
              {/* Them */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-soft">
                  {row.them}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {row.themBody}
                </p>
              </div>
              {/* Connector */}
              <div className="hidden h-10 w-px bg-hairline-strong sm:block" />
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent sm:hidden">
                we add ↓
              </div>
              {/* Us */}
              <div className="rounded-card border border-accent/20 bg-accent-soft/30 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
                  Performance OS
                </p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-strong">
                  {row.us}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
