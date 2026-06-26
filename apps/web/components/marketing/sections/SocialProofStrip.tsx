import { SOCIAL_PROOF } from "@/content/marketing/landing";
import { LogoCloud } from "@/components/marketing/ui/LogoCloud";

/**
 * SocialProofStrip — a quiet credibility band under the hero. Text placeholders
 * now; swap for real club logos once pilots agree to be named.
 */
export function SocialProofStrip() {
  return (
    <div className="border-y border-hairline bg-surface/30">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.15em] text-soft">
          {SOCIAL_PROOF.heading}
        </p>
        <LogoCloud items={SOCIAL_PROOF.placeholders} className="mt-6" />
      </div>
    </div>
  );
}
