# Technical Risk Register — decision engine and its platform

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 6 of 10 · main @ 02f6184.**
Architectural and implementation risks, consolidated across the six audit passes.
Numbering TR-nn; overlaps with the 2026-07-09 registers (TD-nn, AR-nn, F-nn) are
cross-referenced rather than renumbered away. Likelihood × impact rated L/M/H.

---

## Critical (act before the next feature wave)

**TR-01 · Post-flip style-id fallthrough — silent behaviour regression (NEW).**
Build styles are now `powerlifting`/`hypertrophy`/`olympic`, but `STYLE_TOP`,
`STYLE_SCHEME_BRIDGE`, and the allocator's whitelist know only the legacy names —
all three disciplines silently take the *functional* volume band (hypertrophy loses its
1.4 overreach band, powerlifting its 0.6 band and the 3-primary cap; qualityTag and
fallback rest paths drift too). Dose is protected by the discipline pin; **volume
character is not** — and the change was re-baselined into the goldens unnoticed, which
is precisely the failure mode golden-master auditing exists to catch.
`targets.js:56 · allocator.js:642 · doseSchemes.js:113-119`. Likelihood H (it already
happened) × Impact M-H.

**TR-02 · D14 cannot dispose, and its report is invisible (I5/AR-family, worsened).**
5 of 16 validators; report-only at both boundaries; **zero UI consumers** of
`meta.validation`/`_validation`; the only disposing consumer is the dormant AI seam.
Every non-injury guarantee has exactly one enforcing layer — the constructor itself —
so a constructor bug ships silently. This is simultaneously the AI safety harness, the
future coach-override gate, and the natural home of youth/masters gates.
`contract.js:45-51 · PlanGenerator.js:263-275 · PlanService.js:283-297`. H × H.

**TR-03 · The learning/history substrate does not exist (F1/F2/F6 confirmed).**
All athlete history is latest-only JSONB inside `users.profile` (256 KB cap, whole-blob
pushed); `stagedPriors` overwritten per block; no `block_outcomes` table; sync is ten
unbounded `select('*')` pulls into localStorage with alert-and-swallow overflow. This
single gap caps D16, team trends, coach evidence, and the AI's track record at once —
and the sync/storage half is the first production scaling wall. H × H.

**TR-04 · Empty/hollow injury sessions are invisible to their own safety net (NEW).**
The rehab replacement stamps `discipline:'rehab'`, and every validator filters to gym
sessions — the "shipped empty" veto can never see the exact case it was written for.
Severity-2–3 hollowing shows a banner claiming rehab replacement that is false for the
five bare regions, and hidden struck items still count in the volume ledger (phantom
volume in MRV checks and progress bars). `injuryFilter.js:47 · validators.js:24 ·
volume.js:81-93`. M × H (safety + honesty).

## High

**TR-05 · Production runs code paths the goldens never exercise (NEW).**
The D7 steer arms for every real onboarded sport user (schema-default
`recoveryRate {value:1}` is non-null on dual-written models) while golden archetypes,
having no athlete_model, exercise the template path. The steered split/deload logic is
live in production and untested by the suite. `PlanGenerator.js:206 ·
athlete/schema.js:41-44`. M × H.

**TR-06 · Plan-memo staleness (NEW).** `profileSignature` omits `sport_code`,
`first_game_date`, `last_game_date`, and `athlete_model` — edits to the season window,
GAA code fixes, or model syncs never regenerate the cached plan until an unrelated
field changes. `PlanService.js:327-341`. M × M-H.

**TR-07 · allocator.js concentration (TD-01, grown).** 1,253 lines, +10 since the last
review; both fill engines, dose surgery, post-passes, and structuring in one file;
every construction defect in this audit lands there. The D11/D12/D13 boundaries the
EDS names are the natural split. H × M (velocity, defect coupling).

