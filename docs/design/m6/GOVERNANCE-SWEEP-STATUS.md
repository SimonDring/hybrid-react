# M6(a) governance sweep — status + review packet (2026-07-16)

**The P2-10 sweep closes commitment C3: *no coaching magnitude steers a plan from code at full
authority* (`04-KNOWLEDGE-OWNERSHIP-MAP.md` §3, 13 rows). This tracks what's done and hands the
remainder — which is NOT mechanical — to Simon.**

## Done — every genuine relocation (stamp-only, byte-identical-bar-KSV, all merged)

| Row | What moved | Home | PR |
|---|---|---|---|
| 10 | season-phase cut-points (56/120 days) | `data/periodizationDefaults.js` | #201 |
| 11 | reflow effect magnitudes (0.6/0.55/0.4/0.85/0.2) | `data/reflowEffects.js` | #202 |
| 6 | readiness weights — killed the decorative copy, read the governed KB entry | `index.readiness.weights` | #202 |
| 7 | category-led sport membership → authored SKB fact | `meta.cohorts.categoryLed` | #203 |
| 7b | D11/SSC engineSport sets → authored binding facts | `sportEngineBinding.js` | #204 |
| 1a | session-assembly time caps (30/15/12/10) | `data/sessionBuilding.js` | #205 |
| 1b | perSetMin costs + focus thresholds + finisher relevance weights | `data/sessionBuilding.js` + `data/selectionScoring.js` | #206 |
| 12 | `LIGHT_STRENGTH_MAINS` evidence block | `data/doseSchemes.js` | #207 |
| 3 | modality-similarity fall-back distance → named seed | `data/exerciseSimilarity.js` | #207 |
| 9 | global sport-support load magnitudes | `data/sportLoadDefaults.js` | #208 |

**Every code literal that STEERS a plan is now governed knowledge.** Each move was proven stamp-only
(the sole golden diff was the `knowledgeSetVersion` bump 1.35.0 → 1.43.0; verified non-stamp diff
empty each time), CI-green, with an expected-delta note. `SESSION_CEILING_MIN` (75) stays — already
governed at the pin (audit 05 §3).

## NOT done — and why these are Simon's, not a mechanical move

The remaining rows are **not relocations** — they are provenance/science-content authoring, which
the closure design itself treats as review work. Fabricating a `confidence`/`source` stamp per entry
would be dishonest governance (Art 13/14), so these are routed here rather than silently swept.

### Provenance shape-upgrades — need per-entry sourcing (science-adjacent)
- **Row 2 — `PATTERN_CONTRIB` fractional-set weights** (the whole volume-ledger input). Each weight
  needs an authored provenance + confidence. This is the muscle-contribution science; assigning a
  confidence to each fractional-set credit is a coaching-science judgment, not a code move.
- **Row 8 — exercise axial/CNS/level/stretch tags** (~118 exercises). Per-tag provenance or seed
  label. Voluminous per-exercise sourcing.
- **Row 13 — the comment-provenance band** (9 tables: `selectionScoring` · `schedulingPolicy` ·
  `blockPriors` · `capabilityPriors` · `regionQualityRisk` · `strengthStandards` · `goalDemand` ·
  `periodizationDefaults` · `qualities`). Transcribe each table's comment-provenance into
  machine-readable `confidence`/`source` fields. Where a comment already cites a source it is near-
  mechanical; where it doesn't, it needs a real sourcing decision.

### Already-flagged science calls (from the M6 plan §4 / M4a)
- **Row 4 — `injuryTaxonomy` `high_risk` flags.** Gate-tier under Art 8 → **mandatory** citations, not
  seed. A referral-triage gate needs high-confidence knowledge (Art 13). Simon's science review.
- **Row 5 — `femaleRepBump` +2** → the athlete-modifier family (age/sex; Art 21 binds youth/LTAD).
  Simon's science call; the family expansion is the M6 sub-phase (d) work.
- **Ballistic/olympic `clearedIds` contraindication vocab (M4a)** — safety-critical; whether
  `hang_clean`/`snatch`/clean-&-jerk should be contraindicated for given injury regions is Simon's
  near-term science review (travels with row 4).

## Recommendation

The mechanical sweep is **complete** — C3's "zero coaching magnitudes at full authority in code" is
met for every plan-steering literal. The remaining rows are two review efforts: (1) a **provenance
authoring pass** over the data tables (rows 2/8/13 — best done as one focused pass, possibly with a
scientist, since it assigns confidence per entry), and (2) the **science calls** (rows 4/5 +
contraindication vocab) that were always Simon's. Neither should be mechanically stamped.
