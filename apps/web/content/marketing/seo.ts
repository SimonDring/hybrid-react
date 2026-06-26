/**
 * SEO — per-page metadata helpers.
 *
 * Each marketing page exports `metadata = pageMeta(PAGE_SEO.x)`. The root layout
 * (app/layout.tsx) supplies the title template, OG defaults and metadataBase, so
 * here we only state what's unique to each page.
 */
import type { Metadata } from "next";

export const PAGE_SEO = {
  home: {
    title: undefined, // uses the root default (name — tagline)
    description:
      "Sport-specific training that adapts to recovery, workload and goals — with a squad-wide decision view for coaches. S&C-style oversight for teams without a full-time S&C coach.",
  },
  howItWorks: {
    title: "How it works",
    description:
      "From a player's daily sync to a clear training call: how Performance OS reads recovery, workload and the team schedule, then makes the decision in plain English.",
  },
  teams: {
    title: "For teams",
    description:
      "A mobile app for players and a web dashboard for coaches. Squad-wide readiness and load oversight — the work of an S&C department, for a fraction of the cost.",
  },
  about: {
    title: "About",
    description:
      "Why we built Performance OS: most teams don't need more data, they need better decisions. Elite-style S&C oversight, priced for everyone else.",
  },
  pricing: {
    title: "Pricing",
    description:
      "Squad-wide performance oversight for a fraction of one part-time salary. Founder-stage pricing, set with our pilot teams.",
  },
  contact: {
    title: "Book a pilot",
    description:
      "Run a four-week pilot with one squad. We'll onboard your players, set up your dashboard, and review what changed — no long contract.",
  },
  login: {
    title: "Coach login",
    description: "Sign in to your Performance OS coach dashboard.",
  },
} as const;

/** Build a Next.js Metadata object from a page's SEO entry. */
export function pageMeta(entry: {
  title?: string;
  description: string;
}): Metadata {
  return {
    title: entry.title,
    description: entry.description,
    openGraph: { title: entry.title, description: entry.description },
    twitter: { title: entry.title, description: entry.description },
  };
}
