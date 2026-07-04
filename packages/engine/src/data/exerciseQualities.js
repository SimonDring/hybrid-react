/**
 * exerciseQualities — PARALLEL knowledge that tags each exercise by the physical
 * QUALITY/ADAPTATION it develops, its force-velocity profile, and its fatigue cost.
 * The enabler for the diagnosis→plan re-seating (Blueprint W5/S5, EDS §31): the
 * diagnosis speaks in qualities, but the allocator picks by muscle — this is the
 * missing bridge.
 *
 * READ BY NOTHING IN generatePlan. Kept separate from strengthExercises.js (which
 * drives the live plan + both golden masters) exactly like exerciseSimilarity.js, so
 * the generated plan is unaffected. Tags resolve via CLASS rules (reading the flags
 * an exercise already carries) → PATTERN defaults → per-exercise OVERRIDES.
 *
 * Honest seed data: every tag carries evidence.confidence + needsReview:true. It is
 * pattern-derived and awaits an S&C review pass.
 */
import { EXERCISES } from './strengthExercises.js';
import { getQuality } from './qualities.js';

// Controlled force-velocity vocabulary — where an exercise sits on the F–V curve.
export const FORCE_VELOCITY = [
  'maximal-force', 'strength-speed', 'speed-strength', 'ballistic',
  'controlled-hypertrophy', 'endurance', 'isometric', 'mobility',
];

// Fatigue-cost presets by training class (mirrors the qualities.js fatigueCost shape).
const COST = {
  maxForce:    { neural: 'high',     metabolic: 'moderate', mechanical: 'high' },
  specialist:  { neural: 'high',     metabolic: 'low',      mechanical: 'high' },
  olympic:     { neural: 'high',     metabolic: 'moderate', mechanical: 'moderate' },
  plyo:        { neural: 'high',     metabolic: 'low',      mechanical: 'high' },
  hypertrophy: { neural: 'low',      metabolic: 'high',     mechanical: 'moderate' },
  endurance:   { neural: 'low',      metabolic: 'moderate', mechanical: 'moderate' },
  isometric:   { neural: 'moderate', metabolic: 'low',      mechanical: 'low' },
  mobility:    { neural: 'low',      metabolic: 'low',      mechanical: 'low' },
};

