import { HERO, HERO_DECISION } from "@/content/marketing/landing";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { StatusChip } from "@/components/marketing/ui/StatusChip";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";

/**
 * Hero — the thesis. Left: the <10-second pitch + dual CTA. Right: the signature
 * "decision card" showing raw signals resolving into one plain-English call —
 * the product's whole idea in a single glance.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GlowBackdrop />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
        {/* Copy */}
        <div>
          <Eyebrow>{HERO.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-strong sm:text-5xl lg:text-6xl">
            {HERO.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
            {HERO.subtitle}
          </p>
          {/* One primary CTA (best practice); the demo is a quieter ghost link. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaLink href={HERO.primaryCta.href} variant="primary" size="lg" label="hero_primary">
              {HERO.primaryCta.label}
            </CtaLink>
            <CtaLink href={HERO.secondaryCta.href} variant="ghost" size="lg" label="hero_demo">
              {HERO.secondaryCta.label}
              <Arrow />
            </CtaLink>
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.15em] text-soft">
            {HERO.footnote}
          </p>
        </div>

        {/* Signature decision card */}
        <DecisionCard />
      </div>
    </section>
  );
}

function DecisionCard() {
  const d = HERO_DECISION;
  return (
    <div className="relative lg:pl-6">
      {/* faint echo card behind for depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-4 translate-y-4 rounded-card border border-hairline bg-surface/40"
      />
      <div className="relative rounded-card border border-hairline-strong bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-soft">
            {d.player}
          </span>
          <StatusChip tone={d.verdict.tone} pulse>
            Live
          </StatusChip>
        </div>

        {/* Incoming signals */}
        <div className="mt-5 space-y-2.5">
          {d.signals.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between rounded-card border border-hairline bg-surface-2 px-4 py-3"
            >
              <span className="text-sm text-muted">{s.label}</span>
              <StatusChip tone={s.tone}>{s.value}</StatusChip>
            </div>
          ))}
        </div>

        {/* The translation arrow */}
        <div className="my-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-hairline" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
            decision
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        {/* The verdict */}
        <div className="rounded-card border border-adjust/30 bg-adjust-soft p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-soft">
            {d.verdict.label}
          </p>
          <p className="mt-1.5 font-display text-lg font-semibold text-strong">
            {d.verdict.decision}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-body">
            {d.verdict.reason}
          </p>
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
