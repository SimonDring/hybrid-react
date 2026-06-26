"use client";

import { useState, type FormEvent } from "react";
import { submitLead, isValidEmail } from "@/lib/leads";
import { cn } from "@/lib/cn";

/**
 * LeadCaptureForm — the one form behind every lead capture on the site.
 *  - variant="full"   → contact page (name, email, team, role, message)
 *  - variant="inline" → footer + lead magnet (email only, single row)
 * On submit it calls lib/leads.ts → submitLead() (mailto today, real POST later).
 */

const fieldClass =
  "w-full rounded-card border border-hairline-strong bg-surface-2 px-4 py-3 text-sm text-strong placeholder:text-soft transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

type Status = "idle" | "submitting" | "success" | "error";

export function LeadCaptureForm({
  source,
  variant = "full",
  buttonLabel = "Book a pilot",
  successNote = "Thanks — we'll be in touch shortly.",
  className,
}: {
  source: string;
  variant?: "full" | "inline";
  buttonLabel?: string;
  successNote?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // Which path the submit took, so the success copy stays honest: a real POST
  // shows `successNote`; the mailto fallback says "your email app is opening".
  const [method, setMethod] = useState<"endpoint" | "mailto">("endpoint");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError("");
    const result = await submitLead({
      source,
      email,
      name: data.get("name") ? String(data.get("name")) : undefined,
      team: data.get("team") ? String(data.get("team")) : undefined,
      role: data.get("role") ? String(data.get("role")) : undefined,
      message: data.get("message") ? String(data.get("message")) : undefined,
    });

    if (result.ok) {
      setMethod(result.method);
      setStatus("success");
      form.reset();
    } else {
      setError(result.error);
      setStatus("error");
    }
  }

  if (status === "success") {
    const message =
      method === "mailto"
        ? "Your email app is opening — hit send and we'll be in touch within two working days."
        : successNote;
    return (
      <div
        className={cn(
          "rounded-card border border-ready/30 bg-ready-soft px-5 py-4 text-sm text-ready",
          className,
        )}
        role="status"
      >
        {message}
      </div>
    );
  }

  // Compact single-row email capture for the footer + lead magnet.
  if (variant === "inline") {
    return (
      <form onSubmit={onSubmit} className={cn("w-full", className)} noValidate>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            name="email"
            required
            placeholder="you@club.com"
            aria-label="Email address"
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex h-12 flex-shrink-0 items-center justify-center rounded-card bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {status === "submitting" ? "Sending…" : buttonLabel}
          </button>
        </div>
        {status === "error" && (
          <p className="mt-2 text-xs text-adjust">{error}</p>
        )}
      </form>
    );
  }

  // Full contact form.
  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <input name="name" type="text" placeholder="Alex Coach" className={fieldClass} />
        </Field>
        <Field label="Work email" required>
          <input name="email" type="email" required placeholder="you@club.com" className={fieldClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team or club">
          <input name="team" type="text" placeholder="Riverside FC U21s" className={fieldClass} />
        </Field>
        <Field label="Your role">
          <select name="role" defaultValue="" className={cn(fieldClass, "appearance-none")}>
            <option value="" disabled>Select…</option>
            <option>Head coach</option>
            <option>Assistant coach</option>
            <option>S&C / fitness</option>
            <option>Manager / director</option>
            <option>Player / athlete</option>
            <option>Other</option>
          </select>
        </Field>
      </div>
      <Field label="What would you like to achieve?">
        <textarea
          name="message"
          rows={4}
          placeholder="A line on your squad, your sport, and what you're hoping a pilot proves."
          className={cn(fieldClass, "resize-none")}
        />
      </Field>

      {status === "error" && (
        <p className="text-sm text-adjust" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-accent px-6 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Sending…" : buttonLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
    </label>
  );
}
