/**
 * analytics — the single tracking seam.
 *
 * Every CTA click and form submit calls track(). Today it just logs in dev so
 * nothing is sent anywhere. To go live, wire ONE provider here (Plausible, GA4,
 * PostHog…) and every event across the site starts flowing — no component edits.
 *
 *   // Plausible example:
 *   window.plausible?.(event, { props });
 *
 *   // GA4 example:
 *   window.gtag?.("event", event, props);
 */

export type AnalyticsEvent =
  | "cta_click"
  | "lead_submit"
  | "lead_magnet_submit"
  | "login_attempt"
  | "demo_open";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
    gtag?: (command: string, event: string, params?: Record<string, string>) => void;
  }
}

export function track(
  event: AnalyticsEvent,
  props: Record<string, string> = {},
): void {
  // Merge any UTM params so you can attribute leads to a campaign.
  const enriched = { ...getUtmParams(), ...props };

  if (typeof window !== "undefined") {
    // Fire whichever provider(s) the <Analytics> loader has attached. Both are
    // no-ops if not configured, so this is always safe to call.
    window.plausible?.(event, { props: enriched });
    window.gtag?.("event", event, enriched);
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, enriched);
  }
}

/** Reads UTM params from the URL so outreach campaigns are attributable. */
export function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = p.get(key);
    if (v) out[key] = v;
  }
  return out;
}
