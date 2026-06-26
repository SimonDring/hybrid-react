import { TWO_MODES } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { MediaPlaceholder } from "@/components/marketing/ui/MediaPlaceholder";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { AppBadges } from "@/components/marketing/ui/AppBadges";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * TwoModes — the player-mobile vs coach-web distinction, made visual. Each mode
 * gets its native frame (phone for the app, browser for the dashboard) so the
 * "mobile-first player / comparison-first coach" split is obvious at a glance.
 */
export function TwoModes() {
  return (
    <Section id="two-modes" tone="raised">
      <SectionHeading
        eyebrow={TWO_MODES.eyebrow}
        title={TWO_MODES.title}
        subtitle={TWO_MODES.subtitle}
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {TWO_MODES.modes.map((mode, i) => {
          const isPlayer = mode.kind === "player";
          return (
            <Reveal key={mode.kind} delay={i * 100}>
              <div className="flex h-full flex-col rounded-card border border-hairline bg-surface p-6 shadow-md sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
                    {mode.label}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-soft">
                    {mode.platform}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-2xl font-semibold leading-snug text-strong">
                  {mode.headline}
                </h3>

                {/* Visual: phone slot for player, browser slot for coach. */}
                <div className="mt-6 flex justify-center">
                  <MediaPlaceholder
                    slot={isPlayer ? "player-app" : "coach-dashboard"}
                    className={isPlayer ? "w-[210px]" : "w-full"}
                  />
                </div>

                <ul className="mt-7 space-y-3">
                  {mode.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-body">
                      <Tick />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 pt-2">
                  {/* Players get the real on-ramp (app links); coaches get the
                      dashboard CTA. */}
                  {isPlayer ? (
                    <AppBadges />
                  ) : (
                    <CtaLink
                      href={mode.cta.href}
                      variant="primary"
                      size="md"
                      label={`twomodes_${mode.kind}`}
                    >
                      {mode.cta.label}
                    </CtaLink>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} className="mt-0.5 flex-shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
