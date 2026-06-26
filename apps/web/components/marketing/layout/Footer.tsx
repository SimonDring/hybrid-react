import Link from "next/link";
import { SITE, FOOTER_GROUPS } from "@/content/marketing/site";
import { Wordmark } from "@/components/marketing/ui/Wordmark";
import { LeadCaptureForm } from "@/components/marketing/ui/LeadCaptureForm";
import { AppBadges } from "@/components/marketing/ui/AppBadges";

/**
 * Footer — brand + nav columns + a compact email capture (a second, low-friction
 * lead path). Link groups come from content/site.ts. Social links hide when empty.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const socials = Object.entries(SITE.social).filter(([, href]) => href);

  return (
    <footer className="border-t border-hairline bg-surface/30">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand + pitch */}
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {SITE.description}
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-soft">
              Get the player app
            </p>
            <AppBadges className="mt-3" />
          </div>

          {/* Link columns */}
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-soft">
                {group.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-body transition-colors hover:text-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Email capture */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-soft">
              Stay in the loop
            </h3>
            <p className="mt-4 text-sm text-muted">
              Occasional notes on building the product. No spam.
            </p>
            <LeadCaptureForm
              source="footer"
              variant="inline"
              buttonLabel="Subscribe"
              successNote="You're on the list — thanks."
              className="mt-4"
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-soft">
            © {year} {SITE.name}. All rights reserved.
          </p>
          {socials.length > 0 && (
            <div className="flex gap-4">
              {socials.map(([name, href]) => (
                <a
                  key={name}
                  href={href}
                  className="text-xs capitalize text-soft transition-colors hover:text-body"
                >
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
