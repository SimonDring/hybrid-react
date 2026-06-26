import { LEAD_MAGNET } from "@/content/marketing/landing";
import { Section } from "@/components/marketing/ui/Section";
import { Eyebrow } from "@/components/marketing/ui/Eyebrow";
import { LeadCaptureForm } from "@/components/marketing/ui/LeadCaptureForm";
import { MediaPlaceholder } from "@/components/marketing/ui/MediaPlaceholder";

/**
 * LeadMagnet — a low-commitment email capture offering the pilot brief. A second
 * conversion path for visitors who aren't ready to "book" but will give an email.
 */
export function LeadMagnet() {
  return (
    <Section id="lead-magnet" tone="raised">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Eyebrow>{LEAD_MAGNET.eyebrow}</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-strong sm:text-4xl">
            {LEAD_MAGNET.title}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-body">
            {LEAD_MAGNET.body}
          </p>
          <div className="mt-6 max-w-md">
            <LeadCaptureForm
              source="lead-magnet"
              variant="inline"
              buttonLabel={LEAD_MAGNET.buttonLabel}
              successNote={LEAD_MAGNET.successNote}
            />
          </div>
        </div>
        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <MediaPlaceholder slot="how-it-works" />
        </div>
      </div>
    </Section>
  );
}
