/**
 * LANDING — every string on the home page, in the order the page reads.
 *
 * Sections in components/marketing/sections/ are dumb renderers; the words live
 * here. To re-word the pitch, edit this file. To re-order or drop a section,
 * edit app/(marketing)/page.tsx.
 */
import { COACH_VERDICT, PLAYER_VERDICT } from "./verdicts";

export const HERO = {
  eyebrow: "Sports performance, decoded",
  // Short, instantly-graspable hook (best practice: headline lands in <5s).
  title: "Train every player like a pro.",
  subtitle:
    "Individual, adapting plans for athletes and a squad-wide readiness view for coaches. Elite S&C oversight, built for teams without it.",
  primaryCta: { label: "Book a pilot", href: "/contact" },
  secondaryCta: { label: "See it live", href: "/dashboard" },
  // Small reassurance line under the buttons.
  footnote: "Built for teams without full-time S&C support.",
};

/** The "decision card" signature visual in the hero. Pure data → it renders as
 *  a styled readout, no image required. Swap the numbers to taste. */
export const HERO_DECISION = {
  player: "Player · Centre mid",
  signals: [
    { label: "Recovery", value: "Below normal", tone: "monitor" as const },
    { label: "7-day load", value: "Climbing fast", tone: "adjust" as const },
    { label: "Match", value: "In 2 days", tone: "neutral" as const },
  ],
  verdict: {
    label: "Today's call",
    // Player-facing wording — matches the app's own verdict ("Ease in").
    decision: `${PLAYER_VERDICT.easeIn} — technical + mobility`,
    tone: "adjust" as const,
    reason: "Workload is spiking into a match. Hold heavy lifting until recovery rebounds.",
  },
};

/**
 * HOME — copy unique to the lean landing page. The home page teases; the detail
 * lives on /how-it-works and /teams. (The hero, highlights and comparison teaser
 * reuse HERO, SOLUTION.pillars and COMPARISON respectively.)
 */
export const HOME = {
  highlights: {
    eyebrow: "What you get",
    title: "Elite oversight, three ways.",
    subtitle:
      "The science runs underneath. What you see is a plan, a verdict, and a reason — for every player and every coach.",
  },
  // Compact version of the cost story, pointing to the full page.
  comparisonTeaser: {
    eyebrow: "The maths",
    title: "A performance department used to cost six figures.",
    body: "An S&C coach, a sports scientist and a physio run £90k–£150k+ a year before any kit. We give a small squad the same oversight for a fraction of one part-time salary.",
    cta: { label: "See the full breakdown", href: "/teams" },
  },
  // "Where to next" cards — a navigational aid on a deliberately short page.
  explore: {
    eyebrow: "Explore",
    title: "See it in depth.",
    cards: [
      {
        title: "How it works",
        body: "Follow a player's data from sync to a clear daily call.",
        href: "/how-it-works",
      },
      {
        title: "For teams",
        body: "The coach dashboard, who it's for, and why it beats a spreadsheet.",
        href: "/teams",
      },
      {
        title: "Pricing",
        body: "Founder-stage pricing, set with our pilot teams.",
        href: "/pricing",
      },
    ],
  },
};

/**
 * HOWITWORKS_HERO — copy + the pipeline visual for the /how-it-works hero.
 * The visual is pure data (renders as a styled flow, no image): inputs → engine
 * → a clear call, echoing the page's argument.
 */
export const HOWITWORKS_HERO = {
  eyebrow: "How it works",
  title: "How a day becomes a decision.",
  subtitle:
    "The same pipeline runs for one athlete or a whole squad — between a player syncing their day and a coach knowing exactly what to do.",
  pipeline: {
    inputs: [
      { label: "Sessions synced", note: "Wearable + training" },
      { label: "Recovery check-in", note: "20 seconds, daily" },
      { label: "Team schedule", note: "Matches + pitch load" },
    ],
    engine: { label: "Decision engine", note: "Reads readiness + load" },
    output: {
      label: "Today's call",
      decision: "Ease off — technical + mobility",
      tone: "adjust" as const,
    },
  },
};

/**
 * TEAMS_HERO — copy + the squad-readiness visual for the /teams hero. A compact
 * coach's-eye glance (readiness split + a few player rows) distinct from the home
 * hero's single-player decision card.
 */
