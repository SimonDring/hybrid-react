import { CONTACT } from "@/content/marketing/contact";

/**
 * WhatHappensNext — a numbered, low-pressure description of the pilot process.
 * Reduces the perceived risk of the contact form so more people complete it.
 */
export function WhatHappensNext() {
  return (
    <div className="rounded-card border border-hairline bg-surface/50 p-6 sm:p-7">
      <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-soft">
        {CONTACT.nextHeading}
      </h3>
      <ol className="mt-5 space-y-5">
        {CONTACT.steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-surface font-mono text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-strong">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
