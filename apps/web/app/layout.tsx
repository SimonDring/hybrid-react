import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SITE } from "@/content/marketing/site";
import "./globals.css";

/*
  Two web fonts power the MARKETING site only (see app/globals.css):
  - Space Grotesk → display headlines (engineered, athletic)
  - Inter         → body copy
  The dashboard keeps the system font stack (--font-sans), so this changes
  nothing about how /dashboard looks. next/font self-hosts the files at build
  time — no network request from the user's browser, no layout shift.
*/
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Default metadata for the whole site. Individual marketing pages override
// title/description via their own `metadata` export (see content/marketing/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    images: [{ url: "/og/default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/og/default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