// Default quality/force-velocity/cost per MOVEMENT PATTERN — the baseline an exercise
// inherits when no class rule or override applies.
const PATTERN_TAGS = {
  squat: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  // H9 C2-completion: robustness is PRIMARY for the loaded hinge — heavy hinge work is
  // the canonical posterior-chain tissue-tolerance driver (heavy-slow resistance:
  // Kongsgaard 2009; eccentric loading for injury prevention: Lauersen 2014), matching
  // the nordic_curl override below and the robustness movement map (hinge listed
  // first, eccentric-emphasis). As robustness-secondary, heavy hinges tied at tier 2
  // with carries and the max()-collapsed fatigue denominator (review F7) let a light
  // carry outrank — and ANCHOR the session over — an RDL.
  hinge: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'robustness', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  // H9 review C2: robustness secondary added — unilateral loaded work is a tissue-
  // tolerance staple, and the robustness movement map requires the lunge pattern.
  lunge: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'stability', role: 'secondary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  hpush: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  vpush: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.maxForce, confidence: 'moderate' },
  hpull: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  vpull: { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'hypertrophy', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  carry: { qualities: [{ id: 'strengthEndurance', role: 'primary' }, { id: 'stability', role: 'secondary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'endurance', fatigueCost: COST.endurance, confidence: 'low' },
  core:  { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'isometric', fatigueCost: COST.isometric, confidence: 'moderate' },
  calf:  { qualities: [{ id: 'strengthEndurance', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'endurance', fatigueCost: COST.endurance, confidence: 'low' },
  iso:   { qualities: [{ id: 'hypertrophy', role: 'primary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'low' },
  mobility: { qualities: [{ id: 'mobility', role: 'primary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'mobility', fatigueCost: COST.mobility, confidence: 'moderate' },
};

// Cross-cutting CLASS rules — read the flags an exercise already carries rather than
// re-guess. Checked before the pattern default; the first match wins.
function classTag(ex) {
  if (ex.loadClass === 'health' || ex.pattern === 'mobility')  // prehab / activation / foam-roll
    return { qualities: [{ id: 'mobility', role: 'primary' }, { id: 'stability', role: 'secondary' }], forceVelocity: 'mobility', fatigueCost: COST.mobility, confidence: 'moderate' };
  if (ex.quality === 'power')  // plyometric / ballistic
    return { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'reactiveStrength', role: 'secondary' }], forceVelocity: 'ballistic', fatigueCost: COST.plyo, confidence: 'moderate' };
  if (ex.quality === 'strength')  // heavy specialist variant
    return { qualities: [{ id: 'maxStrength', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.specialist, confidence: 'moderate' };
  if (ex.quality === 'hypertrophy')  // isolation accent
    return { qualities: [{ id: 'hypertrophy', role: 'primary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy, confidence: 'moderate' };
  if (ex.loadClass === 'isoCore')  // anti-movement trunk work
    return { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'isometric', fatigueCost: COST.isometric, confidence: 'moderate' };
  return null;  // → pattern default
}

// Per-exercise OVERRIDES — the true exceptions the class/pattern logic gets wrong.
// Each is a PARTIAL object merged over the derived base (only listed keys change).
const OVERRIDES = {
  // Olympic derivatives: strength-speed, and they carry a max-strength demand.
  hang_clean:  { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'strength-speed', fatigueCost: COST.olympic },
  power_clean: { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'strength-speed', fatigueCost: COST.olympic },
  // Depth / pogo / bounding: stretch-shortening-cycle dominant → reactiveStrength lead.
  depth_jump:      { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  double_leg_pogo: { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  sl_pogo_jump:    { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  bounding_a_skip: { qualities: [{ id: 'reactiveStrength', role: 'primary' }, { id: 'explosiveStrength', role: 'secondary' }] },
  // Sled push: horizontal acceleration → speed-strength.
  sled_push: { forceVelocity: 'speed-strength' },
  // KB swing: ballistic hip hinge — explosive, not a maximal-force grind.
  kb_swing: { qualities: [{ id: 'explosiveStrength', role: 'primary' }, { id: 'strengthEndurance', role: 'secondary' }], forceVelocity: 'ballistic', fatigueCost: COST.plyo, confidence: 'moderate' },
  // Prehab / cuff / hip-stability isolations mis-default to hypertrophy → stability/robustness.
  face_pull:             { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  band_face_pull:        { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  sl_ext_rotation:       { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  cable_ext_rotation_90: { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  lateral_band_walk:     { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  sl_hip_abduction:      { qualities: [{ id: 'stability', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.mobility, confidence: 'moderate' },
  tibialis_raise:        { qualities: [{ id: 'strengthEndurance', role: 'primary' }, { id: 'robustness', role: 'secondary' }], forceVelocity: 'endurance', fatigueCost: COST.endurance, confidence: 'moderate' },
  // Nordic / glute-ham raise: eccentric hamstring robustness is the headline.
  nordic_curl:     { qualities: [{ id: 'robustness', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.specialist, confidence: 'moderate' },
  glute_ham_raise: { qualities: [{ id: 'robustness', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'maximal-force', fatigueCost: COST.specialist, confidence: 'moderate' },
  // Machine vertical pull: rep-capped, not a maximal grind → hypertrophy lean.
  lat_pulldown: { qualities: [{ id: 'hypertrophy', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }], forceVelocity: 'controlled-hypertrophy', fatigueCost: COST.hypertrophy },
  // Ab-wheel: loaded trunk flexion under tension — more than a stability hold.
  ab_wheel: { qualities: [{ id: 'stability', role: 'primary' }, { id: 'maxStrength', role: 'secondary' }, { id: 'robustness', role: 'secondary' }] },
};

const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// Union the adaptations that develop the tagged qualities (via the quality registry).
function adaptationsFor(qualities) {
  const set = new Set();
  for (const q of qualities) {
    const reg = getQuality(q.id);
    if (reg && Array.isArray(reg.adaptations)) for (const a of reg.adaptations) set.add(a);
  }
  return [...set];
}

/**
 * exerciseQualities — the physical-quality tag for an exercise id.
 * @returns { qualities:[{id,role}], adaptations:string[], forceVelocity:string,
 *            fatigueCost:{neural,metabolic,mechanical}, evidence:{level,confidence,source,needsReview} }
 *          or null for an unknown id.
 */
export function exerciseQualities(id) {
  const ex = EX_BY_ID.get(id);
  if (!ex) return null;
  const base = classTag(ex) || PATTERN_TAGS[ex.pattern] || PATTERN_TAGS.iso;
  const ov = OVERRIDES[id] || {};
  const qualities = (ov.qualities || base.qualities).map((q) => ({ ...q }));
  return {
    qualities,
    adaptations: adaptationsFor(qualities),
    forceVelocity: ov.forceVelocity || base.forceVelocity,
    fatigueCost: { ...(ov.fatigueCost || base.fatigueCost) },
    evidence: { level: 'seed', confidence: ov.confidence || base.confidence || 'low', source: 'pattern-derived seed (Sprint 5)', needsReview: true },
  };
}

export default { exerciseQualities, FORCE_VELOCITY };
