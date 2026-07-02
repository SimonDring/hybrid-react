# Sprint 4 — Diagnosis Layer (D4 + D5), compute-only — Design Spec

- **Status:** Approved design (2026-07-02). Ready for implementation planning.
- **Builds on:** Plan 1 (Athlete + Performance Model — `capabilities` with confidence), Plan 2 (SKB
  `demandProfile`), Sprint 0 (green CI-gated golden master). All merged to `main`.
- **Governs against (frozen, do NOT edit):** Constitution, EDS, Decision Ontology, Knowledge
  Architecture, TAS, Migration Blueprint (the D1–D16 catalogue).

---

## 0. One-paragraph summary

The Performance Model already carries `capabilities` (what the athlete can do, per physical quality,
with confidence) and `demandProfile` (what the sport/position requires, per quality, from the SKB) —
but its `limitingFactors` and `priorityAdaptations` are still empty scaffolds. This slice implements
the frozen **D4 (Limiting-Factor Diagnosis — "the pivot")** and **D5 (Priority-Quality Selection)** as
**pure inference** over those two inputs: D4 ranks the gap between demand and capability into limiting
factors (each with magnitude, confidence, and a plain-English rationale); D5 selects a small,
confidence-scaled set of priority qualities, each mapped to the adaptations that develop it. This
**completes the diagnostic triangle** (capability vs demand → limiting factor) the frozen docs call the
pivot of coaching. It is **compute-only**: the diagnosis is model output; it does **not** yet steer plan
generation (that is the next, riskier sprint), so the golden master stays byte-identical.

---

## 1. Decisions locked with the user

| # | Decision | Choice |
|---|---|---|
| A | Scope | D4 + D5 **compute-only** — fill `limitingFactors`/`priorityAdaptations`; NO plan-generation change. Steering the plan from the diagnosis is the next sprint. |
| B | D4 formula depth | **Core gap + neutral seams.** `magnitude = max(0, demandImportance − capabilityLevel) × demandImportance × trainability × injuryRisk`, with `trainability = injuryRisk = 1.0` (typed seams, ready to enrich). Confidence composed (weakest input). |
| C | D5 priority count | **Confidence-scaled k** (low→1, moderate→2, high→3), per the frozen D5 "fewer under low confidence". |

## 2. Frozen-doc contracts (Migration Blueprint §D4/§D5)

- **D4 · Limiting-Factor Diagnosis ★ the pivot.** In: athlete model, refined demand, injury status,
  recent performance. Out: **ranked limiting factors, each with magnitude + rationale + confidence.**
  Confidence driven by the weakest input. **Explain REQUIRED and central.** Valid: **a diagnosis must
  always exist.** Fail: no measured levels → diagnose from priors + sport risk, low confidence,
  conservative; *never no diagnosis.* Formula: `gap = demand − capability, × trainability-now ×
  injury-risk` ("the gap formula is code; targets/risks are Knowledge; confidence governs authority").
- **D5 · Priority-Quality Selection.** In: ranked limiters, season/phase, recoverability, concurrency.
  Out: **priority qualities, ordered, each tracing to a limiter** (k≈1–3). Valid: **priorities
  compatible** (no max-strength + max-endurance crammed). Confidence inherits diagnosis; lower →
  fewer priorities. Fail: conflicting high-priority limiters → sequence across blocks, don't cram.

---

## 3. Architecture

```
Performance Model (derivePerformanceModel, PURE):
   capabilities  (Plan 1)  ─┐
                            ├─▶  D4 diagnoseLimitingFactors  → limitingFactors[]  (ranked)
   demandProfile (Plan 2)  ─┘                                        │
                                                                     ▼
                              D5 prioritiseQualities  ──────▶  priorityAdaptations[]  (k, ordered)
                                       ▲
                            quality registry (adaptations[], for the quality→adaptation map + compatibility)
```

Both new functions are pure and deterministic; they import in-package data (the quality registry)
directly — same pattern as `estimation.js`/`demandProfile.js`. `derivePerformanceModel(model, asOf)`
keeps its signature; it now populates the two scaffold fields.

### 3.1 Modules
```
packages/engine/src/lib/performance/
  diagnose.js                 # NEW: diagnoseLimitingFactors(capabilities, demandProfile)
  prioritise.js               # NEW: prioritiseQualities(limitingFactors, qualities?)
  derivePerformanceModel.js   # MODIFY: populate limitingFactors (D4) + priorityAdaptations (D5)
  index.js                    # MODIFY: re-export diagnoseLimitingFactors, prioritiseQualities
packages/engine/src/data/
  qualityCompatibility.js     # NEW (small): antagonistic quality pairs for the D5 compatibility guard
```

---

## 4. D4 — `diagnoseLimitingFactors(capabilities, demandProfile)`

- Input: `capabilities` = `[{ qualityId, level(0..1), source, confidence, evidence }]` (Plan 1);
  `demandProfile` = `[{ qualityId, importance(0..1), source:'skb', evidence }]` (Plan 2) or `null`.
