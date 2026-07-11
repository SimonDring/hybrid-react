# Coaching Quality Assessment — does the engine behave like an elite coach?

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 3 of 10 · main @ 02f6184.**
Standard: the primary evaluation question of this sprint — *volume-driven training
generator, or elite coach making performance-driven decisions?* — answered per decision
area, quantified, with the decisive evidence. Phases 2 and 6 of the sprint brief.

---

## 1. The quantified answer

**The engine is a coach for roughly the top half of its decision chain and a generator
for the bottom half — and which half dominates depends on who the athlete is.**

Scoring each area 0–10 (10 = an elite coach would sign it as their own reasoning;
5 = defensible but generic; 0 = template/volume filling):

| Decision area | D11 cohorts | Legacy cohorts | Evidence anchor |
|---|---|---|---|
| Understanding the athlete (D1) | 3 | 3 | 1/10 qualities measured; assessment fields unread |
| Understanding the demand (D2/D3) | 6 | 2 | SKB demand real but truncated (11 dropped qualities); legacy GAA = neutral emphasis |
| Diagnosis (D4/D5) | 5 | 0 (skipped) | Real gap ranking, honest rationale; runs on priors; k=1 |
| Macro strategy (D6/D7/D8) | 4 | 3 | No strategy object; season-phased templates + gated steer; week = modulo rotation |
| Session objective (D9) | 7 | 2 | Named purpose, competency/constraint re-targeting, honest label on legacy |
| Exercise selection (D11) | 7 | 2 | Tier-0 competition-lift anchoring, transfer-per-fatigue, stopping rule vs deficit pay-down |
| Dose (D12) | 6 | 4 | Quality-keyed, evidence-tagged, olympic fix verified; categorical (no measured input); iso fixed 3×12 |
| Scheduling (D13) | 8 | 8 | Sport-proximity/axial/plyo spacing, governed weights — the most coach-like layer |
| Progression | **2** | **2** | Flat intra-phase loads; autoregulation only for loggers on 5 lifts; no ramps |
| Daily adaptation (D15) | 7 | 6 | Corroborated deloads, freeze-on-start, visible annotations; single-day readiness gating |
| Safety/injury | 5 | 5 | Red-flag triage + 3-layer runtime blocking vs empty-rehab holes + sev-4 stranding |
| Learning | **1** | **1** | Staged, never read; no outcomes layer |

**Weighted verdict: a disciplined, evidence-literate coach's *decision structure*,
operated with a junior coach's *information*, a spreadsheet's *progression*, and a
compliance department that files reports nobody reads.** The 2026-07-09 review's
"junior S&C coach working from an intake form" grade stands; this audit adds that the
distance to "elite" is concentrated in four specific behaviours (below), not spread
evenly.

## 2. Where it genuinely behaves like a coach (with the strongest single evidence)

1. **It anchors the competition lift first and stops when the objective is served.**
   Tier-0 elevation of discipline priority lifts in authored order — beating their own
   lower-fatigue variants (selectInterventions.js:115-131) — followed by the
   fatigue-budget break "bank the rest (L5)" (:143). That pair is real coaching
   economics: specificity first, sufficiency over volume.
2. **It protects the week, not just the session.** Scheduling penalises same-muscle
   adjacency, stacked CNS days, back-to-back heavy spine days, plyo without 48–72 h,
   and gym work near sport days *scaled by how much the session loads the sport's
   muscles* (scheduler.js:58-108) — then a de-spine pass swaps the day-after loading.
3. **It refuses to let contested science coach.** ACWR cannot force a deload alone
   because its knowledge entry is low-confidence — enforced mechanically
   (trainingLoad.js:153), not by comment. Deloads need corroboration (readiness AND
   session-recovery, or illness). Taper ≠ deload end-to-end.
4. **It keeps its word once the athlete commits.** Freeze-on-start via epoch guards and
   Start-time snapshots; reflow touches pending work only; neutral days keep the
   baseline verbatim (WP-55). This is Art 10 as lived behaviour.
5. **It is honest about its runtime adjustments.** Rule trims carry the fired rule ids;
   missed volume is either caught up (MRV-rate-capped) or *visibly forgiven*; eased
   intensity is labelled. Very few human coaches document their in-week changes this well.

## 3. Where it behaves like a generator (the four elite-coach gaps)

