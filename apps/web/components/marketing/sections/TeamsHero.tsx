import { TEAMS_HERO } from "@/content/marketing/landing";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";
import { StatusChip } from "@/components/marketing/ui/StatusChip";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { cn } from "@/lib/cn";

const SEG: Record<string, string> = {
  ready: "bg-ready",
  monitor: "bg-monitor",
  adjust: "bg-adjust",
  neutral: "bg-nodata",
};

/**
 * TeamsHero — bespoke hero for /teams. The visual is a coach's-eye "squad
 * readiness" glance: a RAG split bar over a few player rows. Distinct from the
 * home hero (one player) — this shows the squad-wide view the page is selling,
 * and links to the real /dashboard.
 */
export function TeamsHero() {
  const h = TEAMS_HERO;
  return (
    <section className="relative overflow-hidden">
      <GlowBackdrop />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
        <div>
          <Eyebrow>{h.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-strong sm:text-5xl">
            {h.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
            {h.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaLink href="/contact" variant="primary" size="lg" label="teams_hero_primary">
              Book a pilot
            </CtaLink>
            <CtaLink href="/dashboard" variant="ghost" size="lg" label="teams_hero_demo">
              Open the live dashboard
              <span aria-hidden="true">→</span>
            </CtaLink>
          </div>
        </div>

        <SquadGlance />
      </div>
    </section>
  );
}

function SquadGlance() {
  const s = TEAMS_HERO.squad;
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0">
      <div className="rounded-card border border-hairline-strong bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-soft">
            Squad readiness
          </span>
          <span className="tnum font-mono text-[11px] text-muted">
            {s.total} players
          </span>
        </div>

        {/* RAG split bar */}
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-pill">
          {s.split.map((seg) => (
            <span
              key={seg.label}
              className={cn(SEG[seg.tone])}
              style={{ width: `${(seg.count / s.total) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {s.split.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className={cn("h-1.5 w-1.5 rounded-full", SEG[seg.tone])} />
              <span className="tnum">{seg.count}</span> {seg.label}
            </span>
          ))}
        </div>

        {/* A few player rows */}
        <div className="mt-5 space-y-2">
          {s.rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-card border border-hairline bg-surface-2 px-3.5 py-2.5"
            >
              <span className="text-sm text-body">{row.name}</span>
              <StatusChip tone={row.tone}>{row.status}</StatusChip>
            </div>
          ))}
        </div>

        <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">
          {s.attention}
        </p>
      </div>
    </div>
  );
}
