"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTeam, listCoachTeams, rotateCode, type CoachTeam } from "@/lib/teams";

/**
 * TeamSetup — a coach founds a team and gets a share code (join-code flow).
 * Reachable at /get-started (outside the /dashboard coach-gate) so a brand-new
 * coach can found their first team. Players join with the code in the mobile app.
 */
export function TeamSetup() {
  const router = useRouter();
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setTeams(await listCoachTeams());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError("");
    const res = await createTeam(name.trim(), sport.trim() || undefined);
    if (res.ok) { setName(""); setSport(""); await load(); }
    else setError(res.error);
    setBusy(false);
  }

  async function onRotate(teamId: string) {
    const res = await rotateCode(teamId);
    if (res.ok) await load();
    else setError(res.error);
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); } catch { /* no clipboard */ }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-strong">Set up your team</h1>
      <p className="mt-1.5 text-sm text-muted">
        Create a team, then share its code — players enter it in the mobile app to join.
        You&apos;ll see their readiness, load and availability; never their raw health data.
      </p>

      <form onSubmit={onCreate} className="mt-6 space-y-3 rounded-card border border-hairline-strong bg-surface p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Team name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Riverside Hockey 1sts"
            maxLength={120}
            className="w-full rounded-card border border-hairline-strong bg-surface-2 px-4 py-3 text-sm text-strong placeholder:text-soft focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Sport (optional)</span>
          <input
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            placeholder="e.g. field hockey"
            maxLength={60}
            className="w-full rounded-card border border-hairline-strong bg-surface-2 px-4 py-3 text-sm text-strong placeholder:text-soft focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        {error && <p className="text-sm text-[var(--rust,#c0563f)]">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create team"}
        </button>
      </form>

      <h2 className="mt-8 font-display text-lg font-semibold text-strong">Your teams</h2>
      {loading ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No teams yet — create one above.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {teams.map((t) => (
            <li key={t.team_id} className="rounded-card border border-hairline-strong bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-strong">{t.name}</div>
                  {t.sport && <div className="text-xs text-muted">{t.sport}</div>}
                </div>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="shrink-0 text-sm text-accent underline-offset-4 hover:underline"
                >
                  Open dashboard →
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted">Join code</span>
                <code className="rounded bg-surface-2 px-2 py-1 font-mono text-sm tracking-widest text-strong">
                  {t.join_code ?? "—"}
                </code>
                {t.join_code && (
                  <button onClick={() => copy(t.join_code!)} className="text-xs text-accent hover:underline">
                    {copied === t.join_code ? "Copied ✓" : "Copy"}
                  </button>
                )}
                <button onClick={() => onRotate(t.team_id)} className="ml-auto text-xs text-muted hover:text-body hover:underline">
                  Rotate
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
