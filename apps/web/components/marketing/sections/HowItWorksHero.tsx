import { HOWITWORKS_HERO } from "@/content/marketing/landing";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";
import { StatusChip } from "@/components/marketing/ui/StatusChip";

/**
 * HowItWorksHero — bespoke hero for /how-it-works. The visual is a vertical
 * "pipeline": inputs flow into the engine, which emits one clear call. It makes
 * the page's whole argument visible before a word of body copy is read.
 */
export function HowItWorksHero() {
  const h = HOWITWORKS_HERO;
  return (
    <section className="relative overflow-hidden">
      <GlowBackdrop />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
        <div>
          <Eyebrow>{h.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-strong sm:text-5xl">
            {h.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
            {h.subtitle}
          </p>
        </div>

        <PipelineFlow />
      </div>
    </section>
  );
}

function PipelineFlow() {
  const p = HOWITWORKS_HERO.pipeline;
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0">
      {/* Inputs */}
      <div className="rounded-card border border-hairline bg-surface/70 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
          Signals in
        </p>
        <div className="space-y-2">
          {p.inputs.map((input) => (
            <div
              key={input.label}
              className="flex items-center justify-between rounded-card border border-hairline bg-surface-2 px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-strong">{input.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-soft">
                {input.note}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Connector />

      {/* Engine */}
      <div className="rounded-card border border-accent/30 bg-accent-soft/40 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-strong">
              {p.engine.label}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wide text-soft">
              {p.engine.note}
            </p>
          </div>
        </div>
      </div>

      <Connector />

      {/* Output */}
      <div className="rounded-card border border-adjust/30 bg-adjust-soft p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-soft">
            {p.output.label}
          </p>
          <StatusChip tone={p.output.tone}>Decision</StatusChip>
        </div>
        <p className="mt-1.5 font-display text-base font-semibold text-strong">
          {p.output.decision}
        </p>
      </div>
    </div>
  );
}

/** The vertical link between pipeline stages, with a downward chevron. */
function Connector() {
  return (
    <div className="flex justify-center py-1.5" aria-hidden="true">
      <svg viewBox="0 0 24 24" width={20} height={20} className="text-soft" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </div>
  );
}
