import type { Metadata } from "next";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";
import { CONTACT } from "@/content/marketing/contact";
import { SITE } from "@/content/marketing/site";

import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { LeadCaptureForm } from "@/components/marketing/ui/LeadCaptureForm";
import { WhatHappensNext } from "@/components/marketing/sections/WhatHappensNext";

export const metadata: Metadata = pageMeta(PAGE_SEO.contact);

/* Contact / pilot page — the conversion endpoint. Left: pitch + process; right:
   the form. The form posts through lib/leads.ts (mailto today). */
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: pitch + process */}
        <div>
          <Eyebrow>{CONTACT.eyebrow}</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-strong sm:text-5xl">
            {CONTACT.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-body">
            {CONTACT.subtitle}
          </p>
          <div className="mt-10">
            <WhatHappensNext />
          </div>
          <p className="mt-6 text-sm text-muted">
            {CONTACT.reassurance}{" "}
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="text-accent underline-offset-4 hover:underline"
            >
              {SITE.contactEmail}
            </a>
          </p>
        </div>

        {/* Right: form */}
        <div>
          <div className="rounded-card border border-hairline-strong bg-surface p-6 shadow-lg sm:p-8">
            <h2 className="font-display text-xl font-semibold text-strong">
              {CONTACT.formHeading}
            </h2>
            <div className="mt-6">
              <LeadCaptureForm
                source="contact"
                variant="full"
                buttonLabel={CONTACT.formButton}
                successNote={CONTACT.formSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
