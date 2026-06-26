import { COMPARISON } from "@/content/marketing/comparison";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { Reveal } from "@/components/marketing/ui/Reveal";
import { cn } from "@/lib/cn";

/**
 * ComparisonStory — "a performance department vs a login". The left column is the
 * traditional setup (heavy, costly, greyed); the right is us (teal-accented,
 * clean). Figures are real UK ranges — see content/marketing/comparison.ts.
 */
export function ComparisonStory() {
  const c = COMPARISON;
  return (
    <Section id="comparison">
      <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        {/* Traditional */}
        <Reveal>
          <ColumnCard
            label={c.traditional.label}
            tag={c.traditional.tag}
            rows={c.traditional.rows}
            variant="traditional"
          />
        </Reveal>
        {/* Ours */}
        <Reveal delay={120}>
          <ColumnCard
            label={c.ours.label}
            tag={c.ours.tag}
            rows={c.ours.rows}
            variant="ours"
          />
        </Reveal>
      </div>

      {/* Punchline */}
      <Reveal>
        <div className="mt-8 grid items-center gap-4 rounded-card border border-hairline-strong bg-surface p-6 text-center shadow-md sm:grid-cols-[1fr_auto_1fr] sm:p-8 sm:text-left">
          <div>
            <p className="font-display text-3xl font-semibold text-strong sm:text-4xl">
              {c.headline.stat}
            </p>
            <p className="mt-1 text-sm text-muted">{c.headline.statLabel}</p>
          </div>
          <span className="mx-auto font-mono text-xs uppercase tracking-[0.2em] text-soft">
            {c.headline.versus}
          </span>
          <div className="sm:text-right">
            <p className="font-display text-3xl font-semibold text-accent sm:text-4xl">
              {c.headline.ourStat}
            </p>
            <p className="mt-1 text-sm text-muted">{c.headline.ourLabel}</p>
          </div>
        </div>
      </Reveal>

      <p className="mt-5 text-center text-xs leading-relaxed text-soft">
        {c.disclaimer}
      </p>
    </Section>
  );
}

function ColumnCard({
  label,
  tag,
  rows,
  variant,
}: {
  label: string;
  tag: string;
  rows: { dimension: string; detail: string; emphasis?: boolean }[];
  variant: "traditional" | "ours";
}) {
  const isOurs = variant === "ours";
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-card border p-6 shadow-md sm:p-8",
        isOurs
          ? "border-accent/30 bg-accent-soft/30"
          : "border-hairline bg-surface/50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className={cn(
            "font-display text-xl font-semibold",
            isOurs ? "text-strong" : "text-body",
          )}
        >
          {label}
        </h3>
        <span
          className={cn(
            "rounded-pill px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
            isOurs ? "bg-accent-soft text-accent" : "bg-surface-2 text-soft",
          )}
        >
          {tag}
        </span>
      </div>

      <dl className="mt-6 divide-y divide-hairline">
        {rows.map((row) => (
          <div
            key={row.dimension}
            className="grid grid-cols-[7rem_1fr] gap-4 py-3.5 sm:grid-cols-[8rem_1fr]"
          >
            <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-soft">
              {row.dimension}
            </dt>
            <dd
              className={cn(
                "text-sm leading-relaxed",
                row.emphasis
                  ? isOurs
                    ? "font-semibold text-accent"
                    : "font-semibold text-strong"
                  : "text-body",
              )}
            >
              {row.detail}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