- For each entry in `demandProfile` (only DEMANDED qualities can be limiters):
  - `demandImportance` = the demand entry's importance.
  - `capabilityLevel` = the matching capability's level (0 if absent — never throws).
  - `capabilityConfidence` = the matching capability's confidence (`'low'` if absent).
  - `gap = Math.max(0, demandImportance − capabilityLevel)`.
  - `trainability = 1.0`, `injuryRisk = 1.0` (neutral seams).
  - `magnitude = gap × demandImportance × trainability × injuryRisk` (importance-weighted — a
    high-demand gap outranks a low-demand gap).
  - `confidence` = the weakest input. Demand is SKB-evidence-backed (treated high); the capability
    estimate is the weak link early → `confidence = capabilityConfidence`.
  - `rationale` = plain-English, e.g. `"cycling demands aerobicCapacity highly (0.90); your estimated
    level is 0.30 (inferred) — a large, high-importance gap."`
- Return the list **ranked by magnitude descending** (stable tiebreak by qualityId for determinism).
  Includes zero-magnitude entries so a sport athlete **always has a diagnosis** (the top entry is the
  focus even when the gap is 0 → "you meet the demands; maintain X").
- `demandProfile` null/empty (non-sport / build goal — no demand modelled yet) → `[]` (documented
  limitation; build-goal demand profiles are future work).
- **Never throws** on missing/partial inputs.

Entry shape: `{ qualityId, magnitude, demandImportance, capabilityLevel, confidence, trainability,
injuryRisk, rationale }`.

## 5. D5 — `prioritiseQualities(limitingFactors, qualities?)`

- Input: the ranked `limitingFactors` (D4); the quality registry (imported; `qualities` param
  optional/injectable for tests) for each quality's `adaptations[]`.
- **k (confidence-scaled):** derive an overall diagnosis confidence from the top positive-magnitude
  limiter's `confidence` → `low→1, moderate→2, high→3`.
- Take the top-k **positive-magnitude** limiters (skip zero-magnitude — nothing to develop). If none
  are positive → `[]` (athlete meets all demands).
- **Compatibility guard:** using `qualityCompatibility.js` (a small set of antagonistic pairs, seeded
  with the classic `maxStrength × aerobicCapacity` concurrent-training interference), skip a candidate
  that is antagonistic to an already-selected higher-priority quality; record the skip in that entry's
  rationale ("deferred — conflicts with higher-priority X"). Fill from the next eligible limiter so k
  is still met where possible.
- For each selected quality: `{ qualityId, order(1..k), magnitude, confidence, adaptations:[ids from
  the quality registry], tracesToLimiter: qualityId, rationale }` (e.g. "prioritising maxStrength — your
  top limiter (magnitude 0.42); developed via motor_unit_recruitment, myofibrillar_hypertrophy").
- **Never throws.**

`derivePerformanceModel` stores this as `priorityAdaptations` (the field name from Plan 1's scaffold;
each entry is a priority QUALITY carrying the adaptations that develop it — documented in the tech doc).

## 6. Integration — `derivePerformanceModel(model, asOf)`

Signature unchanged. After computing `capabilities` + `demandProfile` (as today), compute
`const limitingFactors = diagnoseLimitingFactors(capabilities, demandProfile)` and
`const priorityAdaptations = prioritiseQualities(limitingFactors)`, and return them in place of the
current `[]` scaffolds. Deterministic; capabilities/demandProfile behaviour otherwise unchanged.

---

## 7. Testing

Node scripts under `apps/mobile/tests/` (Sprint-0 runner + CI gate enforce them):
- `diagnose-limiting-factors.js` — gap = max(0, demand − capability); importance-weighting; descending
  rank + deterministic tiebreak; confidence = capability confidence (weakest); rationale present; a
  sport model always yields ≥1 limiter (never empty); null demand → `[]`; never throws on partial input.
- `prioritise-qualities.js` — k=1/2/3 by confidence; only positive-magnitude limiters selected; each
  maps to the correct registry adaptations; compatibility guard defers the antagonistic pick; all-zero
  → `[]`; never throws.
- `performance-diagnosis.js` — `derivePerformanceModel` for a sport athlete populates `limitingFactors`
  (ranked, with rationale) + `priorityAdaptations` (k, ordered, with adaptations); a build model leaves
  both `[]`; deterministic; `capabilities`/`demandProfile` unchanged from Plan 2 behaviour.
- **Golden master** (`golden-master.js`) MUST stay green — no plan change.

---

## 8. Scope boundaries (non-goals)

- **No plan-generation change.** The diagnosis is model output; it does not (yet) alter periodization,
  session design, or exercise selection. The golden master is untouched. Steering the plan from the
  diagnosis is the next sprint (the risky re-seating, its own brainstorm).
- **`trainability` / `injuryRisk` are neutral seams (= 1.0).** Present + typed in the formula and the
  output, ready to enrich (injury-risk from the injury system; trainability from the quality registry)
  in a later slice.
- **Build-goal diagnosis** is empty (Plan 2 only built the SKB demand profile for sport athletes;
  goal-as-sport demand for build goals is future work).
- **No new engine sport modules / SKB authoring.**

---

## 9. Success criteria

- `limitingFactors` is populated and correctly ranked for a sport athlete, each carrying magnitude +
  confidence + a plain-English rationale (frozen: explain REQUIRED; a diagnosis always exists).
- `priorityAdaptations` holds a confidence-scaled, ordered set of priority qualities, each tracing to a
  limiter and mapped to its developing adaptations, respecting the compatibility guard.
- The live plan is unchanged (golden master green); frozen docs untouched.
- New functionality covered by tests.
- The platform now **diagnoses** the athlete (limiting factors + priorities) — the pivot the next
  sprint will use to actually shape the plan.