1. **It prescribes without measuring.** Only maxStrength is ever measured; the other
   nine qualities are training-age priors — so the diagnosis, the thing the whole
   architecture pivots on, is an educated stereotype. The schema and SKB both already
   carry assessment structures (ROM screens, jump tests, `1rm_pull`, per-sport test
   batteries) that no decision reads. An elite coach's first act is assessment; this
   engine's first act is a lookup.
2. **It periodises but does not progress.** The plan *looks* progressive — volume ramps
   weekly, schemes change per phase — but a non-logging athlete's within-phase loads are
   bit-identical, the e1RM never moves without a log entry, accessories never
   double-progress, selection is identical every week of a phase, and peak-week
   near-maximal triples ship with zero warm-up ramp. Progressive overload — the most
   basic promise of coaching — currently exists only for logging athletes on five lifts.
3. **Its safety layer observes more than it enforces.** The validators that exist emit
   verdicts that nothing consumes; the empty-rehab hole ships sessions with no items in
   5–9 of 14 regions; a severity-4 athlete cannot leave protect-blocks because severity
   is uneditable. An elite programme's safety net is the part that *must* be
   deterministic and load-bearing; here it is the most decorative part.
4. **It never finds out whether it was right.** Falsifiable block verdicts are computed
   and staged, then discarded unread; there is no outcomes/history layer; priors that
   would individualise dosing exist as read-seams fed only by population defaults. The
   coaching loop (observe → … → learn) is severed at its last arc.

## 4. Cohort honesty (who is coached, who is generated for)

- **Coached (D11 path)**: all build-goal athletes (powerlifting/hypertrophy/olympic
  disciplines), diagnosed runners/cyclists, and the six category-led team/pool sports.
- **Generated for (legacy fill)**: every triathlete; runners/cyclists whose diagnosis
  finds no gap (experienced athletes — exactly the ones who'd notice); legacy GAA
  profiles without a sport code (programmed as neutral bodybuilders).
- **Not served, honestly**: sports outside the 11 (not selectable — a fair scope gate);
  endurance session programming (declared out of scope, Art 15-compliant deferral).

## 5. Explainability as a coaching behaviour (Phase 8 summary)

The engine can explain *why this session* (shipped, rendered) and *what it changed and
why* (reflow annotations). It cannot explain *why this exercise* (reasoning computed
then discarded at `place()`), *why this volume*, *why this dose*, *why this schedule*,
or *how sure it is* (confidence reaches the athlete in exactly one recovery-detail
note). The two richest artefacts it produces — the diagnosis meta and the validation
report — never reach a screen. Full inventory: deliverable 05 §4 and the audit notes.

An elite coach explains at the moment of prescription. This engine mostly explains at
the moment of *adjustment*. The asymmetry is the trust gap.

## 6. Could an elite coach sign each decision? (the Phase-2 question, decision by decision)

| Decision | Signable? | What the coach would say |
|---|---|---|
| Demand profiles (SKB/discipline) | Mostly | "Good vectors — where did my prop's neck and collision demand go?" |
| Diagnosis | Structurally | "Right method, but you haven't tested the athlete. And why is demand squared?" |
| One priority per block (k=1) | Reluctantly | "Focus is right, but k=1 because your confidence plumbing collapses, not because you chose focus." |
| Session objectives + selection | Yes (D11) | "Tier order, budget stop, competition lift first — fine work." |
| Dose tables | Yes, with notes | "Evidence-tagged schemes, good. Iso is 3×12 for everyone. Sprinters' power cleans still flat 4×4." |
| Scheduling | Yes | The strongest signature in the codebase. |
| Progression | **No** | "Week 8 must not equal week 5 for a healthy trainee who didn't log. Non-negotiable." |
| Validation | **No** | "You wrote a 5-check inspection that can't stop the line, and you don't read its reports." |
| Learning | **No** | "You built the notebook and never opened it." |

## 7. Bottom line

The question this sprint asks — generator or coach — has a precise answer: **the
decision architecture is a coach; the operating data and the closing loops are still a
generator's.** The rebuild effort should therefore not be a rebuild at all in the
architectural sense: the hierarchy is in place and verified. It should be an
*operational completion* — measure the athlete, progress the load, let validation
dispose, promote the priors — plus the retirement of the one genuinely inverted path
(the legacy fill). Deliverables 08–10 sequence exactly that.
