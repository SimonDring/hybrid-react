# Constitutional Alignment Report

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 2 of 10 · main @ 02f6184.**
The 20 Articles (frozen Constitution v1.0) applied to the implementation as evidence
found it — Article by Article, then component by component. Scores are 0–10 where 10 =
the Article's principle holds in shipped code with machine enforcement, 5 = holds
structurally but not operationally, 0 = inverted. Evidence anchors are in deliverables
01/04/05 and the audit working notes; only the decisive anchor is repeated here.

---

## 1. Article-by-Article scorecard

| Art | Principle (short) | Current behaviour | Gap | Score | Severity |
|---|---|---|---|---|---|
| 1 | Athlete performance is the objective | D11 stopping rule banks time (selectInterventions.js:143); finishers factor-0 and bounded. Legacy fill spends the time budget by design (allocator.js:16-26). Progression — the mechanism that turns training into performance — is flat for non-loggers. | Legacy cohorts + progression gap | 6 | HIGH |
| 2 | Gym serves the sport | Real on D11: in-season fatigue-budget cut + "protect the sport" purpose, sport-proximity scheduling scaled by sport-muscle load, press demotion. Legacy in-season = a volume scalar only; tomorrow's sport *intensity* is not modelled; **no sport-compatibility validator** exists. | Enforcement is constructor-side only; legacy cohorts get volume math | 6 | HIGH |
| 3 | The goal belongs to the athlete | Goals resolve to demand profiles exactly like sports (goalDemand/disciplines/SKB). **But equipment silently rewrites the chosen goal**: powerlifting/olympic without a barbell → hypertrophy (disciplines/index.js:26), functional → hypertrophy — unstated to the athlete. | Silent goal demotion | 7 | MED-HIGH |
| 4 | Decisions are the atomic unit | The D-chain exists as named modules; D4/D5/D9 emit rationale objects. But there are **no typed decision contracts at runtime** (TAS §5.3 unbuilt), selection reasoning is discarded at `place()`, and no decision boundary accepts a substitute today except the dormant AI D11 contract. | Contracts exist on paper + one AI seam; not as the engine's fabric | 5 | HIGH |
| 5 | Diagnosis precedes prescription; qualities not muscles | Diagnosis-first chain live for all build + 8/11 sports. But: 1 of 10 qualities measured; k collapses to 1; 11 authored SKB qualities silently dropped (incl. rugby neckStrength imp. 8); volume targets remain style/emphasis-driven, never D5-shaped; split/emphasis vocabulary is muscles. | The pivot exists but runs on priors and a truncated vocabulary | 5 | **CRITICAL** |
| 6 | Adaptation before dose; volume a guardrail | Holds on the D11 path (MRV/MEV are gates only — verified). Inverted on the legacy fill (deficit pay-down IS selection) for triathletes, zero-gap run/cycle, code-less GAA. | Two engines; one constitutional, one inverted | 6 | HIGH |
| 7 | Minimum effective, **progressed**, never padded | Stopping rule + banked time real; padding bounded and factor-0. The "progressed" half fails: intra-phase loads flat, e1RM static without logging, no accessory double-progression, no warm-up ramps to near-maximal work. | Sufficiency yes; progression no | 4 | **CRITICAL** |
| 8 | Safety overrides optimisation | Competency gates, red-flag triage, 3-layer runtime injury blocking are real. But: empty/hollow rehab sessions ship in 5/14 regions (9/14 at sev ≥4) and are invisible to the validator (discipline:'rehab' filtered, validators.js:24); severity ≥4 strands (no severity edit; phase stepper cosmetic against sev-4 pins); D14 gate vetoes don't block. | Safety observes more than it enforces at the edges | 4 | **CRITICAL** |
| 9 | Recoverability is a ceiling | No modelled per-athlete gym+sport+life ceiling exists. Proxies: population MRV, per-session fatigue budgets ("no literature anchor"), 75-min cap. volumeTolerance prior is wired live but its only writer stages, never promotes. The EDS Recoverability validator is unbuilt. | The ceiling is a population guess, not a model | 3 | HIGH |
| 10 | Human is the final authority | Freeze-on-start is genuinely enforced (epoch guards + snapshot); athlete pins/overrides/week-revert respected. **No coach-override mechanism exists at any decision boundary** — validateProposal anticipates human proposers and nothing invokes it. | The athlete-protection half is built; the substitution half is not | 6 | MED (rises with Team) |
| 11 | Raw-data privacy inviolable | Machine-enforced at three layers: SKB privacy sweep fails the build; teamStatus 5-column allowlist; RLS with 46/46 proofs + server trigger clamps. One owed apply (F3 migration staged). | Apply the staged migration | **9** | LOW |
| 12 | Plans are hypotheses; response validates | Plans regenerate from state; block check-in exists; blockOutcome computes falsifiable verdicts. But verdicts land in stagedPriors that nothing reads, and there is no outcomes/history layer — **the hypothesis is never actually scored**. | The referee never sees the match | 4 | HIGH |
| 13 | Confidence governs authority | For knowledge: genuinely mechanical (ACWR floored + corroboration-gated because its entry is low-confidence; validator verdicts capped by evidence tier). For athlete data: decorative — readiness confidence computed, exported wrong (baselineMaturity hard-coded 1), read by nothing; one un-baselined bad morning cuts volume 22%/RPE −1; SKB per-rule confidence never read. | Art 13 applied to knowledge, not to the athlete's own signals | 6 | HIGH |
| 14 | Every recommendation explainable | Session-level "why" shipped and rendered; reflow annotations exemplary. Per-exercise/dose/schedule whys don't exist; meta.diagnosis and the D14 report are computed then dropped before any screen; evidence + confidence essentially never reach the athlete; `explain` is a reserved, unshipped API. | Explains the *adjustments* well, the *plan* thinly | 5 | HIGH |
| 15 | No silent truncation or debt | Forgiveness ledger, catch-up, rule trims all visibly annotated (genuinely good). Against: a 13-item silent list — SKB demand drops with no droppedDemands, MRV skips unrecorded, sport-day lightening flag unrendered, false "replaced with rehab" banner, phantom volume from hidden items, no-op SKB safety rules, unrendered D14 verdicts. | Honest at runtime, silent at construction | 4 | HIGH |
| 16 | Become personal; learn, don't assume | Prior seams alive as typed inputs from day one (exactly what the EDS demands); staging is corroborated, downward-only, falsifiable. But promotion never happens, history is latest-only, and the D7 steer silently arms off a *default* prior — an assumption wearing a learned coat. | Learning loop built to the water line; no water | 4 | HIGH |
| 17 | Knowledge separate from reasoning | ~65/35. Every content decision consults a registry by id; add-a-sport is data + one binding line; disciplines are data. Against: sport facts in code (SSC_SPORTS, D11_SPORTS, CATEGORY_LED), ~30 ungoverned structural literals, readiness weights duplicated in code, SKB ~70% dormant. | The WHAT is knowledge; the HOW-MUCH is code | 6 | MED-HIGH |
| 18 | Pure deterministic core | Verified clean: no clock/RNG/I-O on the plan path; triple enforcement (fixed-clock tests, boundary ratchet, ESLint purity overlay); byte-stable goldens. | The one uncalled `new Date()` default (kb.staleEntries) | **9** | LOW |
| 19 | Construction proposes, validation disposes | **Aspirational on the shipped path.** 5 of 16 validators; report-only at both boundaries; the report reaches no screen; the only disposing consumer is the dormant AI seam. Everything non-injury has exactly one enforcing layer (the constructor itself). | The Article's verb — "disposes" — does not happen | 3 | **CRITICAL** |
| 20 | Simplicity earns its place | Dormant seams mostly kept thin (correct); incremental delivery record strong. Rot accumulating: dead bodybuilding scaffolding, stale comments/headers, an allocator at 1,253 lines absorbing every construction concern. | Concentration + rot, not astronautics | 6 | MED |

