import { ABOUT_MISSION } from "@/content/marketing/about";
import { Section } from "@/components/marketing/ui/Section";

/** AboutStory — the "why we built it" narrative, set as readable prose. */
export function AboutStory() {
  return (
    <Section tone="raised" containerClassName="max-w-3xl">
      <h2 className="font-display text-2xl font-semibold text-strong sm:text-3xl">
        {ABOUT_MISSION.heading}
      </h2>
      <div className="mt-6 space-y-5">
        {ABOUT_MISSION.body.map((para) => (
          <p key={para.slice(0, 24)} className="text-base leading-relaxed text-body sm:text-lg">
            {para}
          </p>
        ))}
      </div>
    </Section>
  );
}
