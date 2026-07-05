"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInCoach } from "@/lib/auth";
import { signInSession } from "@/lib/session";
import { hasCoachSession } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/**
 * LoginForm — coach sign-in. Calls lib/auth.ts → signInCoach() (a stub today)
 * and on success routes to /dashboard. When real Supabase auth is wired in
 * lib/auth.ts, the same email + password as the mobile app will just work — this
 * component doesn't change. See lib/auth.ts for the wiring steps.
 */

const fieldClass =
  "w-full rounded-card border border-hairline-strong bg-surface-2 px-4 py-3 text-sm text-strong placeholder:text-soft transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectError = ({
    not_coach: "That account isn't a team coach.",
    signed_out: "Please sign in to view the dashboard.",
    unavailable: "The dashboard isn't available right now.",
  } as Record<string, string>)[params.get("error") ?? ""] ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(redirectError);

  // Already signed in (a REAL Supabase session)? Skip the form. Uses the real
  // session, not the display marker, so there's no bounce with the middleware gate.
  useEffect(() => {
    let active = true;
    hasCoachSession().then((yes) => { if (active && yes) router.replace("/dashboard"); });
    return () => { active = false; };
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    track("login_attempt");

    const data = new FormData(e.currentTarget);
    const result = await signInCoach(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? ""),
    );

    if (result.ok) {
      signInSession(String(data.get("email") ?? ""));
      router.push("/dashboard");
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@club.com"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={fieldClass}
        />
      </label>

      {error && (
        <p className="text-sm text-adjust" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center rounded-pill bg-accent px-6 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-accent-strong",
          loading && "opacity-60",
        )}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
