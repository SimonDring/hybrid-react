import Link from "next/link";
import { HOME } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { SectionHeading } from "@/components/marketing/ui/SectionHeading";
import { Reveal } from "@/components/marketing/ui/Reveal";

/**
 * ExploreCards — "where to next" links on the lean home page. Because the home
 * page teases rather than tells, these give visitors a clear path into the
 * deeper pages (a pattern used by multi-page product sites).
 */
export function ExploreCards() {
  return (
    <Section>
      <SectionHeading eyebrow={HOME.explore.eyebrow} title={HOME.explore.title} />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {HOME.explore.cards.map((card, i) => (
          <Reveal key={card.href} delay={i * 80}>
            <Link
              href={card.href}
              className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-6 shadow-md transition-colors hover:border-hairline-strong"
            >
              <h3 className="font-display text-lg font-semibold text-strong">
                {card.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
                {card.body}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Explore
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
