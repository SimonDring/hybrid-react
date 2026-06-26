import { HOME } from "@/content/marketing/landing";
import { COMPARISON } from "@/content/marketing/comparison";
import { Section } from "@/components/marketing/ui/Section";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * ComparisonTeaser — a compact taste of the cost story on the home page, linking
 * to the full breakdown on /teams. Keeps the strongest hook above the page's CTA
 * without dragging the whole comparison onto a deliberately lean home page.
 */
export function ComparisonTeaser() {
  const t = HOME.comparisonTeaser;
  const h = COMPARISON.headline;
  return (
    <Section tone="raised">
      <Reveal>
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-strong sm:text-4xl">
              {t.title}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-body">
              {t.body}
            </p>
            <div className="mt-6">
              <CtaLink href={t.cta.href} variant="secondary" size="md" label="home_maths">
                {t.cta.label}
                <span aria-hidden="true">→</span>
              </CtaLink>
            </div>
          </div>

          {/* The punchline numbers. */}
          <div className="rounded-card border border-hairline-strong bg-surface p-6 shadow-md sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-3xl font-semibold text-strong sm:text-4xl">
                {h.stat}
              </p>
              <p className="text-right text-xs text-muted">{h.statLabel}</p>
            </div>
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
                {h.versus}
              </span>
              <span className="h-px flex-1 bg-hairline" />
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-3xl font-semibold text-accent sm:text-4xl">
                {h.ourStat}
              </p>
              <p className="text-right text-xs text-muted">{h.ourLabel}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
