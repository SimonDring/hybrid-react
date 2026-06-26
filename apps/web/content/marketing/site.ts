/**
 * SITE — the master config for the marketing website.
 *
 * This is the ONE file to edit to rebrand, re-route the nav, change the primary
 * call-to-action, or repoint the contact email. Nothing here is layout; it's all
 * content. Components read from it so a copy/brand change never means touching JSX.
 */

export const SITE = {
  /** Brand name. Used in nav, footer, metadata, JSON-LD. Change here to rebrand. */
  name: "Performance OS",

  /** One-line positioning — the <10-second pitch. */
  tagline: "We turn player data into training decisions",

  /** Longer description for SEO / social cards. */
  description:
    "S&C-style oversight for teams without a full-time S&C coach. Every player gets an adaptive, sport-specific plan; coaches get a squad-wide decision view — who's ready, who's overloaded, and what to do next.",

  /** Canonical URL — used for metadata and the sitemap. Update at launch. */
  url: "https://performanceos.app",

  /**
   * Contact inbox for the form's mailto fallback (see lib/leads.ts).
   * ⚠️ Point this at an inbox you actually monitor before going live.
   */
  contactEmail: "hello@performanceos.app",

  /** Social links — empty strings are hidden in the footer. */
  social: {
    x: "",
    linkedin: "",
    instagram: "",
  },
} as const;

/**
 * INTEGRATIONS — flip the backend on by setting these (see apps/web/.env.example).
 * Each is empty by default, so the site works with NO accounts: forms fall back to
 * a pre-filled email, analytics stays silent. Add a value and it activates — no
 * code change. NEXT_PUBLIC_ vars are readable in the browser (required here).
 */
export const INTEGRATIONS = {
  /**
   * Where the lead forms POST. Use a Formspree URL ("https://formspree.io/f/xxxx")
   * or this app's own route ("/api/leads"). Empty = mailto fallback.
   */
  leadsEndpoint: process.env.NEXT_PUBLIC_LEADS_ENDPOINT ?? "",
  /** Plausible site domain, e.g. "performanceos.app". Empty = analytics off. */
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "",
  /** Google Analytics 4 measurement id, e.g. "G-XXXXXXX". Empty = off. */
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID ?? "",
} as const;

/**
 * The single primary action, repeated across the site. Changing the label or
 * destination here updates every primary CTA at once.
 */
export const PRIMARY_CTA = {
  label: "Book a pilot",
  href: "/contact",
} as const;

/** The coach sign-in entry point (top-right of the nav). */
export const COACH_CTA = {
  label: "Coach login",
  href: "/login",
} as const;

/**
 * APP_LINKS — the player on-ramp. The website is the front door; these get a
 * player into the actual app. Store URLs are empty until you have listings (the
 * badge hides). `webApp` is the installable PWA, live today.
 */
export const APP_LINKS = {
  ios: "", // e.g. "https://apps.apple.com/app/idXXXXXXXXX"
  android: "", // e.g. "https://play.google.com/store/apps/details?id=..."
  // ⚠️ Verify your deployed GitHub Pages URL (base path is /hybrid-react/).
  webApp: "https://simondring.github.io/hybrid-react/",
} as const;

/**
 * Top navigation. Each tab is its own page (real route). Keep this lean — the
 * best product sites (Linear, Vercel) use few, confident nav items. Add a page
 * by adding one line here and creating app/(marketing)/<slug>/page.tsx.
 */
export const NAV_LINKS: { label: string; href: string }[] = [
  { label: "How it works", href: "/how-it-works" },
  { label: "For teams", href: "/teams" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

/** Footer link groups. Add columns/links here as the site grows. */
export const FOOTER_GROUPS: {
  heading: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "For teams", href: "/teams" },
      { label: "Live dashboard demo", href: "/dashboard" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Book a pilot", href: "/contact" },
      { label: "Coach login", href: "/login" },
    ],
  },
];
