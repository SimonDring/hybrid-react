import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMeta, PAGE_SEO } from "@/content/marketing/seo";

export const metadata: Metadata = {
  ...pageMeta(PAGE_SEO.login),
  // Keep the login page out of search results.
  robots: { index: false, follow: false },
};

/* Login has its own minimal, centred layout — no marketing nav or footer, and
   the Inter body font (font-body) so it matches the marketing look. */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12 font-body">
      {children}
    </div>
  );
}
