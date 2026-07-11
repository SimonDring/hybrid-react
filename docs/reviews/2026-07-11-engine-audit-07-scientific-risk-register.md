# Scientific Risk Register — sports science and coaching risks

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 7 of 10 · main @ 02f6184.**
Risks to the *coaching correctness* of what ships — distinct from the technical
register (deliverable 06). Numbering SR-nn (this register supersedes the science-risk
list in the 2026-07-09 engine review where they overlap). Rated by athlete impact.

---

## Critical — the plan is wrong for identifiable athletes

**SR-01 · No progressive overload for non-logging athletes.** Within a phase, loads are
bit-identical (a static e1RM re-percentaged only at phase boundaries); accessories
never progress; selection repeats weekly. A healthy intermediate who trains
consistently but doesn't log receives, in substance, the same stimulus for 3–4 weeks
at a time — under-dosing the adaptation the plan's own periodisation promises
(Art 7's "progressed" clause). *Population affected: every athlete who doesn't log
lifts — plausibly the majority.*

**SR-02 · Diagnosis without measurement.** Nine of ten capability estimates are
training-age priors; priorities collapse to k=1; the demand term is effectively
squared in the gap math (an undocumented weighting choice that systematically favours
high-importance qualities over large deficits). The prescription chain downstream is
coherent — which makes a mis-diagnosis *more* convincing, not less. *Affected: all.*

**SR-03 · Injury edge cases ship unsafe-shaped output.** Empty rehab sessions (5/14
regions; 9/14 at severity ≥4), hollow sessions with a false "replaced with rehab"
banner, severity-4 stranding (no severity edit; phase stepper cosmetic against sev-4
pins), and no time/criteria-based return-to-play progression. Red-flag triage upstream
is genuinely good — the risk concentrates *after* triage. *Affected: injured athletes
in the bare regions — the moments of highest duty of care.*

**SR-04 · Single-observation autoregulation at full authority.** One un-baselined bad
wellness entry cuts volume 22% and RPE −1; no trend smoothing; no recency gate (a
days-old row keeps trimming); readiness confidence is computed but gates nothing —
contradicting the platform's own cited standard (Saw 2016 supports monitoring against
baseline/trend, not one-day gating). The inverse risk also holds: a stale *good* row
masks a bad week. *Affected: new users' first weeks; anyone with patchy check-ins.*

## High — systematic bias or unvalidated authority

**SR-05 · Sport-defining demand is truncated before diagnosis.** 11 authored SKB
qualities dropped (rugby neck/collision/strength-endurance, hurling grip/rotation,
sprint acceleration, swimmer coordination) — the diagnosis literally cannot see what
makes several sports dangerous or winnable. Includes one outright mapping bug
(strengthEndurance). *Affected: team/contact-sport athletes most.*

**SR-06 · The legacy volume path programs endurance multisport athletes as
bodybuilders.** Triathletes (all), zero-gap runners/cyclists, code-less GAA rows get
deficit-fill hypertrophy-style programming with in-season handling reduced to a volume
scalar. *Affected: exactly the cohorts with the highest interference sensitivity.*

**SR-07 · Seed coefficients steer at full authority.** Transfer ratings, fatigue units
and budgets ("no literature anchor", confidence low), demand weights, selection
multipliers — honest about their provenance, yet consumed with the same force as
validated knowledge. Art 13's tiers exist but most of these tables bypass them (they
are data files, not KB entries). *Mitigant: the numbers are at least centralised and
flagged needsReview.*

**SR-08 · No athlete-signal confidence discipline (the ACWR lesson, un-generalised).**
Knowledge-side demotion is exemplary (ACWR floored + corroboration-gated); the same
discipline is absent for the athlete's own data — readiness, wellness, session
recovery all act unweighted by their reliability. The platform's most insidious
historical disease (over-trusted signals becoming hidden rules) has been cured in one
of its two habitats.

**SR-09 · No age or sex physiology.** Chronological age modulates one readiness
sub-weight; sex is a rep bump + standards bands; MEV/MAV/MRV and dose schemes are
"general trainee" invariants. A 62-year-old masters swimmer receives a 25-year-old's
ramp, ceiling, and recovery assumptions. *Affected: masters and female athletes —
stated future audiences.*

**SR-10 · Near-maximal work ships without ramps.** Peak-week triples at RPE 8–9 with
activation-only primers and no programmed ascent to working weight — an injury-risk
and performance-quality gap no reviewing coach would pass. *(W8 confirmed standing.)*

## Medium

**SR-11 · Deload cut-points and fatigue budgets honest-but-unvalidated.** The *shape*
is right (corroboration-gated, governed, low-confidence-tagged); the *numbers* are
unproven and no outcome data loop exists to validate them (blocked by the missing
history layer — TR-03).

**SR-12 · Recoverability is population MRV, not the athlete.** No gym+sport+life
ceiling; volumeTolerance learning staged-never-live; the engine can neither see an
athlete's true tolerance nor learn it. Conservative defaults limit the harm; the cost
is chronic under/over-shooting at the individual margins.

**SR-13 · Interference modelled as muscles, not systems.** Sport-proximity penalties
key on shared muscle load; a heavy-neural gym day before sprint work is invisible if
the muscles differ; no tendon/CNS interference model. Plyo spacing is the honourable
exception.

**SR-14 · Iso/core dosing is context-blind** (fixed 3×12 regardless of session quality
or season) and sprinters' power cleans keep a flat 4×4 (documented deferral).

**SR-15 · Advertised-but-dead coaching behaviours mislead athletes.** Stretch-bias
claimed in user-facing rationale while dead in code; muscle-target ledgers shown to
cohorts whose plans ignored them; `_catchUp` claims set recovery quality paths never
performed. Individually cosmetic; jointly they erode the honesty that is the product.

**SR-16 · Provenance mis-tags persist** (nordic-hamstring evidence cited for
calf/tibialis prevention entries; unparseable free-text sources) — the "never
fabricated" rule is policy, not check. Blocks confident science review at scale.

## Standing scientific strengths (verified — do not regress)

Subjective ≥ objective readiness weighting (Saw-anchored) · ACWR demotion by mechanism
· corroboration-gated deloads · taper ≠ deload · plyo contact ceilings + 48–72 h
spacing · axial-load three-point system · competency gating of ballistic/olympic work
· red-flag medical triage ordering · evidence-tagged dose schemes with the olympic
classic-lift fix verified in tests.

## The two scientific verdicts that matter

1. **Nothing ships that is dangerous by intent** — the engine's biases run
   conservative, and its worst safety edges are omissions (empty rehab, no ramps), not
   reckless prescriptions.
2. **Almost nothing ships that is *validated*** — the platform currently has no
   mechanism to discover whether its plans work (no outcomes layer, no promoted priors,
   no assessment loop). Until that loop closes, every scheme, budget, and cut-point is
   a hypothesis the platform is structurally unable to test — the deepest scientific
   risk on this register.
