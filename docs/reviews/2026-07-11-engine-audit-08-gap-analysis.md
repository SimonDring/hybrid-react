# Decision Engine Gap Analysis — current state → constitutional state

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 8 of 10 · main @ 02f6184.**
Format per the sprint brief: Current State → Desired State (frozen docs) → Gap →
Impact → Priority. Priorities align with deliverable 09's P0–P3 and deliverable 10's
waves. Gaps are ordered by the reasoning hierarchy, not by severity — severity is the
Priority column.

---

| # | Area | Current state | Desired state (Constitution/EDS) | Gap | Impact | Priority |
|---|---|---|---|---|---|---|
| G1 | Assessment (D1) | 1/10 qualities measured (maxStrength from lifts, recency-decayed); assessment fields collected and unread; SKB test batteries dormant | Capability per quality with honest confidence, measured where possible (EDS §29; Art 5/12) | The diagnosis pivot runs on priors | Every downstream decision inherits a guessed input; personalisation claims unearned | **P0** |
| G2 | Demand (D2/D3) | SKB demand real; 11 authored qualities dropped silently (1 mapping bug); position = 0.9 floor boost | Full demand fidelity + declared exclusions (Art 2/15; EDS §30) | Truncated vocabulary + silence | Sport-defining needs (neck, collision, grip, COD) undiagnosable | **P0** (bug + droppedDemands) / P1 (vocabulary) |
| G3 | Diagnosis (D4/D5) | Gap ranking real; demand² weighting; k collapses to 1; active pain and age absent | Ranked limiters with calibrated weighting; k=1–3 by genuine confidence (EDS D4/D5) | Formula quirks + confidence plumbing | Narrow, sometimes misordered priorities | P1 |
| G4 | Strategy (D6) | Absent — fragments hard-coded downstream | An explicit strategy object: concurrency model, develop/maintain map, sequencing (EDS D6) | Whole decision missing | Interference management is implicit; inexplicable; not substitutable | P2 |
| G5 | Periodisation (D7/D8) | Season-phased templates + a steer gated on a prior that is only ever a default (live in prod, untested by goldens); week = flags + modulo rotation | Block objectives from priorities + recoverability; fixture-aware microcycles (EDS D7/D8) | Template vs decision; test blind spot | Static blocks; hidden production divergence (TR-05) | P1 (test the steer) / P2 (real D8) |
| G6 | Selection (D11) | Two engines: constitutional tiered selection vs legacy deficit fill (triathlon, zero-gap endurance, code-less GAA) | One value-ordered selection for every cohort (Art 6; EDS §34) | The inverted path | Art 6 violated for real cohorts; drift between engines | **P0** (cohort fixes) / P1 (retire the fill) |
| G7 | Volume framing | Weekly muscle targets style/emphasis-driven on every path, never D5-shaped; leak into iso-pass + catch-up; rendered as "the ideal" to all cohorts | Volume computed as output, validated as ledger (Art 6; EDS P7) | The frame is still muscle-first even where selection isn't | Bias pressure + dishonest display | P1 |
| G8 | Dose (D12) | Quality-keyed, evidence-tagged tables; categorical only; iso fixed 3×12; sprint power cleans flat; style-id fallthrough broke discipline volume bands (TR-01) | Minimum effective dose per adaptation, athlete-scaled (EDS D12) | No athlete term; one regression | Under/over-shooting at margins; wrong bands for build cohorts today | **P0** (TR-01 fix) / P2 (athlete-scaled dose) |
| G9 | Progression | Volume ramp + phase re-percentage of static e1RM; autoregulation only for loggers on 5 lifts; no double-progression; no ramps; static selection within phase | "Sufficient, progressed, never padded" anchored to demonstrated progress (Art 7; EDS §34) | Overload absent for non-loggers | The most athlete-visible coaching failure (SR-01) | **P0** |
| G10 | Scheduling (D13) | Strongest layer: governed interference penalties, despine, sport proximity | As built (EDS D13 "already strong") | Sport *intensity* unmodelled; muscle-proxy interference | Minor | P3 |
| G11 | Validation (D14) | 5/16 validators; report-only both boundaries; report invisible; rehab sessions filtered out of their own check | Construction proposes, validation **disposes**; report feeds explanation (Art 19; EDS §35) | The disposal verb + 11 validators + visibility | No independent floor under anything; AI harness too weak to trust | **P0** (enforce injury veto + see-rehab fix) / P1 (build-out) |
| G12 | Runtime (D15) | Solid: horizon reflow, freeze-on-start, forgiveness, corroborated deloads | As built (EDS D15) + confidence/recency gating on inputs | Single-day readiness gating; no recency check; memo staleness (TR-06) | New-user whiplash; stale plans | P1 |
| G13 | Learning (D16) | Staged priors written, read by nothing; no outcomes/history layer; latest-only JSONB; D7 gate armed by a schema default | Three-tier priors updated from outcomes, consumed next pass (Art 12/16; EDS §25) | The loop's last arc severed | The engine can never become anyone's coach; every scheme unvalidatable (SR-11) | P1 (substrate M1) / gated promotion (Simon) |
| G14 | Safety/injury | Triage + 3-layer runtime blocking real; empty/hollow rehab (5–9/14 regions); sev-4 stranding; name-regex join | Constraints shape construction; no unsafe or empty prescription ever ships (Art 8; EDS §36) | Content holes + stranding + fragile join | Highest duty-of-care moments under-served (SR-03) | **P0** (fallback + visibility) / P1 (content 🔒, id-joins) |
| G15 | Readiness/recovery | Correct blend; single-day gating; confidence decorative + miscomputed; recoverability = population proxies; volumeTolerance staged-never-live | Confidence-weighted trend-smoothed readiness; learned recoverability ceiling (Art 9/13; EDS §33) | Athlete-data confidence discipline + the ceiling | SR-04/SR-12 | P1 |
| G16 | Explainability | Session why + reflow annotations rendered; per-exercise/dose/schedule whys discarded or absent; meta.diagnosis + D14 report unrendered; `explain` API reserved | Every recommendation explains what/why/evidence/how-sure (Art 14; EDS L11) | Explanation exists at adjustment, not prescription | Trust ceiling; debugging substrate incomplete | P1 (render what exists) / P2 (per-item rationale) |
| G17 | Honesty (Art 15) | Runtime honest (forgiveness etc.); 13-item silent list at construction (drops, skips, false banner, phantom volume, no-op rules) | Every trim/cap/drop recorded and surfaceable | The silent list | Compounding invisible debt | P1 |
| G18 | Overrides (Art 10) | Athlete-side freeze/pins complete; coach-side substitution absent; validateProposal uninvoked | Any decision replaceable at its boundary by human or AI, recorded, learned from | The seam's second half | Team package promise blocked (TR-09) | P2 (needs G13 substrate) |
| G19 | Knowledge governance | 33 governed entries + SKB validated; sibling tables bare; sport facts + ~30 literals in code; watchdog unwired; readiness weights duplicated | All knowledge on the governed surface; core consults registries only (Art 17) | The HOW-MUCH layer | Scientists can't review what steers plans | P2 |
| G20 | Athlete types | Age = one index weight; sex = 3 constants; developmentPriorities unconsumed; no para model | Modifiers as knowledge on priors/landmarks/dose (Art 16/17) | Whole modifier families | Masters/female audiences mis-served (SR-09) | P2 🔒 science |
| G21 | Platform substrate | Unbounded sync, silent storage overflow, 256 KB profile blob, snapshot-only team status | Bounded sync; append-only outcomes; trend series (TAS §11) | The data layer under G13/G18 | First production wall (TR-03) | P1 |
| G22 | Test net for the rebuild | 28-archetype goldens + purity triple-enforcement; no engine-own suite, no reflow-parity/simulation/cross-runtime tests; RLS manual | A net that catches each wave's defect class before it ships | Property + simulation layers | Rebuild risk multiplier (TR-11) | P1 (land with each wave) |

## Reading the table

Three structural conclusions fall out:

1. **The P0 set is small and surgical.** Six items (G1-measure-wiring excepted, which
   starts at P0 as honesty + estimator scaffolding): the TR-01 band regression, the
   legacy-fill cohort fixes, progression's minimum viable overload, injury
   fallback/visibility, injury-veto enforcement, and the mapping-bug/droppedDemands
   pair. None requires redesign; all are days-to-weeks. The Constitution's four failed
   verbs (measure, progress, dispose, learn) each have a P0 or P1 opening move.
2. **One substrate unlocks three ambitions.** G13/G18/G21 (learning, overrides, data
   layer) are one design problem — append-only outcomes + bounded sync + promotion
   policy — and it gates the Team package, the AI layer, and D16 alike.
3. **Nothing in the frozen docs needs amending to close these gaps.** Every desired
   state cites an existing Article/EDS section. The gap is execution depth, not vision
   — the audit found zero places where the code is right and the Constitution wrong.
