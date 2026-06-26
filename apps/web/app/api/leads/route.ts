import { NextResponse } from "next/server";

/**
 * POST /api/leads — a same-origin endpoint for the lead forms.
 *
 * Point the forms here by setting NEXT_PUBLIC_LEADS_ENDPOINT="/api/leads"
 * (see .env.example). It validates the lead and, today, logs it server-side and
 * returns success — so the form works end-to-end in development with no accounts.
 *
 * To deliver leads for real, add ONE of these inside the marked block:
 *
 *   // Email via Resend (needs RESEND_API_KEY):
 *   import { Resend } from "resend";
 *   await new Resend(process.env.RESEND_API_KEY).emails.send({
 *     from: "Performance OS <leads@yourdomain>", to: "you@yourdomain",
 *     subject: `New ${lead.source} lead`, text: JSON.stringify(lead, null, 2),
 *   });
 *
 *   // Store in Supabase (server-side; service role key stays on the server):
 *   await supabaseAdmin.from("leads").insert(lead);
 *
 * NOTE: this is a server route, so it needs a Node host (e.g. Vercel). If you
 * static-export the site instead, use Formspree via NEXT_PUBLIC_LEADS_ENDPOINT.
 */

interface LeadPayload {
  source?: string;
  email?: string;
  name?: string;
  team?: string;
  role?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let lead: LeadPayload;
  try {
    lead = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!lead.email || !EMAIL_RE.test(lead.email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  // ── Deliver the lead ─────────────────────────────────────────────────────
  // Wire Resend / Supabase / a webhook here (see header). For now, log it so the
  // flow is real in dev. (Don't log PII like this in production.)
  console.log("[lead]", {
    source: lead.source ?? "unknown",
    email: lead.email,
    team: lead.team,
    role: lead.role,
  });
  // ─────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true });
}