export const TEAMS_HERO = {
  eyebrow: "For teams",
  title: "Give every player a plan. Give yourself the decisions.",
  subtitle:
    "Players get a mobile app that adapts to them. Coaches get a web dashboard built for visibility and comparison — the oversight of a full S&C department, without one.",
  squad: {
    total: 24,
    // Counts sum to total; widths in the bar are proportional.
    // Coach-facing wording — matches the dashboard's RAG labels exactly.
    split: [
      { tone: "ready" as const, count: 14, label: COACH_VERDICT.ready },
      { tone: "monitor" as const, count: 5, label: COACH_VERDICT.monitor },
      { tone: "adjust" as const, count: 2, label: COACH_VERDICT.adjust },
      { tone: "neutral" as const, count: 3, label: COACH_VERDICT.nodata },
    ],
    rows: [
      { name: "Centre mid", tone: "adjust" as const, status: COACH_VERDICT.adjust },
      { name: "Striker", tone: "monitor" as const, status: COACH_VERDICT.monitor },
      { name: "Full back", tone: "ready" as const, status: COACH_VERDICT.ready },
    ],
    attention: "2 players need your attention",
  },
};

export const PROBLEM = {
  eyebrow: "The problem",
  title: "More data hasn't made teams fitter. It's made them busier.",
  body:
    "Wearables, spreadsheets and apps produce a flood of numbers. But numbers aren't decisions — and most teams don't have a sports scientist to translate them. So the data sits unused, training stays one-size-fits-all, and the players who are quietly overreaching only get noticed once they're injured.",
  pains: [
    {
      title: "Data without direction",
      body: "HRV, sleep, GPS, RPE — lots of charts, no clear answer to 'so what do we change today?'",
    },
    {
      title: "One plan for everyone",
      body: "The same session for a player who's fresh and one who's cooked. Some are under-trained, some are heading for injury.",
    },
    {
      title: "No S&C in the building",
      body: "Elite oversight needs people most teams can't afford. Without it, load management is a guess.",
    },
  ],
};

export const SOLUTION = {
  eyebrow: "The solution",
  title: "A decision engine, not another dashboard.",
  body:
    "Performance OS reads each player's recovery, workload and schedule, then makes a call — in plain English. Players see what to do today and why. Coaches see the whole squad sorted by who needs them. The science runs underneath; the output is an action.",
  pillars: [
    {
      title: "Individual, adaptive plans",
      body: "Sport-specific programming that reshapes itself around recovery, missed sessions, training load and season phase — for every player, automatically.",
    },
    {
      title: "Squad-wide decision view",
      body: "A coach answers 'who's ready, who's overloaded, who's falling behind, what do I do' in under five minutes — without reading a single chart.",
    },
    {
      title: "Plain-English recommendations",
      body: "No ACWR, no jargon. Every flag comes with a reason and a suggested action a non-specialist can act on with confidence.",
    },
  ],
};

export const HOW_IT_WORKS = {
  eyebrow: "How it works",
  title: "From raw signals to a clear call.",
  subtitle:
    "The same pipeline runs for one athlete or a whole squad. Order matters here — each step feeds the next.",
  steps: [
    {
      title: "Players train and sync",
      body: "Sessions, wearables and a 20-second daily check-in flow in automatically. No manual data entry for the coach.",
    },
    {
      title: "The engine reads the load",
      body: "Recovery, training load and the team's fixed schedule combine into a readiness and workload signal for each player.",
    },
    {
      title: "It makes the call",
      body: "Push, hold or ease off — a specific recommendation per player, with the reasoning attached, updated daily.",
    },
    {
      title: "Coach and player act",
      body: "The player gets today's session; the coach gets the exceptions that need a human. Everyone moves on the same plan.",
    },
  ],
};

export const TWO_MODES = {
  eyebrow: "Two surfaces, one system",
  title: "Mobile for players. Web for coaches.",
  subtitle:
    "The player experience is mobile-first. The coach experience is built for visibility and comparison — which is why it's on the web, where the screen earns its keep.",
  modes: [
    {
      kind: "player" as const,
      label: "Player app",
      platform: "iOS · mobile-first",
      headline: "What do I do today — and why?",
      points: [
        "A sport-specific plan that adapts to recovery, workload and goals",
        "Today's session, the reasoning behind it, and how it fits the week",
        "Wearable and recovery data sync in the background",
        "Lightweight, fast, made for a 30-second glance before training",
      ],
      cta: { label: "See a player day", href: "/contact" },
    },
    {
      kind: "coach" as const,
      label: "Coach dashboard",
      platform: "Web · built for comparison",
      headline: "Know who is ready, who is overloaded, and what to do next.",
      points: [
        "Squad readiness at a glance, sorted by who needs you",
        "Adherence, load and recovery flags per player",
        "Plain-English recommendation cards you can act on",
        "Set the team schedule once — it shapes every player's plan",
      ],
      cta: { label: "Open the live demo", href: "/dashboard" },
    },
  ],
};

