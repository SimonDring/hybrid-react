/**
 * Evidence knowledge base — the single, traceable home for the scientific constants
 * and positions the engine relies on. Each entry follows the KnowledgeEntry schema
 * (./schema.js). Engine modules read VALUES via ./kb.js; reviewers read the
 * provenance. Updating the science = editing an entry here, not engine logic.
 *
 * Confidence is honest: contested numbers (the ACWR thresholds) are tagged 'low' so
 * the engine — and any future AI layer — treats them as soft inputs. The reasoning
 * and citations live in docs/engine/01-PANEL-REVIEW.md (§3, §13, §15).
 *
 * This is the first migration (roadmap Phase 1). `volume.landmarks` and the
 * `load.acwr.*` thresholds are now SOURCED here (the engine reads them); other
 * thresholds (readiness bands, taper, level/style scalars) will migrate next.
 */

/**
 * Versions the knowledge SET as a whole — entries here plus the science data
 * tables the engine reads (doseSchemes, muscleVolume, exerciseQualities, the
 * SKB…). Bump on any science change; stamped into every plan/reflow output as
 * meta.provenance.knowledgeSetVersion (WP-27).
 */
export const KNOWLEDGE_SET_VERSION = '1.13.0'; // 1.13.0 (2026-07-07, WP-49 Plan 1): hypertrophy/powerlifting/olympic discipline modules. 1.12.0 (2026-07-07, WP-49 Plan 1): Olympic + powerlifting catalogue lifts (discipline-gated). 1.11.0 (2026-07-07, WP-49 Plan 1): discipline knowledge foundation (schema). 1.10.0 (2026-07-07, WP-61): scheduler interference penalties + allocator selection-scoring multipliers extracted to governed data (data/schedulingPolicy.js, data/selectionScoring.js) — scheduling + selection policy is knowledge now, not code literals; values byte-identical. 1.9.0 (2026-07-06, WP-46 completion): governed id-keyed maps PROGRESSION_LIFTS + CORE_HOLDS replace the name-fuzzy plan-path joins (matchLift, core hold regex) — values reproduce the matchers exactly, keyed by exId. 1.8.0 (2026-07-06, WP-58 reconcile): engine capability anchors (STRONG_BW_MULTIPLE) DERIVED from the governed advanced band for every lift×sex — ohp + female deadlift/ohp moved to advanced (one source; parallel-model only, does not steer the live plan). 1.7.0 (2026-07-06, WP-47): governed block-objective priors (data/blockPriors.js) for the D7 ADVISORY block plan — season→objective template, block-length/deload by trajectory×recoverability. 1.6.0 (2026-07-06, WP-58): strength-standards band table brought into the governed set (data/strengthStandards.js) — the app now re-exports it (one source); values unchanged. 1.5.0 (2026-07-06, WP-45): ONE per-exercise muscle table (EXERCISE_MUSCLES) — volume accounting adopts the 14 documented corrections the substitution model already knew (hip-thrust family glute-primary, rear-delt isolations off the lat ledger, triceps-biased presses, long-lever lat pulls). 1.4.0 (2026-07-06, WP-44): governance reconciliation — recovery.bands + volume_modifiers confidence re-reviewed low→moderate (autoregulation evidence; mechanism and rating now agree), authority-mapping scope clarified (decision-level actions vs intra-decision parameters), readiness-v2 entry reconciled with its shipped default-ON reality (validation = WP-59). 1.3.0 (2026-07-06, WP-48): soccer + rugby SKB flagship-authored (NO stubs remain); team-sport library id normalisation (mb_rotational_throw→cable_woodchop etc.) + hurling plyo/upper-body entries; hurling/gaelic_football/field_hockey/soccer/rugby flip to category-led. 1.2.0 (2026-07-06): WP-38 — sport-experience capability priors (capabilityPriors.SPORT_EXPERIENCE) + per-lift strength standards in D1 estimation; WP-42a — goal demand profiles (data/goalDemand.js) so build goals get a real diagnosis. 1.1.0 (2026-07-04): +field_hockey SKB profile; endurance decisionRules structured

