import { PRICING_TIERS } from "@/content/marketing/pricing";
import { Section } from "@/components/marketing/ui/Section";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { cn } from "@/lib/cn";

/**
 * PricingTiers — three founder-stage tiers. The featured tier (Team pilot) is
 * raised with an accent border. Tiers show `price` if set, else the `priceNote`
 * ("Custom — talk to us"). Edit content/marketing/pricing.ts to change.
 */
export function PricingTiers() {
  return (
    <Section>
      <div className="grid gap-5 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex h-full flex-col rounded-card border p-7 shadow-md",
              tier.featured
                ? "border-accent/40 bg-accent-soft/20"
                : "border-hairline bg-surface",
            )}
          >
            {tier.featured && (
              <span className="absolute -top-3 left-7 rounded-pill bg-accent px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">
                Most popular
              </span>
            )}
            <h3 className="font-display text-xl font-semibold text-strong">
              {tier.name}
            </h3>
            <p className="mt-1.5 text-sm text-muted">{tier.tagline}</p>

            <div className="mt-5">
              {tier.price ? (
                <p className="font-display text-3xl font-semibold text-strong">
                  {tier.price}
                  {tier.priceSuffix && (
                    <span className="text-base font-normal text-muted">
                      {" "}
                      {tier.priceSuffix}
                    </span>
                  )}
                </p>
              ) : (
                <p className="font-display text-xl font-semibold text-body">
                  {tier.priceNote}
                </p>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-body">
                  <svg viewBox="0 0 24 24" width={18} height={18} className="mt-0.5 flex-shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <CtaLink
                href={tier.cta.href}
                variant={tier.featured ? "primary" : "secondary"}
                size="md"
                label={`pricing_${tier.name.toLowerCase().replace(/\s+/g, "_")}`}
                className="w-full"
              >
                {tier.cta.label}
              </CtaLink>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
