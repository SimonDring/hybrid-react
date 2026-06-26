/**
 * leads — the single lead-capture seam.
 *
 * Both the contact form and the email-only captures (footer, lead magnet) call
 * submitLead(). Today it opens a pre-filled email (mailto) to SITE.contactEmail,
 * which works with zero backend. To go live, replace the body of submitLead()
 * with a real POST — nothing in the UI changes.
 *
 *   // Formspree:
 *   await fetch("https://formspree.io/f/XXXX", { method:"POST", body: JSON.stringify(lead) });
 *
 *   // Supabase Edge Function / your API route:
 *   await fetch("/api/leads", { method:"POST", body: JSON.stringify(lead) });
 */
import { SITE, INTEGRATIONS } from "@/content/marketing/site";
import { track } from "@/lib/analytics";

export interface Lead {
  /** Where the lead came from, e.g. "contact", "footer", "lead-magnet". */
  source: string;
  email: string;
  name?: string;
  team?: string;
  role?: string;
  message?: string;
}

export type LeadResult =
  | { ok: true; method: "endpoint" | "mailto" }
  | { ok: false; error: string };

export async function submitLead(lead: Lead): Promise<LeadResult> {
  track(lead.source === "lead-magnet" ? "lead_magnet_submit" : "lead_submit", {
    source: lead.source,
  });

  // ── Preferred: POST to a real endpoint when one is configured ───────────
  // Works with Formspree (JSON + Accept: application/json) or this app's
  // /api/leads route. See content/marketing/site.ts → INTEGRATIONS.
  if (INTEGRATIONS.leadsEndpoint) {
    try {
      const res = await fetch(INTEGRATIONS.leadsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(lead),
      });
      if (res.ok) return { ok: true, method: "endpoint" };
      return {
        ok: false,
        error: `Couldn't send right now. Please email us at ${SITE.contactEmail}.`,
      };
    } catch {
      return {
        ok: false,
        error: `Network error. Please email us at ${SITE.contactEmail}.`,
      };
    }
  }

  try {
    // ── Fallback: mailto (works today, no backend) ────────────────────────
    const subject = encodeURIComponent(
      `[${lead.source}] ${SITE.name} enquiry${lead.team ? ` — ${lead.team}` : ""}`,
    );
    const lines = [
      lead.name && `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      lead.team && `Team / club: ${lead.team}`,
      lead.role && `Role: ${lead.role}`,
      lead.message && `\n${lead.message}`,
    ].filter(Boolean);
    const bodyText = encodeURIComponent(lines.join("\n"));

    if (typeof window !== "undefined") {
      window.location.href = `mailto:${SITE.contactEmail}?subject=${subject}&body=${bodyText}`;
    }

    return { ok: true, method: "mailto" };
  } catch {
    return {
      ok: false,
      error: "Something went wrong. Please email us directly at " + SITE.contactEmail + ".",
    };
  }
}

/** Lightweight email check for inline validation. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
