# Bodybuilding Bias Report — volume-first and hypertrophy-first remnants

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 4 of 10 · main @ 02f6184.**
Standard: Constitution Art 5 (qualities, not muscles) and Art 6 (adaptation before
dose; volume is a guardrail). Classification: **DRIVER** = volume/muscle math decides
content (violation outside the hypertrophy discipline) · **LEDGER** = volume validates
(constitutional) · **COSMETIC** = naming/display only.

---

## 1. Executive shape

The bias no longer lives where the origin story suggests. On the D11 path — all build
disciplines and eight of eleven sports — muscle volume has genuinely been demoted to a
ledger (MRV gate + the EDS-sanctioned tier-5 MEV floor; verified as selection's only
volume inputs). The residual bias lives in **four structural places**: (1) a legacy
deficit-pay-down fill still serving real cohorts, (2) the *volume-target machinery that
frames even the constitutional path* (style/emphasis-driven, never diagnosis-shaped),
(3) a **muscle-vocabulary monopoly** in how sport demand and weekly structure are
expressed, and (4) **cohort routing** that quietly widens the bodybuilding population.

## 2. Findings (consolidated, ranked)

| # | Finding | Where | Class | Severity |
|---|---|---|---|---|
| B1 | **Legacy deficit fill drives real cohorts**: per-muscle RP targets computed first (MEV→MAV ramp × style × emphasis), then greedy "pays down the biggest remaining deficits per set". Serves every triathlete, zero-gap run/cycle athletes, code-less legacy GAA rows (programmed to a *neutral bodybuilder-balanced* ramp). | allocator.js:16-26, 437-542, 969-1041; targets.js:55-99 | DRIVER | **HIGH** |
| B2 | **Weekly volume targets are never diagnosis-shaped.** `weeklyMuscleTargets` runs before any session decision on every path; targets derive from style/level/emphasis — D5 priorities shape session *quality targets* but never the volume frame. Targets leak forward via the hypertrophy-iso gate and the reflow catch-up. | strength.js:63-68; targets.js; allocator.js:1095; rollingVolume.js | DRIVER-frame | **HIGH** |
| B3 | **The fixed-10 quality projection silently discards sport-defining demand** — 11 authored quality names (not 8 as previously recorded): the 8 documented drops + rugby's aerialAbility, collisionRobustness, and **strengthEndurance (a PM quality with no identity mapping — likely a bug)**. A prop's neck (importance 8) and collision demand can never be diagnosed; no `droppedDemands` is emitted. | sportQualityMap.js:4-19; demandProfile.js:17 | DRIVER-by-omission | **HIGH** |
| B4 | **Cohort routing widens the bodybuilding population**: functional-fitness → hypertrophy discipline; "get stronger" without a barbell → hypertrophy; unknown → hypertrophy. The functional athlete gets PPL splits, 6–15-rep dosing, and a direct-isolation pass, differentiated only by a factor-0 conditioning tail. (Deliberate call 2026-07-07 — recorded here as a standing bias, not a defect.) | disciplines/index.js:21-28 | DRIVER (routing) | MED-HIGH |
| B5 | **Sport gym demand exists only as per-muscle emphasis multipliers** — every SKB `seasonalModel.programming` block is a `muscleEmphasis` vector; `movementPolicy` (the movement-language alternative) is schema-validated, **authored in zero sport JSONs, consumed nowhere**. For legacy cohorts the multipliers are the whole sport model; for D11 cohorts they steer only the (largely inert) split and round-out. | SKB *.json; schema.js:330-339; targets.js:96 | DRIVER (legacy) / gap | MED |
| B6 | **The runtime's only missed-work concept is per-muscle set debt** — and `_catchUp` stamps "N sets recovered" even on D11 slots whose re-allocation never consumed the muscle deficit (selectInterventions doesn't read targets). Honesty defect on the quality path. | reflow.js:224-250, 350-354 | DRIVER (legacy) + dishonest annotation | MED |
| B7 | **"Lengthened-position bias" is advertised and dead.** stretchMult requires the retired style vocabulary; the D11 branch hard-codes goalPrimary null; hypertrophy.js still lists the pattern and the user-facing objective text still claims stretch-loaded work. A claimed coaching feature not delivered (Art 14/15). | allocator.js:133-138, 642, 827, 1202; hypertrophy.js:68 | COSMETIC / honesty | MED |
| B8 | **Splits are bodybuilding templates chosen by day count** (full-body/UL/PPL); powerlifting spaces its lifts through a body-part template; sport splits allocate day counts from muscle-emphasis means (inert on the D11 branch, load-bearing on legacy). Olympic is the clean exception (lift-family days). | split.js:47-164 | DRIVER (legacy sport) / COSMETIC elsewhere | MED |
| B9 | **No age modulation anywhere** — landmarks and dose are "general trainee" for a 25- and a 62-year-old alike; the only age term in the codebase is one readiness sub-index weight. | targets.js; diagnose.js (absent term) | LEDGER-quality | MED |
| B10 | Iso/core dose is a fixed 3×12 on every path regardless of session quality; the bodybuilding 12–15 branch is dead code (see also the style-fallthrough defect, deliverable 01 §7). | allocator.js:287-293 | DRIVER-lite | LOW-MED |
| B11 | Coarse 10-muscle model under the ledger ("back" = lats+traps+rhomboids; front delts absent) — MRV verdicts can hide specific under/over-stimulation. | muscleVolume.js:22-38 | LEDGER-quality | LOW-MED |
| B12 | The Home screen shows every cohort a per-muscle target ledger as "the ideal" — including D11 athletes whose plans ignored it. | PlanService.js:565-594 | COSMETIC-dishonest | LOW-MED |
| B13 | Muscle-first derivations and proxies: round-out from `emphasis < 0.9` → muscle→pattern lookup; sport interference as keyMuscles proximity (no CNS/tendon interference model); per-slot frequency caps in muscle sets. | roundOutTargets.js:25-27; constraints.js:24-27; allocator.js:683-690 | vocabulary leakage | LOW |
| B14 | Dead bodybuilding scaffolding kept live-looking (ISO_SETS.bodybuilding, style bridge, qualityMult, stale "swim keeps the legacy fill" comment). | allocator.js:112-158, 809-813 | COSMETIC (rot) | LOW |

