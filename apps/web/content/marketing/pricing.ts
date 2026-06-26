/**
 * PRICING — founder-stage tiers. Pricing is deliberately "talk to us" while
 * pilots set the real numbers. When you fix prices, add a `price` field per tier
 * and the card will show it; until then it shows the `priceNote`.
 */

export const PRICING_HERO = {
  eyebrow: "Pricing",
  title: "Priced for teams without a performance budget.",
  subtitle:
    "A fraction of one part-time salary, for squad-wide oversight. We're setting final pricing with our pilot teams — start one and you'll help shape it.",
};

export interface PricingTier {
  name: string;
  tagline: string;
  /** Shown when no fixed `price` is set yet. */
  priceNote: string;
  price?: string;
  priceSuffix?: string;
  features: string[];
  cta: { label: string; href: string };
  /** Highlights the recommended tier. */
  featured?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Individual",
    tagline: "For the serious solo athlete.",
    priceNote: "From the app",
    features: [
      "Sport-specific adaptive plan",
      "Recovery & workload-aware programming",
      "Wearable sync",
      "Mobile-first daily guidance",
    ],
    cta: { label: "Get the app", href: "/contact" },
  },
  {
    name: "Team pilot",
    tagline: "One squad, four weeks, no long contract.",
    priceNote: "Custom — talk to us",
    features: [
      "Everything in Individual, for every player",
      "Coach web dashboard",
      "Squad readiness & load decision view",
      "Plain-English recommendation cards",
      "Onboarding & setup support",
    ],
    cta: { label: "Book a pilot", href: "/contact" },
    featured: true,
  },
  {
    name: "Club",
    tagline: "Multiple squads under one roof.",
    priceNote: "Custom — talk to us",
    features: [
      "Everything in Team",
      "Multiple teams & coaches",
      "Cross-squad oversight",
      "Priority support",
    ],
    cta: { label: "Talk to us", href: "/contact" },
  },
];

export const PRICING_FAQ = {
  heading: "Pricing questions",
  items: [
    {
      q: "Why isn't pricing public yet?",
      a: "We're setting it with our first pilot teams so it reflects real value, not a guess. Pilot teams lock in early pricing.",
    },
    {
      q: "Is there a long contract?",
      a: "No. A pilot is a four-week run so you can see change before committing to anything longer.",
    },
    {
      q: "What does a pilot include?",
      a: "Player onboarding, your coach dashboard set up with your squad, and a review of what changed after four weeks.",
    },
  ],
};
