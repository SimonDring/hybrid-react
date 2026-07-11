# Knowledge Usage Report — how knowledge is actually consumed

**Status: REVIEW (dated) · Sprint 2 forensic audit, deliverable 5 of 10 · main @ 02f6184, KSV 1.30.0.**
Standard: KNOWLEDGE-ARCHITECTURE.md (8 kinds / 12 domains / universal entry shape) and
Constitution Art 13 (confidence governs authority) / Art 17 (knowledge separate from
reasoning). Builds on the 2026-07-09 knowledge review (K1–K3); every claim re-verified,
several corrected.

---

## 1. Verdict

**~65/35 knowledge-driven.** The WHAT layer is genuinely knowledge-driven: every
content decision consults a registry by id (exercises, qualities, dose schemes, volume
landmarks, disciplines, SKB profiles, injury taxonomy, 33 governed KB entries behind a
fail-fast accessor); adding a sport is a JSON file plus a binding line; the build
disciplines are data modules; Art 13 is a working *mechanism* for knowledge (authority
tiers → ACWR floored, verdicts capped). The HOW-MUCH layer is still rule-driven:
coaching magnitudes live as ~30 code literals, sport facts leak into engine logic
(`SSC_SPORTS`, `D11_SPORTS`, `CATEGORY_LED`), the readiness weights are duplicated in
code with the KB entry as decoration, and the SKB — the platform's deepest asset — is
roughly 70% dormant.

