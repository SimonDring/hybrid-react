/**
 * COMPARISON — the "Traditional performance department vs Performance OS" story.
 *
 * The figures are real UK market ranges (sources below) so the section is
 * credible, not hand-wavy. Keep them honest: if you quote them publicly, the
 * `disclaimer` line stays. Update ranges here and the section re-renders.
 */

export const COMPARISON = {
  eyebrow: "The maths",
  title: "Elite oversight used to need a department. Now it needs a login.",
  subtitle:
    "Here's what world-class load management actually costs to staff and equip — and why it's been locked to the richest clubs.",

  /** Left column: the traditional setup. */
  traditional: {
    label: "Traditional performance department",
    tag: "What the elite pay for",
    rows: [
      {
        dimension: "People",
        detail:
          "An S&C coach, a sports scientist and a physio — a 2–3 person performance team.",
      },
      {
        dimension: "Salaries",
        // S&C ~£24k–£43k, sports scientist ~£30k–£37k, physio comparable.
        detail: "£90k–£150k+ per year in wages alone, before any kit.",
        emphasis: true,
      },
      {
        dimension: "Technology",
        detail:
          "GPS tracking from ~£3.6k up to £20k–£40k a year; force plates run into five figures.",
      },
      {
        dimension: "Reach",
        detail:
          "One squad, one building. Set-up time measured in months.",
      },
      {
        dimension: "Who gets it",
        detail: "Pro clubs and well-funded academies. Everyone else goes without.",
      },
    ],
  },

  /** Right column: us. */
  ours: {
    label: "Performance OS",
    tag: "What you pay for",
    rows: [
      {
        dimension: "People",
        detail: "No new hires. The decision engine does the analysis.",
      },
      {
        dimension: "Cost",
        detail: "One subscription — a fraction of a single part-time salary.",
        emphasis: true,
      },
      {
        dimension: "Technology",
        detail:
          "Works from a daily check-in and the wearables players already own.",
      },
      {
        dimension: "Reach",
        detail: "Every player covered from day one. Live in days, not months.",
      },
      {
        dimension: "Who gets it",
        detail: "Small and mid-sized teams that were priced out — until now.",
      },
    ],
  },

  /** The punchline stats strip. */
  headline: {
    stat: "£100k+",
    statLabel: "a year to staff and equip a performance department",
    versus: "vs",
    ourStat: "one subscription",
    ourLabel: "for the same squad-wide oversight",
  },

  disclaimer:
    "Figures are typical UK market ranges (2025–26) for illustration, not a quote. Salaries: PayScale, Indeed, Glassdoor. Technology: Catapult, SimpliFaster.",
};
