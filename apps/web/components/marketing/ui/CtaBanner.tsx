import { CtaLink } from "./CtaLink";

/**
 * CtaBanner — a compact, reusable closing call-to-action for inner pages
 * (about, pricing). The home page uses the larger PilotCTASection instead.
 */
export function CtaBanner({
  title,
  body,
  ctaLabel,
  ctaHref,
  analyticsLabel = "banner_cta",
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  analyticsLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-6 rounded-card border border-hairline-strong bg-surface p-8 text-center shadow-md sm:flex-row sm:justify-between sm:p-10 sm:text-left">
        <div>
          <h2 className="font-display text-2xl font-semibold text-strong sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-base text-body">{body}</p>
        </div>
        <CtaLink href={ctaHref} variant="primary" size="lg" label={analyticsLabel} className="flex-shrink-0">
          {ctaLabel}
        </CtaLink>
      </div>
    </div>
  );
}