/** @type {import('./schema.js').KnowledgeEntry[]} */
export const ENTRIES = [
  // ── Volume ──────────────────────────────────────────────────────────────────
  {
    id: 'volume.landmarks',
    rule: 'Weekly hard-set landmarks per muscle (MEV/MAV/MRV), general-trainee mid-range.',
    value: {
      chest:      { mev: 8,  mav: 16, mrv: 22 },
      back:       { mev: 10, mav: 18, mrv: 25 },
      shoulders:  { mev: 8,  mav: 18, mrv: 26 },
      biceps:     { mev: 6,  mav: 14, mrv: 20 },
      triceps:    { mev: 6,  mav: 14, mrv: 20 },
      quads:      { mev: 8,  mav: 16, mrv: 20 },
      hamstrings: { mev: 6,  mav: 13, mrv: 18 },
      glutes:     { mev: 6,  mav: 14, mrv: 20 },
      calves:     { mev: 6,  mav: 13, mrv: 20 },
      core:       { mev: 0,  mav: 16, mrv: 25 }
    },
    evidenceLevel: 'L5',
    source: 'Renaissance Periodisation / Israetel landmarks; dose-response support: Schoenfeld 2017, Pelland 2024 (Sports Medicine)',
    confidence: 'moderate',
    lastReviewed: '2026-06-23',
    appliesTo: ['volume', 'targets', 'allocator']
  },
  {
    id: 'volume.dose_response',
    rule: 'More weekly volume raises hypertrophy & strength with diminishing returns; count fractional (synergist-weighted) sets. MRV is a recoverability / diminishing-returns guide, not a hard cliff.',
    value: { diminishingReturns: true, fractionalSets: true },
    evidenceLevel: 'L1',
    source: 'Pelland et al. 2024/25, Sports Medicine (meta-regression, 67 studies); Schoenfeld, Ogborn & Krieger 2017',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['volume', 'allocator']
  },

  // ── Knowledge governance ──────────────────────────────────────────────────────
  {
    id: 'knowledge.authority.mapping',
    rule: 'Evidence confidence caps the authority a knowledge entry may exert on any decision: high → gate (may force/veto alone), moderate → soft (may scale alone within its rule), low → reported (rationale + conservative-floored adjustment + corroboration only; never acts alone). Consumed via knowledge/authority.js. SCOPE (WP-44 reconciliation): authority tiers govern DECISION-LEVEL ACTIONS — forcing, vetoing, or scaling a shipped signal/plan. Intra-decision calibration parameters (e.g. the selection.* weights inside D11) do not act alone by construction: their output is disposed of by D14 validation and the per-cohort quality gates, which are the governing mechanism for parameters. A low-confidence entry that IS a decision-level action must corroborate; a low-confidence parameter must carry provenance and stay behind those gates.',
    value: { high: 'gate', moderate: 'soft', low: 'reported' },
    evidenceLevel: 'L5',
    source: 'Constitution Art 13 (confidence must be operative); EDS §28.3; the Impellizzeri/Lolli ACWR demotion as the working precedent',
    confidence: 'high',
    lastReviewed: '2026-07-04',
    appliesTo: ['knowledge', 'load', 'recovery']
  },

  // ── D11 selection weights (EDS §34; confidence per the H9 review §4) ──────────
  {
    id: 'selection.fatigue_budget',
    rule: 'Fatigue-unit budget per session by the D9 objective\'s fatigue level — selection stops when the budget is spent (bank the rest, L5).',
    value: { low: 4, moderate: 6, high: 8 },
    evidenceLevel: 'L5',
    source: 'Internal heuristic — no literature anchors a "fatigue unit budget"; produces sensible 2–4-exercise sessions (H9 review §4: defensible heuristic)',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['selection']
  },
  {
    id: 'selection.fatigue_units',
    rule: 'Exercise fatigue cost from its 3-D fatigueCost tags: each dimension maps low/moderate/high → 1/2/3 units, combined by a weighted mean (combineWeights) — preserving the neural/metabolic/mechanical model instead of collapsing to max() (H9 C4/F7).',
    value: { unit: { low: 1, moderate: 2, high: 3 }, combineWeights: { neural: 1, metabolic: 1, mechanical: 1 } },
    evidenceLevel: 'L5',
    source: 'Internal ordinal model; the weighted-mean combine is the H9 review\'s C4 correction (max() equalised 5 of 8 exercise classes at 3 units)',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['selection']
  },
  {
    id: 'selection.transfer_weights',
    rule: 'Transfer-per-fatigue numerator: quality match primary/secondary/support → 2/1/0.5. A movement the sport\'s SKB library lists is ALSO valued by its authored transferToSportRating (1–10) ÷ skbRatingDivisor — the sport scientist\'s judgement, per movement, replaces the old blunt ×1.5 boost (Sprint 9 19a); the exercise takes the better of the two values.',
    value: { primary: 2, secondary: 1, support: 0.5, skbRatingDivisor: 2, skbDefaultRating: 5 },
    evidenceLevel: 'L5',
    source: 'Monotonic ordinal transfer proxy; the divisor maps ratings (3–9 observed) to 1.5–4.5 — deliberately DOMINANT over the generic quality-match range (0.5–2) within a tier, because the library is the sport scientist\'s authored priority list; ratings carry SKB per-entry provenance',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['selection']
  },
  {
    id: 'selection.pattern_cap',
    rule: 'At most N exercises per movement pattern per session — the variety guard (stops "3 deadlifts"); EDS §34 primary + secondary compound.',
    value: 2,
    evidenceLevel: 'L5',
    source: 'EDS §34; H9 review §4 rates it CLEAR (sound, uncontested)',
    confidence: 'moderate',
    lastReviewed: '2026-07-04',
    appliesTo: ['selection']
  },

  // ── Volume ramp bands (weekly targets) ────────────────────────────────────────
  {
    id: 'volume.style_top',
    rule: 'Where the MEV→ ramp ENDS per style, as a fraction of the productive band (0 = MEV, 1 = MAV, >1 = into MAV→MRV): strength/sport end low (intensity carries it), bodybuilding overreaches past MAV.',
    value: { strength: 0.6, functional: 1.0, bodybuilding: 1.4, sport: 0.6 },
    evidenceLevel: 'L4',
    source: 'RP-style volume-band programming (Israetel) applied per style; internal calibration',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['volume']
  },
  {
    id: 'volume.level_bands',
    rule: 'Experience scales the volume BAND: start = how far up the MEV→top ramp week 1 begins (an adapted athlete never starts at a novice\'s MEV); topBonus = extra band height for advanced (deeper toward MRV).',
    value: { start: { beginner: 0.0, returning: 0.2, intermediate: 0.4, advanced: 0.6 }, topBonus: { beginner: 0, returning: 0, intermediate: 0, advanced: 0.3 } },
    evidenceLevel: 'L5',
    source: 'Internal calibration on the RP band model',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['volume']
  },

  // ── Validation policies (D14) ─────────────────────────────────────────────────
  {
    id: 'programming.session_ceiling',
    rule: 'A session\'s honest realised duration must fit the product\'s session ceiling (75 min) within slack — the athlete\'s stated time is a commitment, not a suggestion (F5 honest durations).',
    value: { minutes: 75, slackMin: 10 },
    evidenceLevel: 'L5',
    source: 'Product commitment (busy-athlete positioning; F5 "honest durations" shipped 2026-06); ceiling mirrors allocator SESSION_CEILING_MIN',
    confidence: 'high',
    lastReviewed: '2026-07-04',
    appliesTo: ['validation', 'programming']
  },
  {
    id: 'validation.session_purpose',
    rule: 'Every shipped gym session is coherent: it contains work (never empty), and a session labelled Upper/Lower delivers the majority of its volume in that region.',
    value: { regionMajority: 0.5 },
    evidenceLevel: 'L5',
    source: 'Definitional coherence policy (Constitution Art 14 — a session must be what it says it is)',
    confidence: 'high',
    lastReviewed: '2026-07-04',
    appliesTo: ['validation']
  },
  {
    id: 'injury.contraindication_policy',
    rule: 'An active injury\'s contraindicated movements must never appear in a shipped session — a validated week is a FIXED POINT of the injury filter (applying it changes nothing).',
    value: 'fixed-point',
    evidenceLevel: 'L4',
    source: 'Safety-definitional; the per-region contraindications themselves are evidence-tagged in injury/profiles.js',
    confidence: 'high',
    lastReviewed: '2026-07-04',
    appliesTo: ['validation', 'injury']
  },

  // ── Training load ─────────────────────────────────────────────────────────────
  {
    id: 'load.acwr.thresholds',
    rule: 'ACWR bands used by the week-level load decision (sweet-spot 0.8–1.3, high 1.5).',
    value: { sweetLow: 0.8, easeFrom: 1.3, high: 1.5 },
    evidenceLevel: 'L2',
    source: 'Gabbett 2016 (origin); CRITIQUED — Impellizzeri 2019 (BJSM) & 2020 (Sports Medicine), Lolli et al. (mathematical coupling → spurious correlation)',
    confidence: 'low',
    lastReviewed: '2026-06-23',
    appliesTo: ['load']
  },
  {
    id: 'load.acwr.policy',
    rule: 'How the load decision scales volume from ACWR (deload/ease/nudge) and the combined readiness×load floor.',
    value: { deloadMultiplier: 0.5, easeSlope: 0.3, nudgeUp: 1.0, sustainedDays: 3, combinedFloor: 0.5 },
    evidenceLevel: 'L5',
    source: 'Internal heuristic layered on the (contested) ACWR signal — see load.acwr.validity',
    confidence: 'low',
    lastReviewed: '2026-06-23',
    appliesTo: ['load']
  },
  {
    id: 'load.acwr.validity',
    rule: 'ACWR is mathematically coupled (acute ⊂ chronic) → spurious correlation; the "sweet spot" figure is flawed. Treat ACWR as ONE soft, low-confidence input, never a hard injury gate; prefer absolute load + week-on-week change.',
    value: 'soft-input',
    evidenceLevel: 'L2',
    source: 'Impellizzeri et al. 2019 (BJSM) & 2020 (Sports Medicine, "Conceptual Issues and Fundamental Pitfalls"); Lolli et al.',
    confidence: 'low',
    lastReviewed: '2026-06-23',
    appliesTo: ['load']
  },

  // ── Recovery / readiness ──────────────────────────────────────────────────────
  {
    id: 'recovery.bands',
    rule: 'Readiness-score bands: ≥ greenCut = high (train as planned), ≥ moderateCut = moderate, below = low. greenCut default 70 (the v2 readiness weighting passes 67 explicitly).',
    value: { greenCut: 70, moderateCut: 50 },
    evidenceLevel: 'L4',
    source: 'Cut-points layered on the validated readiness signal (Saw 2016 — readiness.subjective_priority); readiness-banded autoregulation direction per flexible-programming evidence (Helms 2018 autoregulated prescription; Greig 2020 flexible templates). WP-44 confidence re-review: upgraded low→moderate — the graded, conservative action these bands gate (≤22% trim) is standard autoregulation practice, and the STRONG action (deload) still requires corroboration under the separate low-confidence deload_thresholds entry. Exact cut-point values remain heuristic; the WP-59 outcome readout validates them.',
    confidence: 'moderate',
    lastReviewed: '2026-07-06',
    appliesTo: ['recovery']
  },
  {
    id: 'recovery.volume_modifiers',
    rule: 'Session volume scaling per readiness band: high = full plan, moderate = -10%, low = -22%. Conservative, graded — the strong cut (deload) requires corroboration.',
    value: { high: 1, moderate: 0.9, low: 0.78 },
    evidenceLevel: 'L4',
    source: 'Readiness-driven volume autoregulation — direction well-supported (Helms 2018; flexible/autoregulated programming meta-evidence); magnitudes internal-conservative (≤22% trim). WP-44 confidence re-review: upgraded low→moderate so the Art-13 mechanism and the rating agree — a soft entry may scale alone WITHIN its rule, which is exactly what this graded trim does; anything stronger stays behind deload corroboration. Magnitudes validated by the WP-59 outcome readout.',
    confidence: 'moderate',
    lastReviewed: '2026-07-06',
    appliesTo: ['recovery']
  },
  {
    id: 'recovery.deload_thresholds',
    rule: 'Adaptive-deload cut-points: readiness < readinessLow AND session-recovery ≤ recoveryPoor (1–5 scale) marks fatigue that can FORCE a deload; readiness ≥ readinessFresh AND session-recovery ≥ recoveryFresh marks freshness that can DEFER a planned one. The strongest behavioural call in the runtime layer — the signals are validated, these cut-points are heuristic.',
    value: { readinessLow: 50, readinessFresh: 70, recoveryPoor: 2, recoveryFresh: 4 },
    evidenceLevel: 'L5',
    source: 'Internal heuristic cut-points on validated signals (Saw 2016 subjective priority; illness override per common S&C practice)',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['recovery', 'load']
  },
  {
    id: 'recovery.intensity_policy',
    rule: 'Readiness scales INTENSITY as well as volume: on a low-readiness day the target RPE drops by 1 (never below rpeFloor); suggested loads follow via the inverse-Epley %1RM. Moderate readiness keeps intensity (volume already trims 10% there — no double-dipping on a middling day).',
    value: { rpeOffsetByBand: { high: 0, moderate: 0, low: -1 }, rpeFloor: 5 },
    evidenceLevel: 'L4',
    source: 'RPE/RIR autoregulation — Helms et al. 2016 (RIR-based RPE scale), 2018 (autoregulated load prescription); magnitude (−1 RPE) internal-conservative',
    confidence: 'moderate',
    lastReviewed: '2026-07-04',
    appliesTo: ['recovery']
  },
  {
    id: 'recovery.travel_policy',
    rule: 'A travel "easy" day is both SHORTER and LIGHTER: session volume capped at volumeCap of plan, target RPE dropped by rpeOffset (not stacked below the readiness offset — the two take the minimum).',
    value: { volumeCap: 0.7, rpeOffset: -1 },
    evidenceLevel: 'L5',
    source: 'Internal heuristic (the long-standing 0.7 cap, relocated from PlanService with provenance; lighter-not-just-shorter per common S&C travel practice)',
    confidence: 'low',
    lastReviewed: '2026-07-04',
    appliesTo: ['recovery']
  },
  {
    id: 'readiness.subjective_priority',
    rule: 'Subjective wellness (sleep quality, soreness, mood, stress, energy) is at least as sensitive as objective HRV/RHR for monitoring load response — weight it ≥ objective signals, and combine.',
    value: true,
    evidenceLevel: 'L1',
    source: 'Saw, Main & Gastin 2016, BJSM (systematic review)',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['recovery']
  },

  // ── Injury prevention protocols ───────────────────────────────────────────────
  {
    id: 'prevention.copenhagen_groin',
    rule: 'The Copenhagen adduction programme reduces groin-problem risk (~41% in male footballers) — adductor eccentric strengthening, 3×/wk pre-season then 1×/wk in-season, 3 progression levels.',
    value: { riskReduction: 0.41 },
    evidenceLevel: 'L3',
    source: 'Harøy et al. 2019, BJSM (cluster-RCT); supported by adductor-strength reviews',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['injury', 'prevention']
  },
  {
    id: 'prevention.nordic_hamstring',
    rule: 'Nordic hamstring exercise reduces hamstring-injury risk — popular meta-analysis ~51%, but a stricter-methodology reappraisal was inconclusive (GRADE: conditionally recommended). Eccentric loading; adherence-limited.',
    value: { riskReduction: 'conditional' },
    evidenceLevel: 'L1',
    source: 'van Dyk et al. 2019 (meta ~51%); methodological reappraisal (inconclusive); 2024 umbrella review (GRADE conditional)',
    confidence: 'moderate',
    lastReviewed: '2026-06-23',
    appliesTo: ['injury', 'prevention']
  },
  {
    id: 'prevention.neuromuscular_acl',
    rule: 'Neuromuscular warm-up programmes (e.g. FIFA 11+) reduce injury ~30–57% (incl. ~52% knee; pronounced female ACL benefit) — strength + balance + plyometric control. Efficacy is strong but adherence-dependent.',
    value: { riskReduction: [0.30, 0.57] },
    evidenceLevel: 'L1',
    source: 'FIFA 11+ systematic reviews & meta-analyses; Webster & Hewett (ACL)',
    confidence: 'high',
    lastReviewed: '2026-06-23',
    appliesTo: ['injury', 'prevention']
  },

  // ── Universal physiological framework (raw metrics → derived indices) ──────────
  // The physiological foundation for the readiness/recovery/load layer. Manufacturer-
  // independent by design: derive everything from raw metrics, normalised to the
  // individual's own baseline, never from a vendor's proprietary score.
  // Full design: docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md.
  {
    id: 'physio.hrv.metric',
    rule: 'rMSSD (log-transformed → lnRMSSD) is the canonical vagal-HRV index for daily readiness. Use a 7-day rolling average vs a personal baseline with a smallest-worthwhile-change filter, not single-day values. A collapsing day-to-day coefficient of variation (CV) flags non-functional overreaching.',
    value: { index: 'lnRMSSD', rollingDays: 7, useSWC: true, cvCollapseIsRedFlag: true },
    evidenceLevel: 'L2',
    source: 'Plews, Laursen, Stanley, Kilding & Buchheit 2013, Sports Medicine ("Training adaptation and HRV in elite endurance athletes: opening the door to effective monitoring"); Buchheit 2014, Front. Physiol. (HRV beyond rMSSD)',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['recovery', 'readiness']
  },
  {
    id: 'physio.hrv.guided_training',
    rule: 'Guiding training by HRV trend (vs a fixed prescription) better maintains/improves vagal HRV and yields fewer negative responders, with a small positive effect on VO2max — supports HRV as an actionable readiness input, not merely a health descriptor.',
    value: { betterThanPredefined: true, vo2maxEffect: 'small-positive', fewerNegativeResponders: true },
    evidenceLevel: 'L1',
    source: 'Manresa-Rocamora et al. 2020 (meta-analysis, VO2max); Granero-Gallegos et al. 2021 (methodological systematic review with meta-analysis)',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['recovery']
  },
  {
    id: 'physio.rhr.role',
    rule: 'Resting heart rate is a corroborating, not primary, recovery marker: alone it is weak and inconsistent for detecting overreaching (changes often sit within day-to-day noise); nocturnal/sleeping HR is more reliable than waking RHR. Weight RHR below HRV and subjective wellness.',
    value: { role: 'corroborating', preferNocturnal: true },
    evidenceLevel: 'L2',
    source: 'Bosquet, Merkari, Arvisais & Aubert 2008, Br J Sports Med — "Is heart rate a convenient tool to monitor over-reaching? A systematic review of the literature"',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['recovery', 'readiness']
  },
  {
    id: 'physio.sleep.targets',
    rule: 'Sleep is the single most important recovery lever. Target 7–9 h total sleep time (athletes skew high, ≥8 h), sleep efficiency >85%, and regular sleep timing. Short/fragmented sleep degrades strength, power, endurance and reaction time.',
    value: { totalHours: [7, 9], athleteFloorHours: 8, efficiencyPct: 85 },
    evidenceLevel: 'L1',
    source: 'Walsh et al. 2021, Br J Sports Med 55(7):356–368 (expert consensus recommendations); sleep-intervention systematic reviews 2022–2023',
    confidence: 'high',
    lastReviewed: '2026-06-28',
    appliesTo: ['recovery', 'readiness']
  },
  {
    id: 'physio.normalization.personal_baseline',
    rule: "Normalise every objective metric (HRV, RHR, sleep, respiratory rate) to the INDIVIDUAL's own rolling baseline (z-score / % deviation over 7–60 days), never to population absolutes or a vendor's proprietary score. Devices disagree on absolute values but are reasonably self-consistent over time, so the trustworthy signal is the intra-device trend — this is what makes the framework manufacturer-independent.",
    value: { method: 'personal-rolling-baseline', windowDays: [7, 60] },
    evidenceLevel: 'L2',
    source: 'Plews et al. 2013 (Sports Medicine); device-disagreement evidence: Dial et al. 2025 (Physiol Rep, 5 devices vs ECG, 536 nights), Miller et al. 2022 (six-device validation)',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['recovery', 'readiness', 'normalization']
  },
  {
    id: 'physio.source.reliability',
    rule: "Per-source confidence weights for objective metrics, from validation concordance vs ECG/PSG. Each input's confidence contribution scales by its source quality (these scale CONFIDENCE, never the value). Chest-strap/ECG ≈ 1.0; finger ring ≈ 0.95; wrist optical ≈ 0.8; manual/subjective ≈ 0.7.",
    value: { ecg: 1.0, chest_strap: 1.0, finger_ring: 0.95, wrist_optical: 0.8, manual: 0.7 },
    evidenceLevel: 'L2',
    source: 'Dial et al. 2025 (Physiol Rep; nocturnal RHR/HRV vs ECG, 536 nights: Oura CCC≈0.99, WHOOP≈0.94, Garmin≈0.87, Polar≈0.82); Miller et al. 2022 (six wearables: sleep/HR/HRV)',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['normalization']
  },
  {
    id: 'load.internal.method',
    rule: 'Quantify internal training load as session-RPE × duration (min) and/or Edwards summated-HR-zone TRIMP; the two correlate strongly and both are validated across resistance and mixed training. Accumulate as acute (7-day) vs chronic (28-day) exponentially-weighted averages.',
    value: { internal: ['sRPE_x_min', 'edwards_trimp'], acuteDays: 7, chronicDays: 28 },
    evidenceLevel: 'L1',
    source: 'Foster 1998/2001 (session-RPE origin); Haddad et al. 2017, Front. Neurosci. (session-RPE validity, ecological usefulness & influencing factors)',
    confidence: 'high',
    lastReviewed: '2026-06-28',
    appliesTo: ['load']
  },
  {
    id: 'load.external.volume_load',
    rule: 'For strength training, track external load as volume-load (Σ sets × reps × kg, i.e. tonnage) alongside internal load — it captures mechanical dose that HR-based internal load misses. Judge progression by week-on-week change in absolute volume-load, not a single ratio.',
    value: { external: 'volume_load_kg', formula: 'sum(sets*reps*kg)' },
    evidenceLevel: 'L4',
    source: 'Standard S&C monitoring practice; consistent with the athlete-monitoring consensus (Bourdon et al. 2017, Int J Sports Physiol Perform)',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['load']
  },
  {
    id: 'index.readiness.weights',
    rule: 'The v2 Readiness Index composes its value from sub-indices: wellness (subjective) is the largest single weight (Saw 2016), HRV-driven cardiovascular recovery the primary objective marker, sleep heavy, fatigue a corroborator; Recovery Capacity nudges the ceiling. A ≥67 green cut. STATUS (WP-44 reconciliation): shipped DEFAULT-ON (profile readiness_v2 !== false — the earlier default-off-until-validated condition was flipped without updating this entry); the validation-against-logged-performance loop is the WP-59 outcome readout, still owed. Opt-out remains readiness_v2: false.',
    value: { weights: { wellness: 0.40, sleep: 0.25, cardio: 0.25, fatigue: 0.10 }, greenCut: 67, capacityModulation: 0.1, subjectiveAtLeastObjective: true, primaryObjective: 'hrv' },
    evidenceLevel: 'L4',
    source: 'Weighting heuristic anchored on Saw, Main & Gastin 2016, Br J Sports Med (subjective ≥ objective); HRV primary per Plews 2013; sleep per Walsh 2021. See readiness.subjective_priority',
    confidence: 'moderate',
    lastReviewed: '2026-06-29',
    appliesTo: ['readiness']
  },
  {
    id: 'index.fatigue.markers',
    rule: 'No single objective marker reliably detects overreaching, so the Fatigue Index is a composite: HRV suppression + collapsing HRV coefficient of variation (non-functional-overreaching signal), upward RHR drift, rising subjective fatigue/soreness, and any performance decrement (e-1RM / bar velocity). Require corroboration across markers before acting.',
    value: { markers: ['hrv_suppression', 'hrv_cv_collapse', 'rhr_drift', 'subjective_fatigue', 'performance_decrement'], requireCorroboration: true },
    evidenceLevel: 'L2',
    source: 'Bosquet et al. 2008 (Br J Sports Med, HR/over-reaching review); Plews et al. 2013 (Sports Medicine, HRV CV)',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['load', 'recovery']
  },
  {
    id: 'index.confidence.model',
    rule: 'Every index emits a value AND a confidence in [0,1]: confidence = Σ(weight·present·sourceReliability·baselineMaturity) / Σ(weight). Missing inputs lower confidence but never block a recommendation; low confidence biases verdicts toward conservative ("further assessment"), so weak data cannot drive aggressive load changes.',
    value: { formula: 'sum(w*present*sourceReliability*baselineMaturity)/sum(w)', missingBlocks: false, lowConfidenceIsConservative: true },
    evidenceLevel: 'L5',
    source: 'Framework design principle (graceful degradation); grounded in physio.source.reliability and readiness.subjective_priority',
    confidence: 'moderate',
    lastReviewed: '2026-06-28',
    appliesTo: ['readiness', 'normalization']
  },
  {
    id: 'index.recovery_capacity',
    rule: 'Recovery Capacity is a slow-moving trait (how much load an athlete can absorb): weight chronic HRV-baseline stability and fitness/training-age most, then chronic sleep adequacy and age. Modulates the acceptable-load ceiling and deload sensitivity — it does not drive the daily call.',
    value: { weights: { hrvStability: 3, chronicSleep: 2, fitness: 2, age: 1 }, cadence: 'weekly' },
    evidenceLevel: 'L4',
    source: 'Composite heuristic: HRV stability (Plews et al. 2013, Sports Medicine), sleep (Walsh et al. 2021), fitness buffers load (training-status reviews)',
    confidence: 'moderate',
    lastReviewed: '2026-06-29',
    appliesTo: ['readiness', 'recovery']
  },
  {
    id: 'index.consistency',
    rule: 'Consistency = adherence (completed vs planned sessions) weighted above data completeness (days logged), with routine regularity reserved for when sleep/training timing is captured. High consistency supports progressive overload and raises confidence; low biases conservative.',
    value: { weights: { adherence: 3, dataCompleteness: 2, routineRegularity: 1 }, windowDays: 14, cadence: 'weekly' },
    evidenceLevel: 'L4',
    source: 'Athlete-monitoring practice (adherence + monitoring compliance); Saw, Main & Gastin 2016 (self-report implementation)',
    confidence: 'moderate',
    lastReviewed: '2026-06-29',
    appliesTo: ['readiness']
  }
];

export default ENTRIES;