export const DIFFERENTIATION = {
  eyebrow: "Why it's different",
  title: "The moat is the decision layer.",
  subtitle:
    "Plenty of tools show you data or hand you a generic plan. The hard part — and the part that changes outcomes — is turning readiness, load and recovery into an action a coach and player will actually take.",
  // Each row contrasts a common category with what we add on top.
  rows: [
    {
      them: "Wearable analytics",
      themBody: "Show you HRV, sleep and strain — then leave you to interpret it.",
      us: "We translate it into a daily call, per player, in plain English.",
    },
    {
      them: "Training-plan apps",
      themBody: "Hand out a fixed programme that ignores how the week actually went.",
      us: "Our plan reshapes itself around recovery, missed sessions and the fixture list.",
    },
    {
      them: "Team dashboards",
      themBody: "Surface more charts for a coach who isn't a sports scientist.",
      us: "We surface the exceptions and the recommended action — not homework.",
    },
  ],
};

export const SUITABLE = {
  eyebrow: "Who it's for",
  title: "Built for the teams the elite tools skip.",
  subtitle:
    "Small and mid-sized squads that take performance seriously but don't have a full-time S&C department behind them.",
  // Sports the gym engine biases programming toward today.
  sports: [
    "Football / soccer",
    "Rugby",
    "Running clubs",
    "Cycling",
    "Swimming",
    "Hockey",
    "Netball",
    "Combat sports",
  ],
  teamTypes: [
    {
      title: "Semi-pro & academy",
      body: "Squads with real fixtures and real load, but a coaching staff stretched across everything.",
    },
    {
      title: "Clubs & associations",
      body: "Community and regional clubs that want elite-style load management without an elite budget.",
    },
    {
      title: "Serious individuals",
      body: "Athletes training for a sport who want a plan that adapts like a coach would — on their own.",
    },
  ],
};

export const SOCIAL_PROOF = {
  // Placeholder until real pilots agree to be named. Swap labels for logos via
  // components/marketing/ui/LogoCloud.tsx + content/marketing/images.ts.
  heading: "In pilot with clubs and squads building their performance edge",
  placeholders: ["Club A", "Academy B", "Running Co.", "County C", "Swim D"],
};

export const LEAD_MAGNET = {
  eyebrow: "Free resource",
  title: "The team pilot brief",
  body:
    "A one-page breakdown of how a pilot runs, what your players and coaches do, and what you'll see in the first four weeks. No call required.",
  inputLabel: "Work email",
  buttonLabel: "Send me the brief",
  // What the email actually triggers (mailto today — see lib/leads.ts).
  successNote: "Thanks — check your inbox. We'll send the brief shortly.",
};

export const PILOT_CTA = {
  eyebrow: "Run a pilot",
  title: "Give every player an individual plan. Give yourself the decisions.",
  body:
    "Start with one squad. We'll get your players onboarded and your dashboard live, then review what changed after four weeks — no long contract to find out if it works.",
  primaryCta: { label: "Book a pilot", href: "/contact" },
  secondaryCta: { label: "Talk to us", href: "/contact" },
};

export const FAQ = {
  eyebrow: "Questions",
  title: "The things coaches ask first.",
  items: [
    {
      q: "Do my players need expensive wearables?",
      a: "No. The engine works from a quick daily check-in and synced sessions, and gets sharper if players already use a wearable like a Fitbit, Garmin or Apple Watch. It degrades gracefully — less data means a more cautious recommendation, never a broken one.",
    },
    {
      q: "I'm not an S&C specialist. Will I understand it?",
      a: "That's the whole point. Every flag is written in plain English with a reason and a suggested action. There's no ACWR, MEV or TRIMP in the interface — just who needs you and what to do.",
    },
    {
      q: "Is my players' health data private?",
      a: "Yes, and it's a hard rule in how we're built. Coaches see a derived readiness and load signal plus availability — never the raw HRV, sleep or resting heart rate behind it. Players only ever see their own data.",
    },
    {
      q: "Does it replace our coaching?",
      a: "No. It replaces the guesswork and the spreadsheet, and gives you the oversight an S&C coach would. You still make the calls — we make sure you're making them with the full picture.",
    },
    {
      q: "What sports does it support?",
      a: "The gym programming biases toward your sport's demands today — football, rugby, running, cycling, swimming and more. It supports your sport's training rather than replacing your pitch, track or pool sessions.",
    },
    {
      q: "How does a pilot work?",
      a: "We onboard one squad, set up your dashboard, and run for four weeks so you can see real change before committing. Book a pilot and we'll walk you through it.",
    },
  ],
};