**TR-08 · Two fill engines indefinitely (W5, cohorts corrected).** The least-tested
path serves triathlon, zero-gap endurance athletes, and legacy GAA rows; drift between
the paths (season handling, objectives, dosing vocabulary) is already material.
M × M-H.

**TR-09 · Coach-override seam absent (Art 10 half-built).** No mechanism substitutes
any engine decision; `validateProposal` anticipates human proposers and nothing invokes
it; coach dashboard writes only schedule + join-code. Blocks the Team package's core
promise; when built it needs the audit/outcomes layer (TR-03). M × H (rises with Team).

**TR-10 · Injury blocking joins on name regexes (K2 open).** The safety-critical join
is still `item.name` regex; a novel exercise name ships to an injured athlete. The
id-level contraindication vocabulary remains unbuilt. M × H.

**TR-11 · Test-suite blind spots for a rebuild.** Engine has no suite of its own
(delegates to the app's); no cross-runtime determinism proof; no reflow≡baseline
property test (both historical divergences were caught after the fact); no
season-length simulation; RLS harness manual/non-CI with the 7 F3 cases authored but
unrun; apps/web untested. M × H (it's the net under every wave of deliverable 10).

## Medium

**TR-12 · Sport facts and coaching magnitudes in code (Art 17 residue).**
`D11_SPORTS`/`CATEGORY_LED`/`SSC_SPORTS` sets, ~30 allocator shape literals, duplicated
readiness weights (KB entry decorative), reflow effect magnitudes. Each small; jointly
they falsify the "adding X is data" story (a new sport needs a cohort-set edit).

**TR-13 · Readiness confidence export is wrong at the source.** `baselineMaturity`
hard-coded to 1 in the exported confidence — any future gate would gate on a wrong
number. Adjacent: no recency check on the driving daily-metrics row (a days-old bad
entry keeps trimming today). `recoveryIndex.js:32-33 · trainingStore.js:103`.

**TR-14 · Level-fallback drift between runtime and generator.** Reflow's gym context
defaults to `'beginner'` while program resolution defaults `'intermediate'` — a
no-experience profile reflows at a different level than its baseline.
`PlanService.js:93 · Utils.js:20`.

**TR-15 · Wearable layer is honest in model, dishonest in name, and interface-less.**
`fitbit-sync` calls Google Health; provider #3 means copying a sibling function pair +
a hand-rolled SyncService block; ingestion is synchronous client-invoked; zero
HealthKit substrate (F9/L4 standing).

**TR-16 · Dormant-seam rot (AR5 standing).** movementPolicy scaffold authored nowhere;
4 no-op decisionRule effects; dead bodybuilding scaffolding; stale headers/comments
(secondaryGoals "not yet read", "swim keeps the legacy fill"); unwired staleness
watchdog; `explain` API reserved-unshipped. Each is a future contributor trap.

**TR-17 · Team roll-up freshness + single-team assumptions.** player_status computed
client-side on the player's app-open; snapshot-only (no trend series, F5); coach board
assumes one team; full-table pulls per sign-in. Fine at pilot scale; walls at league
scale.

## Low

**TR-18 · The one clock read in the engine** (`kb.staleEntries` default arg, uncalled)
— purity holds by absence of a caller rather than by signature. Trivial fix.
**TR-19 · Coarse muscle model under the ledger** ("back" aggregates; front delts
absent) — bounds the MRV guarantee's resolution.
**TR-20 · UI shows internal ledgers to the wrong cohorts** (muscle-target progress for
D11 athletes, `_catchUp` claims) — honesty polish.

## Standing anti-risks (verified healthy — protect these)

Purity triple-enforcement (fixed-clock tests + boundary ratchet + ESLint overlay) ·
28-archetype golden master with audited re-baselines · privacy machine-enforcement at
three layers (build-failing SKB sweep, allowlisted roll-up, RLS proofs) ·
freeze-on-start epoch discipline · the schedule→constraints team seam (live, pure,
memo-safe) · knowledge authority capping (contested science cannot veto).
