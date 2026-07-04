# WP-30 — Explainability surfacing (audit V5) · design

**Date:** 2026-07-04 · **Status:** implementing (low risk per the audit; split 30a/30b)
**Governing:** Constitution (explainability — every prescription can say why), EDS §D9/§D4–D5,
TAS (the read-model seam `explain` stays RESERVED — this ships the *data* it will read).

## Principle

The UI shows **only reasons the engine actually emitted** when it made the decision.
No screen re-derives or invents an explanation. If the engine didn't reason it, the UI
doesn't say it.

## 30a — the engine emits (additive keys; goldens re-baselined + audited)

1. **`session._objective = { quality, purpose, rationale }`** on D11 sport sessions.
   The D9 objective is already BUILT per slot in `allocator.js` (`deriveSessionObjective`,
   plus the injury re-target note and the category-coverage note appended to its
   `rationale`) — then dropped. Attach it to the emitted session AFTER the category
   append so the full string ships. Underscore prefix = same convention as the reflow's
   `_adapted`/`_intensityEased` (annotation, not prescription).
2. **`plan.meta.diagnosis = { sport, limitingFactors, priorityQualities }`** — the
   D4→D5 chain summary (quality ids + magnitudes from `perf.limitingFactors`,
   the ranked `perf.priorityAdaptations`), stamped only when the diagnosis is
   non-empty (sport paths). Build stays legacy → no diagnosis → key absent.

**Deferred, recorded:** legacy-anchor rationale waits for the build flip (WP-22) — when
build goes D11 the rationale comes free; a synthetic string now would be invented copy,
not an emitted decision. Substitution rationale needs its own emission in
`substitutions.js` (none exists today) — follow-up.

## 30b — the UI reads (no re-derivation)

1. **SessionDetail** — a muted "Why this session" line: `session._objective.rationale`.
2. **WeekDetail** — an "eased" note when `week._intensityEased` (string already
   holds the reason: travel / low readiness); sits beside the existing auto-deload
   badge (which already reads `deloadReason`).
3. **WeekDetail (current week)** — a forgiveness note when `PlanService.lastForgiven()`
   reports sets past the recoverable ceiling: honest "the plan moved on" copy
   (Art 10 honesty; was dev-only).

## Verification

- Tests: emission shapes (`_objective` on D11 sessions; `meta.diagnosis` on sport,
  absent on build); goldens re-baselined with a line-audit (additive keys only);
  build-parity still byte-identical (both sides gain the same keys).
- Preview: /dev renders a runner plan — rationale visible on sessions (DevPlayground
  readout); screens compile + build; badge markup verified in preview where reachable
  without auth.
