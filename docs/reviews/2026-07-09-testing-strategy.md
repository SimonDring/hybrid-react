# Testing Strategy — 2026-07-09

**Status: REVIEW-dated proposal (governance sprint Phase 6). If adopted, its
practices graduate into living docs (CLAUDE.md workflow + a testing README);
this file stays as the design record.**

## Where testing stands (measured this sprint)

195 test files, all green in **14.1s**, CI-gated on push/PR and gating deploy.
The suite's genius is that it tests *invariants*, not just cases:

- **Golden master** (19 archetypes + build-parity 9) pins full plan output;
  re-baselines are deliberate (`UPDATE=1`) and audited key-by-key.
- **Ratchets**: engine-api-boundary (deep imports may only shrink),
  knowledge-set-ratchet (KSV must bump with data changes), determinism-clock,
  the worktree guard (never test the wrong engine).
- **Quality gates**: d11-*-quality tests assert plans *improved*, not just
  changed (e.g. a runner's plan contains reactive work; team sports have
  category coverage).
- **RLS harness** (supabase/tests): 46 privacy proofs against a real database.

Gaps (from Phases 1–5): the engine owns no tests (inverted ownership); no
per-test timeout; apps/web has zero tests; no UI/interaction tests; validators
cover 5/16 of the EDS catalogue; knowledge validation only runs inside the
full suite; no AI eval harness (the recorded go-live gate); no sports-science
outcome validation beyond the quality gates.

## Strategy: eight layers

The organizing principle — **every layer tests a different way of being wrong**,
and each review phase's worst finding becomes a test class so it can't recur.

### 1. Unit (engine-owned)
Move engine-scoped tests to `packages/engine/tests/` (TD-03), run by
`npm test -w @performance-os/engine` and by the root gate. Unit tests target
pure functions at D-boundaries (diagnose, prioritise, selectInterventions,
doseForQuality, deriveSeason). Rule: **a new D-module lands with its unit
tests in the engine package**, not the app suite.

### 2. Golden datasets (regression)
Keep the golden master as-is — it's the crown jewel. Two additions:
- **Automated diff classification** on re-baseline (SR4): classify each key's
  change as provenance-only / additive / behavioural, so a 50-archetype future
  doesn't need eyeball audits. Fail if "behavioural" appears outside the
  declared cohorts.
- **Archetype coverage rule**: every selectable sport × season phase and every
  discipline × experience level has at least one archetype. (Season-window and
  injury-active archetypes are the current blind spots.)

### 3. Decision-engine validation (the D14 catalogue)
Build out the EDS §35 validators from 5 → 16, prioritized by which review
finding each would have caught:
- sport-protection (Tier 2 — currently NO validator),
- MEV-floor / junk-volume (under-dosing ships silently today),
- deload-presence, progression-sanity (would catch flat week-8 loads, W4),
- dose-coherence per discipline (**would have caught the Olympic 4×4 defect**),
- warm-up presence for RPE≥8 work.
Each validator lands with its knowledge entry (authority-capped per Art 13)
and a synthetic failing-week test.

### 4. Sports-science validation (new layer)
Property tests that encode coaching truths independent of any archetype:
- every plan's weekly volume within MEV–MRV per muscle (both bounds);
- intensity distribution sane per discipline (no 4×4 snatches — pin the fix);
- plyo foot contacts within age bands; 48–72h spacing holds post-reflow;
- season arc properties (off-season more balanced than in-season, taper cuts
  volume not intensity);
- injured-athlete properties: never a blocked exercise, never an empty
  session, rehab present when content exists.
These run over *generated* plans across a profile sweep (the /dev probe
pattern, systematized). This is the layer a Head of Performance would audit.

### 5. Knowledge validation
One standalone gate: `npm run validate:knowledge` — SKB schema + completeness
+ privacy sweep + governed-entry shape + (new) catalogue/dose/prior validators
under the universal shape (K3), + citation-format check when provenance
becomes structured. Runs in CI independently of behaviour tests so a knowledge
author gets fast feedback.

### 6. Integration (app runtime)
The store→SyncService→Supabase path: outbox drain ordering, migration
remapping, cache isolation, freeze-on-start pinning, reflow memo keys. Mostly
covered today inside app tests — keep, plus add the two known multi-device
cases (concurrent profile edit LWW; offline reconnect clobber) as *documented
known-failure* tests until F4 is fixed (a failing-by-design test with a
pointer is honest debt tracking).
RLS harness: keep growing one case per policy change (the roster-removal
orphan fix adds its case — task filed).

### 7. AI validation (pre-go-live gate)
Per AIGAS §20 and the Phase 4 review — blocking, not optional:
- **C2 eval harness**: golden artefact set; assert grounding (no invented
  numbers), honesty-marker survival (deload stays a deload), register, length;
  run against the real prompt version on every prompt change.
- **D11 proposal harness** (before Seam 1 gets a caller): proposal quality vs
  deterministic baseline, disposal statistics, cost per proposal.
- The existing ai-seam purity greps stay as the structural floor.

### 8. Architecture validation (the ratchets)
Extend the ratchet family: barrel-export ratchet (TD-07, freeze then shrink
the ~70-symbol surface), knowledge-entry-shape ratchet (new modules must
conform), CI single-source (test job reused via workflow_call, TD-10).
Add per-test timeout to run-all (TD-11) now; parallelize when suite >60s.

## Web + UI (deliberately thin)

apps/web: typecheck+build exists; add one Playwright smoke (login gate,
dashboard renders derived fields only — a *privacy* assertion in the UI) when
the Team package resumes. Mobile UI: rely on the engine/property layers for
coaching correctness; add interaction tests only for the flows with real state
machines (SessionRunner, onboarding wizard) — not blanket component coverage.
Rationale: the deterministic engine means UI tests carry unusually little of
the correctness burden here; don't buy maintenance cost where the engine
already proves the substance.

## Operating rules (proposed for CLAUDE.md if adopted)

1. A bug fix lands with the test that would have caught it, in the *layer*
   that should have caught it.
2. Behaviour changes re-baseline only their declared cohorts; the diff
   classifier enforces it.
3. Knowledge changes bump KSV and pass `validate:knowledge` standalone.
4. New validators are authority-capped and land with a synthetic violation.
5. Nothing AI-facing goes live without its eval harness run recorded.
