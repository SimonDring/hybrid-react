# Phase 4 — AI full-picture (Stage 6 / AIGAS) · DESIGN NOTE

**Goal.** When AI goes live, it draws conclusions from the whole picture — gym + pitch + aerobic
+ form — but only after Phases 1–3 have put that data into the athlete's record, and only within
the ratified AI governance. Parent roadmap:
`docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md` (§Phase 4).

> **STATUS: DESIGN NOTE ONLY.** Phase 4 is **not buildable autonomously** and is **not started**.
> It is gated on Simon's `AI_ENABLED` go-live decision (open queue #3) and is **downstream** of
> Phase 3's data — AI can't reason over pitch/aerobic data that isn't in the record yet. This note
> exists so the roadmap is complete; the build is a future, Simon-gated sprint.

## Why this is last (a dependency, not just a deferral)

AI reasoning over "the full picture" is only as good as the record it reads. Phase 1 gives it
match-day structure, Phase 2 gives it the form model, Phase 3 gives it real pitch/GPS/match data.
Until those land, an AI "full picture" would be reasoning over gym-only data — the current state.
So Phase 4 waits on Phases 1–3, then opens on the AIGAS go-live conjunction.

## The architecture (already governed — no invention)

Everything here is **AIGAS** (`docs/architecture/AIGAS.md`) + **DAAS §2.3.4** (the C5 grounding
surface). Phase 4 builds nothing new in the governance; it activates the seam.

- **What AI may read — the C5 grounding surface (DAAS §2.3.4), enumerated:**
  - *Athlete-scoped scan (the athlete's own assistant):* their observations (incl. pitch/match/
    aerobic from Phase 3), materialised derivation history (incl. the Phase 2 form model), served
    insights/reports, plan/decision traces, and L2 knowledge.
  - *Coach-scoped scan:* the coach's consented, team-scoped **derived** surface only — Squad
    Signals, availability, plan/adherence summaries. **Never** member observations, member **raw
    vitals** (Art 11), or non-consented history (Art 22).
- **What AI may DO — exactly three routes (DAAS §2.4 / AIGAS), no fourth:** (1) advisory to a human,
  labelled per AIGAS §15; (2) staged, validated priors via Seam 2 (behind D14); (3) user-confirmed
  structured state via C1. It **never gates, never replaces the engine or the human**, never holds
  a browser-held key (server-side `ai-render` Edge Function only).
- **Confidence caps ride through** (Art 13; DAAS §4.2): no AI-derived signal may occupy the gate
  tier; AI over low-confidence inputs (a watch's HRV, the form model) stays advisory/soft.

## Preconditions (from the roadmap + open queue #3)

1. Phases 1–3 landed (the data the "full picture" needs).
2. The AI seam is merged behind flags (`AI_ENABLED` kill switch OFF, `ai-render` Edge Function,
   `AiService`) — already true.
3. A **per-capability eval harness** (recorded as REQUIRED) + the Edge Function deploy
   (`supabase/SECURITY-DEPLOY.md`).
4. **Simon's `AI_ENABLED` go-live decision.**

## Verification (when built)

Per-capability eval harness green; AIGAS faithfulness/honesty gates on every AI-rendered surface;
the privacy tests (a coach-addressed AI output containing any owner-only class fails composition);
no AI output reaches a decision except via the three governed routes.
