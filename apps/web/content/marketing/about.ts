/**
 * ABOUT — mission, the belief behind the product, and the team.
 * Founder-stage and minimal by design. Add team members to TEAM as you hire;
 * each renders a card with a swappable photo slot (see content/marketing/images.ts).
 */

export const ABOUT_HERO = {
  eyebrow: "About",
  title: "Most teams don't need more data. They need better decisions.",
  subtitle:
    "Performance OS exists to put elite-style strength & conditioning oversight in the hands of teams who could never afford an elite S&C department.",
};

export const ABOUT_MISSION = {
  heading: "Why we built it",
  body: [
    "Elite sport solved load management years ago — with people. Sports scientists, S&C coaches and physios who turn a player's data into the right session, every day. It works. It also costs more than almost any club, academy or community team can justify.",
    "Everyone else got handed tools instead of decisions: wearables that produce charts, apps that hand out fixed plans, dashboards that assume someone on staff can read them. The data went up. The quality of training mostly didn't.",
    "We're closing that gap with software. A decision engine reads each player's recovery, workload and schedule and makes the call — in plain English — so a coach without a sports-science background gets the oversight of one who does.",
  ],
};

export const ABOUT_BELIEFS = {
  heading: "What we believe",
  beliefs: [
    {
      title: "A decision beats a dashboard",
      body: "Data only matters when it changes what someone does. Every number we collect has to end in an action, or it's noise.",
    },
    {
      title: "Plain English is a feature",
      body: "If a coach needs a sports-science degree to use it, we've failed. The hard maths stays under the hood.",
    },
    {
      title: "The player owns their body",
      body: "Raw health data is private. Coaches get what they need to coach — never the intimate numbers underneath.",
    },
    {
      title: "Elite shouldn't mean exclusive",
      body: "The same standard of care the top 1% of teams enjoy should be available to the rest. That's the whole point.",
    },
  ],
};

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  /** Image slot key (content/marketing/images.ts). Renders initials until set. */
  photoSlot?: string;
}

export const ABOUT_TEAM = {
  heading: "Who's building it",
  subtitle: "A small founding team, close to the sport and the science.",
  // Replace with real people. The card shows initials until a photo slot is wired.
  members: [
    {
      name: "Founder",
      role: "Product & Engineering",
      bio: "Building the decision engine and the experience around it.",
      photoSlot: "team-founder",
    },
  ] as TeamMember[],
};

export const ABOUT_CTA = {
  title: "Want to see it on your squad?",
  body: "We're running pilots now. Bring one team and see what changes in four weeks.",
  cta: { label: "Book a pilot", href: "/contact" },
};
