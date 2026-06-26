import Script from "next/script";
import { INTEGRATIONS } from "@/content/marketing/site";

/**
 * Analytics — loads whichever analytics provider you've configured (Plausible
 * and/or GA4), or nothing at all. Renders no markup when unconfigured, so it's
 * safe to leave mounted. Once a provider is loaded, lib/analytics.ts → track()
 * automatically routes events to it.
 *
 * Plausible is privacy-first and needs no cookie banner; GA4 does require a
 * consent banner under UK/EU law — add one before enabling GA in production.
 */
export function Analytics() {
  const { plausibleDomain, gaMeasurementId } = INTEGRATIONS;

  return (
    <>
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}

      {gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaMeasurementId}');`}
          </Script>
        </>
      )}
    </>
  );
}
