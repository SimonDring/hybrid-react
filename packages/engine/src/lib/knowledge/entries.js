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
export const KNOWLEDGE_SET_VERSION = '1.44.0'; // 1.44.0 (2026-07-16, Phase 3 M6(c) phase 1 — D6 Training Strategy, intervention-class knowledge): new governed data/interventionClass.js — the committed training CLASS per physical quality (maxStrength→heavy-compound, robustness→heavy-slow-resistance, reactiveStrength→plyometric-ssc, explosiveStrength→ballistic-power, …), seed-labelled with confidence + citations (KA Domain 6/3). Consumed by the NEW D6 Strategy object (lib/strategy/strategy.js, deriveStrategy) — a typed develop/maintain map at intervention-class granularity (02 §2.6; EDS D6). PARALLEL v0: like D4/D5/D7's advisory rollout, D6 Strategy steers NOTHING yet (resolvePeriodization + sessionBuilder produce the plan), so every golden is BYTE-IDENTICAL BAR the knowledgeSetVersion stamp — the new knowledge table bumps KSV, the parallel object emits nothing into the plan. Wiring D6 into selection is a later reviewed flip; D8 (microcycle) is phase 2. // 1.43.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROW 9, sport-support load magnitudes): the GLOBAL sport-load defaults relocated VERBATIM from lib/strength/sportLoad.js into the governed data/sportLoadDefaults.js (SPORT_LOAD) — the goal factor ({build_base 1.0, get_stronger 0.90, stay_durable 1.0}), the volume floor/ceil (0.5 / 1.0), and the sport-day trim (≤2 1.0 / 3 0.92 / 4 0.85 / ≥5 0.78). C3 / Art 17: how hard the gym pulls back to SUPPORT a trained sport is coaching knowledge. The per-sport systemic factor was already an authored SKB fact (gymSupport.systemicFactor). VALUES UNCHANGED. NO PLAN DELTA — sport archetypes byte-identical BAR the knowledgeSetVersion stamp (new governed data file → ratchet bump). // 1.42.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROWS 12 + 3, shape upgrades): ROW 12 — LIGHT_STRENGTH_MAINS (data/doseSchemes.js), the one dose scheme that lacked an evidence block, now carries one (via the ev() helper, low confidence — a barbell-unavailable hypertrophy-range substitution stopgap); `_evidence` is not an intent key so scheme() is unchanged. ROW 3 — the fall-back modality-similarity distance (data/exerciseSimilarity.js modalitySim) is now the NAMED SEED constant MODALITY_SIM_DEFAULT with a seed/confidence label (Art 13; steers substitution ranking only, a soft input). VALUES UNCHANGED (0.4; the light-strength schemes). NO PLAN DELTA — every golden byte-identical BAR the knowledgeSetVersion stamp (two governed data tables gained provenance metadata → ratchet bump). // 1.41.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROW 1 cont.): the remaining sessionBuilder steering magnitudes relocated VERBATIM — the per-set minute costs by role (primary 2.8 / iso-core-calf 1.2 / accessory 1.5) + the session-focus labelling thresholds (meaningfulFraction 0.25 / coreDominance 0.5) into data/sessionBuilding.js (SESSION_BUILDING.perSetMinByRole / .focusLabel), and the supportive-finisher relevance ranking (priority 3 / sportTag 2 / goalTag 1 / mobilityFallback 0.5) into data/selectionScoring.js (SELECTION_SCORING.finisherRelevance). C3 / Art 17. VALUES UNCHANGED. NO PLAN DELTA — every golden byte-identical BAR the knowledgeSetVersion stamp (two governed data files gained entries → ratchet bump). Row 1 is now substantially closed (SESSION_CEILING_MIN 75 stays — governed at the pin per audit 05 §3). // 1.40.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROW 1 subset, session-assembly time budgets): the four session-building time caps (finisherTargetMin 30 / finisherCapMin 15 / hypertrophyIsoCapMin 12 / secondaryCapMin 10) RELOCATED VERBATIM from lib/session/sessionBuilder.js into the governed data/sessionBuilding.js (SESSION_BUILDING) — commitment C3 / Art 17: how many minutes of supportive/corrective work a session adds is programming knowledge, not engine logic. VALUES UNCHANGED. NO PLAN DELTA — every golden byte-identical BAR the knowledgeSetVersion stamp (new governed data file → ratchet bump). First subset of closure §3 row 1 (the ~30 sessionBuilder magnitudes); the rest (selection-scoring weights, region thresholds) follow in later row-1 batches. // 1.39.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROW 7b, engineSport cohort facts): the two remaining sport-fact code Sets are now DERIVED from authored binding flags — D11_SPORTS (run, cycle; the D11-rating-steered endurance buckets, sessionBuilder.js) from data/sportEngineBinding.js `d11Steered`, and SSC_SPORTS (run; the SSC-screened impact-locomotion bucket, data/qualityMovementMap.js) from `sscScreened`. C3 / Art 17 (TR-12): a sport's cohort is authored knowledge, not a hardcoded engine Set. MEMBERSHIP UNCHANGED (D11 = {run, cycle}, SSC = {run}) — verified by direct assertion; NO PLAN DELTA, every golden byte-identical BAR the knowledgeSetVersion stamp (sportEngineBinding.js gained the flags → ratchet bump). Row 7 is now COMPLETE (7 + 7b). // 1.38.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROW 7, category-led cohort fact): the CATEGORY-LED sport membership (swimming, hurling, gaelic_football, field_hockey, soccer, rugby, triathlon) is now an AUTHORED SKB FACT — each profile's meta.cohorts.categoryLed — and lib/session/categoryCoverage.js DERIVES the set from the SKB instead of a hardcoded code Set. C3 / Art 17 (the Art-17 falsification TR-12 named): a sport's cohort membership is KNOWLEDGE, so adding a category-led sport is now an SKB authoring change, not a code-set edit. The 4 rating-based sports (cycling, running_sprint/middle/long) carry no flag (absence = rating-based). MEMBERSHIP UNCHANGED — the same 7 sports; NO PLAN DELTA, every golden byte-identical BAR the knowledgeSetVersion stamp (7 SKB JSON files gained the meta.cohorts fact → ratchet bump). The engineSport-keyed siblings D11_SPORTS + SSC_SPORTS (run/cycle) are row 7b, deferred (they need the skbSport→engineSport binding derivation). The 04 §3 C3 closure list shrinks again. // 1.37.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROWS 11 + 6): ROW 11 — the runtime reflow's load-response effect magnitudes (minimal_effective_volume 0.6 / taper 0.55 / priming_only 0.4 / reduce_one_step 0.85 / withhold 0.2) RELOCATED VERBATIM from lib/sportKnowledge/reflowAdjust.js into the governed data/reflowEffects.js (REFLOW_EFFECT_MAGNITUDES) — C3 / Art 17: a load magnitude is coaching knowledge; the arithmetic (min/multiply/≤1 clamp) stays engine Calculation. ROW 6 — the v2 readiness weights + capacityModulation are now READ from the governed KB entry index.readiness.weights (the SINGLE operative source), retiring the decorative code copy in lib/indices/readinessIndex.js (the KV-2 governed-entry-as-decoration drift class; Art 13). ALL VALUES UNCHANGED. NO PLAN DELTA — reflow magnitudes + readiness feed the RUNTIME band, not the baseline plan, so every golden is byte-identical BAR the knowledgeSetVersion stamp (row 11 adds a governed data file → ratchet bump; row 6 is lib-only, no content change). The 04 §3 C3 closure list shrinks by two more. // 1.36.0 (2026-07-16, Phase 3 M6(a) governance sweep — closure §3 ROW 10): the season-phase detection cut-points RELOCATED from lib/plan/periodization.js into the governed data/periodizationDefaults.js (SEASON_PHASE_CUTOFF_DAYS = {in:56, pre:120}) — commitment C3 / Art 17: the off→pre→in phase boundaries are coaching KNOWLEDGE, not engine logic, so a sports scientist can review the windows (≤8-week race window: Bosquet 2007 / Travis & Mujika 2020 taper-peaking; ~17-week pre-season: Issurin 2010 preparatory mesocycle) without opening the engine. VALUE UNCHANGED (56/120); NO PLAN DELTA — knowledge relocation only; every golden byte-identical BAR the knowledgeSetVersion stamp. First row of the P2-10 governance sweep; the 04 §3 C3 closure list shrinks by one. // 1.35.0 (2026-07-15, Phase 3 M2 T5 — progression extended to SPORTS gym-support): one new governed PROGRESSION entry, progression.sport_support — a sport athlete's gym work SUPPORTS the sport, so progression is SEASON-SHAPED (07-PROGRESSION §2.6, the season level; Constitution Art 2 — the gym serves the sport). The SKB seasonalModel already shapes the BASELINE plan; creep advances the gym strength work only WITHIN the phase the baseline chose, and — critically — it NEVER re-introduces a season/calendar effect into the runtime reflow (the M0 reflow≡baseline invariant stays intact: season shapes baseline, reflow is live-state-only). Only the OFF-SEASON builds (value.creepSeasons ['off']); it load-creeps the maxStrength compound like a powerlifter but at ~0.75%/completed working week — HALF powerlifting's 1.5% (gym-support volume is lower and secondary to the sport; Rønnestad & Mujika 2014 heavy-low-volume support). In pre-season (a volume-taper window), in-season (maintain), and transition (recover) the MAINTENANCE CEILING holds: creep is suppressed entirely — holding capability under rising sport load IS the progression, chasing gym PRs mid-season is the regression (§2.6). No new mechanism: the code (lib/strength/progressionCreep.js) resolves style==='sport' to the synthetic 'sportSupport' creep discipline (added to CREEP_DISCIPLINES) and reads the season off the same program.season the baseline used, so baseline and a reshaped reflow carry the identical creep — no per-week calendar leak. Accessories reuse progression.double_progression unchanged. Golden delta: OFF-SEASON sport archetypes ONLY move (progressive compound load, warm-up ramps + estimated labels, double-progressed accessory reps); pre/in/transition sport archetypes and every build/injured/measured archetype byte-identical bar the knowledgeSetVersion stamp. Confidence 'low' — honest-but-unvalidated (SR-11; WP-59 outcome loop). // 1.34.0 (2026-07-15, Phase 3 M2 T4 — progression extended to OLYMPIC): olympic is INTENSITY-LED (unlike hypertrophy's reps-first model, T3) — the classic lifts and their derivatives advance by LOAD on low reps, so olympic routes through the SAME load-creep + programmed-warm-up-ramp path T2 built for powerlifting, not T3's reps-first path. Two entries extended, no new mechanism: progression.estimator_creep gains an `explosiveStrength` rate (1.0%/completed working week — MORE conservative than powerlifting's maxStrength 1.5%, because near-maximal technical singles/doubles carry higher technical-breakdown risk than a submaximal powerlifting compound — Bompa & Haff periodization; Zatsiorsky & Kraemer technical-lift load progression); progression.warmup_ramp gains a `byAdaptation.explosiveStrength` override — a FINER 4-step ascent (40/55/70/85%, tapering to singles) than the generic 3-step ramp, because this is precisely where SR-10 (no cold near-maximal single off an activation-only primer) matters most: a technical near-maximal single/double needs a real programmed ascent, not a coarse jump. CREEP_DISCIPLINES gains 'olympic'. Conservative per 🔒 1: rate deliberately UNDER powerlifting's, ramp deliberately FINER-GRAINED. Golden delta: the olympic-discipline archetype (build·olympic·advanced·4d) ONLY moves; every other archetype (powerlifting/hypertrophy/sport/injured/measured) byte-identical bar the knowledgeSetVersion stamp. Confidence 'low' — honest-but-unvalidated (SR-11; WP-59 outcome loop). // 1.33.0 (2026-07-15, Phase 3 M2 T3 — progression extended to HYPERTROPHY): one new governed PROGRESSION entry, progression.reps_first_model — declares that hypertrophy's rep-range emphasis runs the REPS-FIRST double-progression model (climb reps toward the top of the range before ever touching load) on BOTH primary and accessory working items, unlike powerlifting's load-creep-on-primaries model (T2). No new mechanism: the code (lib/strength/progressionCreep.js) routes hypertrophy's primary role through the SAME double-progression path T2 already built for accessories (progression.double_progression — repStepPerWeek 1, rangeTopDelta 4), reusing that entry unchanged. CREEP_DISCIPLINES gains 'hypertrophy'. Conservative per 🔒 1: no load component at all for hypertrophy this task (hold-biased; reps only). Golden delta: the hypertrophy-discipline archetypes ONLY move (build·bodybuilding·* and build·hypertrophy·* — bodybuilding strengthStyle resolves to the hypertrophy discipline per the WP-49 T6 flip); every other archetype (incl. all powerlifting/olympic/sport/injured/measured archetypes) byte-identical bar the knowledgeSetVersion stamp. Confidence 'low' — honest-but-unvalidated (SR-11; WP-59 outcome loop). // 1.32.0 (2026-07-15, Phase 3 M2 T2 — progression core, POWERLIFTING only): three governed PROGRESSION entries author the estimator-driven creep the non-logging athlete finally gets (SR-01/G9) — progression.estimator_creep (conservative minimum-effective weekly LOAD-creep rate per adaptation; maxStrength authored 1.5%/completed working week, the powerlifting compound advances at this within a block), progression.double_progression (accessory reps→load thresholds: +1 rep/completed week to a +4 range top, then load steps), progression.warmup_ramp (programmed near-maximal ascent — closes SR-10; 40→60→80% before the top set). The code READS these (lib/strength/progressionCreep.js); it hard-codes no rate. Creep is a PURE function of completion-history × governed-knowledge × plan_start_date priors, GATED to the powerlifting discipline (hypertrophy/olympic/sports unchanged — T3–T5). Golden delta: powerlifting archetypes ONLY move (progressive compound load, double-progressed accessory reps, warm-up ramps + estimated labels); every non-PL archetype byte-identical. Confidence 'low' — these estimator rates are honest-but-unvalidated (SR-11; the WP-59/outcome loop validates them). // 1.31.0 (2026-07-13, P0-6 quality-projection fix): data/sportQualityMap.js — strengthEndurance gains its missing IDENTITY mapping (it IS a Performance-Model quality; rugby authors it at importance 7 and the projection silently dropped it — engine audit 04 §B3), and the projection now DECLARES authored-but-unprojected SKB demand via the droppedDemands honesty ledger (demandProfile.js droppedDemandsFor, carried on the Performance Model output — Art 15). Golden delta: rugby ONLY — meta.diagnosis.limitingFactors gains a magnitude-0 strengthEndurance row (demand met); sessions byte-identical; every other archetype unchanged. // 1.30.0 (2026-07-09, sport-enum onboarding fix): data/sportEngineBinding.js exports ENGINE_SPORT_IDS — the distinct engineSport set the binding produces — so the app's onboarding validation derives its accepted-sport list instead of hand-copying it (was ['run','cycle','swim'], stale → triathlon + the 5 team/field sports rejected on save). Additive derived export; the engineSport set + all plan output are byte-identical (golden-master unchanged). // 1.29.0 (2026-07-09, retire-legacy P3): the 5 team/field sports (rugby, soccer, gaelic_football, hurling, field_hockey) season-phased — off-season floors emphasis + a round-out that trains each sport's derived under-developed patterns (soccer/GAA/hockey→upper; rugby already balanced→none); in-season keeps the sport-specific vector. All 11 sports now on the season-phased standard. // 1.28.0 (2026-07-09, retire-legacy P2): priorityExercises DERIVED from each sport's exerciseLibrary (ranked by transferToSportRating, phase-suitable) — the duplicated gymSupport.priorityExercises lists are deleted (single source). Changes selection for sport plans. // 1.27.0 (2026-07-09, retire-legacy P1 complete): the legacy data/sportGymSupport/ layer is DELETED — the SKB gymSupport section is the sole source for sport gym-support data. Generic season-volume + block-template defaults moved to data/periodizationDefaults.js. Byte-identical (golden-master unchanged bar the stamp). 1.26.0 (2026-07-09, retire-legacy P1): each SKB profile gains a `gymSupport` section — the season-invariant gym-support data (emphasis fallback, priorityExercises, power, systemicFactor, seasonVolume, periodization block templates, keyMuscles) RELOCATED VERBATIM from the legacy data/sportGymSupport modules. The engine (program/sportLoad/periodization/constraints) now reads the SKB (legacy kept as fallback this step). Byte-identical (golden-master unchanged bar the stamp). 1.25.0 (2026-07-09, season-phased SKB — endurance sports migrated): running_sprint/long, cycling, swimming, triathlon seasonalModel.programming authored (off/pre/competition). Off-season floors the emphasis to a rounded base + a round-out session; in-season keeps each sport's specific vector (byte-identical to the legacy emphasis) + no round-out. The round-out target is SPORT-DERIVED: swimmer→lower (squat/hinge/calf), runner/cyclist→upper. movementPolicy still deferred. 1.24.0 (2026-07-09, season-phased SKB — running_middle migrated): running_middle.seasonalModel.{offSeason,preSeason,competition}.programming authored — off-season floors the emphasis to a rounded base + a round-out session (roundOut derive/develop) that trains the sport's under-developed patterns (push/pull); in-season keeps the sport-specific narrow vector + no round-out. First sport on the SKB→generation wire (Approach A). movementPolicy deferred (schema-supported, not yet consumed). 1.23.0 (2026-07-09, season-phased SKB infra): data/movementPatternMap.js — the friendly-vocabulary↔catalogue bridge (MOVEMENT_POLICY_TOKENS, PATTERN_FOR_MUSCLE, expandPolicyToken) that the seasonalModel.programming validator + round-out derivation consume. No plan-output change (no sport authors a programming block yet). 1.22.0 (2026-07-08, SKB audit 08 T1b): SKB content fixes from the literature audit (dormant data — no plan-output change): field_hockey +hand/finger + facial/dental injuries (surveillance completeness) & schemaVersion 1.0→1.0.0; running_sprint +adductor/groin strain; running_middle +ITB syndrome; running_long +proximal hamstring tendinopathy; swimming +Batalha ER:IR reference. 1.21.0 (2026-07-08, SKB audit 08 T1): triathlon gains its OWN gym-support module (data/sportGymSupport/triathlon.js) — a swim+bike+run emphasis blend (back/shoulders floored for the swim leg, chest 0.80 not the runner's 0.55, calves for run durability) with a pull- and shoulder-prehab-led priorityExercises list; sportEngineBinding triathlon→'triathlon' (was 'run'). Before this a triathlete was programmed as a middle-distance runner: no upper body, pressing demoted, trap-bar deadlift most days. Data-only; additive to the golden-master (triathlon was not a fixture). 1.20.0 (2026-07-07, WP-49 Plan 2 T4c part 2): discipline DOSE — a build discipline doses its lifts in its own phase-progressing character (DISCIPLINE_DOSE_QUALITY pins powerlifting→maxStrength, hypertrophy→hypertrophy, olympic→explosiveStrength; doseCharacter.restSec applied) regardless of the per-day diagnosis quality; a discipline now ALWAYS steers (even an already-strong athlete with no capability gap — was falling to the legacy default scheme). 1.19.0 (2026-07-07, WP-49 Plan 2 T4c): build periodisation now comes from the discipline module (powerlifting 12wk / hypertrophy 10wk / olympic 12wk) — resolvePeriodization routes to it; fixed the hypertrophy `off` block (split 3+6 summed to 9 vs declared 10; now 3+7) and the barbell gate expands equipment presets (full_gym counts as barbell). 1.18.0 (2026-07-07, WP-49 Plan 2 T5): secondary-goals accessory injection — the fixed menu (posture/prehab/mobility/conditioning) gains real corrective exercise ids, layered onto the accessory tail only (main work untouched); functional auto-carries conditioning. 1.17.0 (2026-07-07, WP-49 Plan 2 T6 — THE FLIP): build goals route to disciplines (resolveBuildDisciplineId in data/disciplines/index.js: strength→powerlifting, bodybuilding/functional→hypertrophy, olympic→olympic, barbell-gated); the legacy volume-first build path is retired. 1.16.0 (2026-07-07, WP-49 Plan 2 T4b-2): olympic day-emphasis knowledge (LIFT_FAMILIES + day-sequence-by-competed-lift + priority resolver) added to the olympic discipline module. 1.15.0 (2026-07-07, WP-49 Plan 2 T3b): map the `olympic` movement pattern into maxStrength + explosiveStrength (qualityMovementMap) so the discipline-gated classic lifts become selectable — byte-identical for every non-olympic profile. 1.14.0 (2026-07-07, WP-49 Plan 1): secondary-goals menu module. 1.13.0 (2026-07-07, WP-49 Plan 1): hypertrophy/powerlifting/olympic discipline modules. 1.12.0 (2026-07-07, WP-49 Plan 1): Olympic + powerlifting catalogue lifts (discipline-gated). 1.11.0 (2026-07-07, WP-49 Plan 1): discipline knowledge foundation (schema). 1.10.0 (2026-07-07, WP-61): scheduler interference penalties + allocator selection-scoring multipliers extracted to governed data (data/schedulingPolicy.js, data/selectionScoring.js) — scheduling + selection policy is knowledge now, not code literals; values byte-identical. 1.9.0 (2026-07-06, WP-46 completion): governed id-keyed maps PROGRESSION_LIFTS + CORE_HOLDS replace the name-fuzzy plan-path joins (matchLift, core hold regex) — values reproduce the matchers exactly, keyed by exId. 1.8.0 (2026-07-06, WP-58 reconcile): engine capability anchors (STRONG_BW_MULTIPLE) DERIVED from the governed advanced band for every lift×sex — ohp + female deadlift/ohp moved to advanced (one source; parallel-model only, does not steer the live plan). 1.7.0 (2026-07-06, WP-47): governed block-objective priors (data/blockPriors.js) for the D7 ADVISORY block plan — season→objective template, block-length/deload by trajectory×recoverability. 1.6.0 (2026-07-06, WP-58): strength-standards band table brought into the governed set (data/strengthStandards.js) — the app now re-exports it (one source); values unchanged. 1.5.0 (2026-07-06, WP-45): ONE per-exercise muscle table (EXERCISE_MUSCLES) — volume accounting adopts the 14 documented corrections the substitution model already knew (hip-thrust family glute-primary, rear-delt isolations off the lat ledger, triceps-biased presses, long-lever lat pulls). 1.4.0 (2026-07-06, WP-44): governance reconciliation — recovery.bands + volume_modifiers confidence re-reviewed low→moderate (autoregulation evidence; mechanism and rating now agree), authority-mapping scope clarified (decision-level actions vs intra-decision parameters), readiness-v2 entry reconciled with its shipped default-ON reality (validation = WP-59). 1.3.0 (2026-07-06, WP-48): soccer + rugby SKB flagship-authored (NO stubs remain); team-sport library id normalisation (mb_rotational_throw→cable_woodchop etc.) + hurling plyo/upper-body entries; hurling/gaelic_football/field_hockey/soccer/rugby flip to category-led. 1.2.0 (2026-07-06): WP-38 — sport-experience capability priors (capabilityPriors.SPORT_EXPERIENCE) + per-lift strength standards in D1 estimation; WP-42a — goal demand profiles (data/goalDemand.js) so build goals get a real diagnosis. 1.1.0 (2026-07-04): +field_hockey SKB profile; endurance decisionRules structured

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

  // ── Progression: estimator-driven creep (Phase 3 M2 — the non-logging athlete's overload) ──
  // The conservative, minimum-effective fallback progression for an athlete the engine
  // cannot see logging (07-PROGRESSION §2.1/§2.2 fallback; 🔒 1). READ by
  // lib/strength/progressionCreep.js; the code hard-codes no rate. Confidence 'low':
  // these are honest-but-unvalidated estimator rates (SR-11) — the outcome loop (WP-59)
  // is what will validate them. Direction (overload > flat) is strong; magnitude is a
  // calibrated heuristic, so the crept prescription is LABELLED estimated everywhere it
  // surfaces (Art 16) and any logged set displaces it (07-PROGRESSION §2.1).
  {
    id: 'progression.estimator_creep',
    rule: 'Non-logging LOAD creep per adaptation: the conservative minimum-effective week-over-week load advance for a compound, applied once per COMPLETED prior working week WITHIN the block (block-scoped, resets at each phase boundary — 🔒 1 hold-biased). maxStrength (powerlifting compounds) advances the top-set load ~1.5%/completed working week; explosiveStrength (olympic classic lifts + derivatives — T4) advances ~1.0%/completed working week, DELIBERATELY slower than maxStrength: a near-maximal technical single/double carries higher technical-breakdown risk than a submaximal powerlifting compound, so the honest-but-unvalidated estimate holds back further. A deload/taper week never creeps.',
    value: { maxStrength: { weeklyLoadPct: 0.015 }, explosiveStrength: { weeklyLoadPct: 0.01 } },
    evidenceLevel: 'L5',
    source: 'Standard linear/undulating progression practice (Rippetoe starting-strength linear step; RTS/Helms RPE-anchored micro-loading) — the ~1–2%/wk compound step for an intermediate; magnitude internal-conservative (minimum-effective, under-reach on an unobserved athlete — SR-11 unvalidated, WP-59 outcome loop owed). explosiveStrength rate additionally conservative per Olympic-lift technical-load progression practice (Bompa & Haff, Periodization; Zatsiorsky & Kraemer, Science and Practice of Strength Training) — technical mastery, not just tissue tolerance, gates how fast a classic-lift single/double may load.',
    confidence: 'low',
    lastReviewed: '2026-07-15',
    appliesTo: ['progression', 'allocator', 'dose']
  },
  {
    id: 'progression.double_progression',
    rule: 'Accessory double progression (the default for rep-range work — 07-PROGRESSION §2.2): fill the rep range at a fixed load across exposures, then advance the load and reset reps. The non-logging fallback climbs reps by repStepPerWeek per completed working week up to rangeTopDelta above the scheme\'s base reps (the top of the range); the load holds through the climb, then steps at the next block.',
    value: { repStepPerWeek: 1, rangeTopDelta: 4 },
    evidenceLevel: 'L5',
    source: 'Double-progression convention for accessory/rep-range work (Israetel/RP; Helms hypertrophy programming) — climb reps, then load; step + range internal-conservative',
    confidence: 'low',
    lastReviewed: '2026-07-15',
    appliesTo: ['progression', 'allocator', 'dose']
  },
  {
    id: 'progression.warmup_ramp',
    rule: 'Programmed warm-up ramp to near-maximal work (07-PROGRESSION §2.2; closes SR-10): a heavy top set is reached through programmed ascent sets inside the session, never cold off an activation-only primer. Ascending %-of-top-set ramp sets precede the working top set of every loadable primary compound. PER-ADAPTATION override (T4): explosiveStrength (olympic classic lifts + derivatives) is where this matters MOST — a near-maximal technical single/double must never be reached off a coarse 3-step ramp built for a submaximal powerlifting compound, so it gets a FINER 4-step ascent instead, tapering to single-rep sets as it nears the working weight (a true near-maximal technical single is best rehearsed at low reps throughout, not just at the top). Any adaptation without a `byAdaptation` override uses the default `steps`.',
    value: {
      steps: [{ pct: 0.4, reps: 5 }, { pct: 0.6, reps: 3 }, { pct: 0.8, reps: 2 }],
      byAdaptation: { explosiveStrength: [{ pct: 0.4, reps: 3 }, { pct: 0.55, reps: 2 }, { pct: 0.7, reps: 1 }, { pct: 0.85, reps: 1 }] }
    },
    evidenceLevel: 'L5',
    source: 'Standard S&C warm-up ramping to a working top set (Rippetoe warm-up sets; general strength practice) — an injury-risk/quality gap the pin shipped (SR-10); ramp shape is conventional practice. The explosiveStrength override follows standard weightlifting warm-up protocol (Everett, Olympic Weightlifting; Bompa & Haff) — more, smaller jumps in %, singles/doubles throughout rather than higher-rep early ramp sets, because technique at speed is the point even in warm-up',
    confidence: 'low',
    lastReviewed: '2026-07-15',
    appliesTo: ['progression', 'allocator', 'dose']
  },
  {
    id: 'progression.reps_first_model',
    rule: 'Per-adaptation progression MODEL choice (Phase 3 M2 T3): hypertrophy\'s rep-range emphasis means its non-logging fallback runs REPS-FIRST double progression — climb reps toward the top of the range before ever adding load — on its PRIMARY (compound) working items too, not only accessories. This is unlike maxStrength/explosiveStrength, whose primaries load-creep with a programmed warm-up ramp to near-maximal work (there is no "near-maximal single" in hypertrophy training to ramp toward). Listed adaptations reuse progression.double_progression\'s rates unchanged (no separate rep-step/range authored for the primary role — one conservative default for rep-range work, per adaptation).',
    value: { primaryRoleAdaptations: ['hypertrophy'] },
    evidenceLevel: 'L5',
    source: 'Double-progression as the default for rep-range work (Israetel/RP; Helms hypertrophy programming) — hypertrophy training has no near-maximal single to ramp toward, so the load-creep+ramp model built for maxStrength does not transfer; magnitude reuses progression.double_progression (internal-conservative)',
    confidence: 'low',
    lastReviewed: '2026-07-15',
    appliesTo: ['progression', 'allocator', 'dose']
  },
  {
    id: 'progression.sport_support',
    rule: 'Sport gym-support progression (Phase 3 M2 T5; 07-PROGRESSION §2.6 — the SEASON level). A sport athlete\'s gym work SUPPORTS the sport, so progression is season-shaped: the SKB seasonalModel already shapes the BASELINE plan (off-season builds the general base; pre-season is a volume-taper window before competition — Bosquet 2007; in-season protects and maintains under sport load; transition recovers), and estimator-driven creep advances the gym strength work only WITHIN the phase the baseline chose — it never re-introduces any season/calendar effect into the runtime reflow (the M0 reflow≡baseline invariant: season shapes baseline, reflow is live-state-only). Only the OFF-SEASON builds (creepSeasons), and it load-creeps like a powerlifter but at a DELIBERATELY LOWER rate than a dedicated build discipline (gym-support volume is lower and secondary to the sport — Rønnestad & Mujika 2014 heavy-low-volume support): the maxStrength compound top set advances ~0.75%/completed working week (HALF powerlifting\'s 1.5%). In pre-season, in-season, and transition the MAINTENANCE CEILING holds: capability is held, not chased — holding under rising sport load IS the progression and chasing gym PRs mid-season is the regression (Constitution Art 2 — the gym serves the sport). So creep is suppressed entirely there (no load creep, no rep climb) — an in-season flat block is a decided, correct maintenance, never the SR-01 undecided sameness. Accessories in the off-season still double-progress (progression.double_progression, reused unchanged); logged lifts are never crept (measured displaces inferred).',
    value: { adaptation: 'maxStrength', weeklyLoadPct: 0.0075, creepSeasons: ['off'] },
    evidenceLevel: 'L5',
    source: 'Strength-support-for-sport periodisation (Rønnestad & Mujika 2014 — heavy, low-volume in-season maintenance; off-season concurrent base-building) + season-specificity trade (Issurin block periodisation; Bompa/Haff annual plan). Off-season load-creep magnitude reuses the powerlifting maxStrength step (progression.estimator_creep) halved for the lower, sport-secondary gym dose — internal-conservative, honest-but-unvalidated (SR-11; WP-59 outcome loop owed). The maintenance ceiling (no creep pre/in/transition) follows directly from Art 2 (the gym serves the sport) and §2.6 (in-season, held capability is the progression).',
    confidence: 'low',
    lastReviewed: '2026-07-15',
    appliesTo: ['progression', 'allocator', 'dose']
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
