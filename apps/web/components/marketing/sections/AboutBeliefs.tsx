import { ABOUT_BELIEFS } from "@/content/marketing/about";
import { Section } from "@/components/marketing/ui/Section";
import { Reveal } from "@/components/marketing/ui/Reveal";

/** AboutBeliefs — the principles behind the product, as a clean two-up grid. */
export function AboutBeliefs() {
  return (
    <Section>
      <h2 className="font-display text-2xl font-semibold text-strong sm:text-3xl">
        {ABOUT_BELIEFS.heading}
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {ABOUT_BELIEFS.beliefs.map((belief, i) => (
          <Reveal key={belief.title} delay={i * 70}>
            <div className="h-full rounded-card border border-hairline bg-surface p-6 shadow-md">
              <h3 className="font-display text-lg font-semibold text-strong">
                {belief.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{belief.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