**Determinism of knowledge consumption: PASS.** No randomness anywhere; the single
clock read in the engine (`kb.staleEntries`' default arg) has no caller.

## 2. Consumption census (summary; full inventory in the audit working notes)

- **26 data modules; 24 live, 2 dormant** (`adaptations.js` — vocabulary anchor only;
  `movementPatternMap.js` partially — round-out only). `strengthExercises.js` is the
  most-consumed table (16 importers); `muscleVolume.js` feeds 10.
- **Governed KB**: 33 entries in `lib/knowledge/entries.js` under the universal shape,
  KSV-stamped into every plan. The `kb.staleEntries` staleness watchdog is authored
  and **unwired** — no review-queue consumer exists.
- **SKB**: 11 profiles × 21 sections (~29,000 lines). **Consumed: ~6 sections**
  (meta, physicalProfile→demand, positions, exerciseLibrary, seasonalModel.programming,
  decisionRules) plus the relocated `gymSupport`. **Dormant: 15 sections** including
  `assessments` (test batteries D1 never reads), `loadManagement` and `readinessModel`
  (per-sport overrides ignored in favour of global entries), `developmentPriorities`
  (youth→masters, consumed by nothing), `microcycles`, `injuryPreventionLibrary`,
  `kpiFramework` (privacy-validated only). 4 of 11 `decisionRules` effect types are
  validated no-ops (a sport's authored safety rule can fire and do nothing, silently).

## 3. Corrections to the 2026-07-09 record

1. **The projection drops 11 qualities, not 8.** Beyond the 8 documented drops, rugby
   loses `aerialAbility` (6), `collisionRobustness` (8), and `strengthEndurance` (7) —
   the last is a Performance-Model quality with **no identity entry in the map**:
   almost certainly an omission bug, absent even from the map's own UNMAPPED comment.
2. **"Season = volume-only" is stale.** Since the 2026-07-09 SKB wiring, season drives
   block-template selection, the volume scalar, per-phase muscle emphasis + round-out,
   exercise season-suitability, and window-mode phase detection from game dates.
3. **W9 is partially resolved**: session ceiling and pattern cap are now governed;
   the allocator's remaining ~30 shape literals are not.
4. `secondaryGoals.js`'s header still claims it is unconsumed; it ships in every plan
   (allocator.js:44, 1150-1161).

## 4. Entry-shape compliance (the K3 picture, updated)

| Compliance band | Modules |
|---|---|
| Full universal shape, versioned | `knowledge/entries.js` (33) · SKB per-item confidence/evidence/source |
| Machine-readable partial (evidence blocks / needsReview flags) | doseSchemes · exerciseQualities (all `needsReview:true`) · qualityMovementMap (all true) · disciplines (reviewed, Simon 2026-07-07) |
| Provenance in comments only | selectionScoring · schedulingPolicy · blockPriors · capabilityPriors · regionQualityRisk · strengthStandards · goalDemand · periodizationDefaults · qualities |
| **Bare coefficients at full authority** | PATTERN_CONTRIB fractional-set weights (the whole volume ledger) · exerciseSimilarity SIM matrix · exercise axial/CNS/level/stretch tags (zero provenance) · **injuryTaxonomy high_risk flags — these gate professional-referral triage with no citation** · sportLoad factors · season cutoffs 56/120d · reflowAdjust effect magnitudes · **femaleRepBump +2 — the engine's only sex modifier, ungoverned** |

Two structural drift risks: `readinessIndex.js` hard-codes a **local copy** of the KB
entry `index.readiness.weights` (the governed entry is documentation, not the operative
source); `LIGHT_STRENGTH_MAINS` is the only dose scheme with no evidence block.

## 5. Confidence: operative vs decorative (Art 13 in practice)

**Operative (verified mechanical):** the authority mapping itself (a governed entry);
ACWR floored to 0.85 solo effect + corroboration-required deloads *because* its entries
are low-confidence; D14 verdict capping (contested science cannot veto); D5's priority
count keyed to diagnosis confidence; measurement recency → capability confidence.

**Decorative (stored, never branched on):** readiness/recovery index confidence
(computed, exported with `baselineMaturity` hard-coded to 1, shown once as copy, read
by no decision — the KB entry that *promises* "low confidence biases verdicts toward
conservative" is unimplemented); every SKB per-rule / per-injury / per-KPI confidence
tag; exercise transfer ratings' evidence levels; the WP-59 readiness-validation readout
("Report-only — nothing consumes it").

**The pattern:** Art 13 has been implemented for *knowledge about training* and not for
*data about the athlete*. The ACWR lesson was generalised exactly one layer deep.

## 6. Knowledge that should exist and does not (by KA domain)

- **Assessment**: per-quality estimators for the 9 unmeasured qualities; the SKB's
  authored test batteries wired to capability. (The single highest-leverage gap.)
- **Programming**: a governed progression model (double-progression, load creep,
  ramp-to-working-weight protocols); RIR/VBT autoregulation tables; tempo knowledge.
- **Athlete modifiers**: age/masters and richer sex modifiers on landmarks, dose, and
  recovery (currently one rep bump + a standards table); youth guidance (authored in
  SKB `developmentPriorities`, unconsumed).
- **Injury**: rehab content for shin, quad, elbow, wrist, cervical (5/14 regions bare;
  9/14 at severity ≥4 because four more lack protect-phase entries); an id-level
  contraindication vocabulary to retire the name-regex join (K2, still open).
- **Recovery**: per-sport readiness/load overrides (authored, ignored); an ACWR
  cold-start calibration entry.
- **Governance**: a `validate:knowledge` gate over the sibling modules; structured
  citations; a review queue consuming the unwired staleness watchdog.

## 7. Priorities implied (feeds deliverable 09)

1. Fix the `strengthEndurance` mapping hole (one line, real demand restored to rugby)
   and emit `droppedDemands` (honesty first, vocabulary expansion second).
2. Wire assessments → capability (turns the diagnosis from priors into measurement —
   the S2 item, unchanged in rank).
3. Make athlete-signal confidence operative (implement the KB entry's own promised
   rule; fix the exported confidence computation).
4. Absorb the dropped qualities as a governed vocabulary expansion (K1/S3, an
   ontology-adjacent Simon call).
5. Move the allocator's structural literals and the sport-fact sets
   (D11_SPORTS/CATEGORY_LED → an SKB `meta.cohort` field) onto the governed surface.
6. Author the missing rehab regions (science review) and the id-level contraindication
   vocabulary.