**Aggregate: 5.4 / 10 — "structurally constitutional, operationally partial."**
The architecture *is* the Constitution's shape (the 2026-07-09 reviews were right about
that). The gaps are concentrated in four verbs the Constitution uses that the code does
not yet perform: **measure** (Art 5), **progress** (Art 7), **dispose** (Art 19),
**learn** (Art 12/16) — plus one cohort-scoped inversion (Art 6, legacy fill).

## 2. Component-level alignment (the Phase-3 checklist)

| Component | Constitutional expectation | Current behaviour | Gap / severity |
|---|---|---|---|
| Onboarding | Feed D1 with everything it collects | Collects assessment-grade fields (`movementCompetency`, `sessionDurationMin`, age, 1rm_pull, injuries) that no decision reads; injuries shape runtime only (by design) | Collected-but-unread data = broken Art 12 promise · MED |
| Profiling (D1) | Capability per quality with honest confidence | 1/10 measured; priors honest about source/confidence; recency decay real | The single deepest gap (feeds everything) · CRITICAL |
| Constraints | Computed before content, shape construction | Time/equipment/level/schedule: yes, constraints-first. Injuries: runtime-first + render backstop; pure baseline deliberately injury-blind. Equipment silently rewrites the goal (Art 3) | MED |
| Goal selection | Athlete's goal, never imposed | 11 sports + 4 build goals, demand-profile resolved; silent discipline demotion; functional = hypertrophy + a conditioning garnish | MED-HIGH |
| Adaptation selection (D4/D5) | Diagnose gaps, pick highest return | Real chain, wrong inputs (priors), k=1 collapse, truncated vocabulary, demand² weighting quirk | CRITICAL |
| Intervention planning (D10/D11) | Requirements before exercises; value-ordered minimum set | Real on D11 paths incl. tier-0 competition-lift anchoring; legacy = deficit fill | HIGH (cohort-scoped) |
| Session construction | One purpose, ordered, stop when served | D9 objective + ordering + stopping rule on D11; legacy honest `source:'style'` label | MED |
| Scheduling (D13) | Recovery/interference-aware | Strongest layer; governed penalty weights; despine backstop | LOW |
| Fatigue management | Budgeted, CNS/axial/plyo-aware | Governed budgets/units (honestly low-confidence) + ~30 ungoverned shape literals | MED |
| Progression | Anchored to demonstrated rate of progress | Volume ramp + phase re-percentage of a static e1RM; autoregulation only for loggers on 5 lifts | CRITICAL |
| Deload logic | Adaptive, corroborated, explained | Adaptive deloads corroboration-gated + explained; scheduled deloads template-cadenced, "Mandatory."; D7 recoverability cadence gated on a prior that is only ever a default | LOW-MED |
| Readiness | Confidence-weighted, trend-smoothed, subjective ≥ objective | Blend correct (Saw-anchored); single-day gating, no smoothing, no recency check, confidence decorative + miscomputed | HIGH |
| Recovery / recoverability | Learned ceiling spanning gym+sport+life | Not modelled; population proxies; learning staged-never-live | HIGH |
| Coach overrides | Substitution at decision boundaries, recorded, learned from | Does not exist; seam declared in ai/contracts only | HIGH (Team-blocking) |
| Wearable integration | Derived signals, personal baselines, never raw across persons | Clean model: personal 7-day baselines, device-class reliability, vendor scores excluded, coach allowlist | LOW |

## 3. The conflict order, tested against the code

The Constitution's tie-breaker (Safety > Sport > Recoverability > Intent > Objective >
Optimisation) is implemented **implicitly and partially**:

- Tier 1 vs 5: contraindications beat objective at runtime selection — yes; at baseline
  construction — no (injury-blind by design, backstopped later). Empty-rehab edge ships.
- Tier 2 vs 6: sport-day proximity outweighs balance in scheduler penalties — yes.
- Tier 3 vs 5: MRV trims selection in-loop — yes; but "recoverability" is population MRV.
- Tier 4: freeze-on-start honoured absolutely — yes, the cleanest tier.
- **The order itself exists nowhere as code.** D14 has no conflict-resolution pass; the
  tier ordering lives in scattered penalty weights and gate order. When two soft rules
  clash, the winner is whichever line runs later — undocumented.

## 4. Verdict

The Constitution has been implemented as an *architecture* and as a set of *habits*
(provenance, honesty annotations, purity discipline) — a real and unusual achievement.
It has **not yet been implemented as an enforcement regime**: the Articles that require
the engine to measure, progress, dispose, and learn are the four lowest scores, and
they are precisely the Articles that separate "a well-governed plan generator" from
"an elite coach expressed in software."
