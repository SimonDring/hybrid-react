import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/marketing/ui/Wordmark";
import { GlowBackdrop } from "@/components/marketing/ui/GlowBackdrop";
import { LoginForm } from "@/components/marketing/sections/LoginForm";

/* Coach login. The dashboard currently runs on mock data with no gate, so this
   is the front door, ready for real Supabase auth (see lib/auth.ts). */
export default function LoginPage() {
  return (
    <div className="relative w-full max-w-sm">
      <GlowBackdrop />
      <div className="relative">
        <div className="mb-8 flex justify-center">
          <Wordmark href="/" />
        </div>

        <div className="rounded-card border border-hairline-strong bg-surface p-7 shadow-lg sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-strong">
            Coach login
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in with the same email and password as your mobile app.
          </p>

          <div className="mt-7">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link
            href="/contact"
            className="text-accent underline-offset-4 hover:underline"
          >
            Book a pilot
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/" className="text-soft underline-offset-4 hover:text-body hover:underline">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