**Constitutional (for balance):** the MRV ceiling + soft MRV validator + volume counting
are exactly the ledger the Constitution prescribes; D11 selection reasons wholly in
qualities/tiers/fatigue; dose-by-quality is real; bodybuilding programming *for the
hypertrophy discipline* is in-character and documented, not a bias.

## 3. Where a sports-performance coach decides differently (concrete cases)

- **Rugby prop**: neck and collision demand authored in the SKB, dropped at the
  projection; no catalogue pattern could serve them anyway. The prop's plan cannot
  contain the two things that keep them safe in a scrum.
- **Triathlete**: full SKB profile, computed diagnosis — then planned by the deficit
  fill; the diagnosis is (correctly) hidden rather than wired in. The 07-08 fix landed
  as another emphasis vector feeding the volume engine.
- **Experienced club cyclist (zero-gap diagnosis)**: silently drops from the quality
  path to bodybuilder-style deficit filling — the build goals were patched against this
  exact hole (canonical-quality fallback seed); sports were not.
- **Masters swimmer**: category-led weeks (good), but identical ramp/ceiling/dose to a
  25-year-old.
- **Functional athlete**: gets a physique programme with a conditioning garnish rather
  than a mixed-quality GPP build (strength + power + carries + capacity).

## 4. The honest overall reading

The 2026-07-07 build flip did what it claimed: adaptation-first is real for every
commercially significant cohort, and volume is demonstrably a ledger on that path.
What remains is not a "hypertrophy engine wearing a coach's jacket" — it is a coach
whose **accounting department still writes the budget in muscles** (targets frame,
emphasis vectors, split vocabulary), whose **legacy branch still runs the old firm's
methods for three real customer groups**, and whose **marketing occasionally claims
services the shop no longer performs** (stretch-bias, "replaced with rehab", muscle
ledgers shown to quality-path athletes).

## 5. Highest-leverage de-biasing moves (feeds deliverable 09)

1. Retire the legacy fill for its three real cohorts: route triathlon through a
   category plan or D11; seed a fallback quality on empty sport diagnoses (the build
   fix, applied to sports); backfill/derive `sport_code` for legacy GAA rows.
2. Absorb the dropped SKB qualities (incl. fixing the strengthEndurance mapping hole)
   and emit `droppedDemands` — the projection stops truncating the platform's own moat.
3. Make volume targets diagnosis-aware, or explicitly demote them to a pure ledger on
   D11 paths (and stop rendering them as "the ideal" for those cohorts).
4. Decide functional's identity: a real GPP discipline module or an honest label.
5. Delete or implement each advertised-but-dead behaviour (stretch-bias, `_catchUp` on
   quality paths, bodybuilding iso branch).
