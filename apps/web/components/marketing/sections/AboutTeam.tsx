import { ABOUT_TEAM } from "@/content/marketing/about";
import { Section } from "@/components/marketing/ui/Section";

/**
 * AboutTeam — founding team cards. Each shows initials in an avatar until a real
 * photo slot is wired (content/marketing/images.ts). Add members in about.ts.
 */
export function AboutTeam() {
  return (
    <Section tone="raised">
      <h2 className="font-display text-2xl font-semibold text-strong sm:text-3xl">
        {ABOUT_TEAM.heading}
      </h2>
      <p className="mt-2 max-w-xl text-base text-body">{ABOUT_TEAM.subtitle}</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ABOUT_TEAM.members.map((member) => (
          <div
            key={member.name}
            className="rounded-card border border-hairline bg-surface p-6 shadow-md"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-accent-soft font-display text-lg font-semibold text-accent">
                {initials(member.name)}
              </span>
              <div>
                <p className="font-display text-base font-semibold text-strong">
                  {member.name}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-soft">
                  {member.role}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-body">{member.bio}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
