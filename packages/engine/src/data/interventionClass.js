// interventionClass — the committed TRAINING CLASS that develops each physical quality (KA Domain
// 6/3). D6 Strategy (lib/strategy/strategy.js) attaches one to every develop target so the block
// sequence inherits a managed-concurrency plan with a NAMED modality per quality, not a calendar
// template (02 §2.6; EDS D6). This is the "how" a quality is trained, at intervention-class
// granularity — e.g. heavy-slow resistance for tendon robustness, plyometrics for reactive strength.
//
// SEED knowledge (Art 13): each class is the canonical, well-evidenced modality for its quality, but
// it is a soft input to D6 (it steers strategy, never gates). Confidence reflects the evidence base.
// This does not yet steer the live plan (D6 Strategy is a PARALLEL v0 — the same advisory rollout
// blockObjective/D7 shipped on); wiring it into selection is a later, reviewed step.

const cls = (klass, confidence, source) => ({ klass, confidence, source, level: 'seed', needsReview: true });

export const INTERVENTION_CLASS = {
  maxStrength:       cls('heavy-compound',        'high',     'Maximal-force development: high-load (≥85% 1RM) low-rep compound lifting (ACSM 2009; Schoenfeld 2021)'),
  hypertrophy:       cls('moderate-load-volume',  'high',     'Mechanical-tension hypertrophy: 6–12 reps to near-failure, accumulated weekly volume (Schoenfeld 2017)'),
  explosiveStrength: cls('ballistic-power',       'high',     'Rate-of-force-development: high-velocity intent, low reps, full recovery (Haff & Nimphius 2012)'),
  reactiveStrength:  cls('plyometric-ssc',        'high',     'Stretch-shortening-cycle plyometrics: jumps/pogos with short ground contacts (de Villarreal 2009)'),
  strengthEndurance: cls('high-rep-density',      'moderate', 'Local muscular endurance: higher reps, shorter rest, controlled density'),
  robustness:        cls('heavy-slow-resistance', 'high',     'Tissue/tendon load tolerance: heavy-slow resistance + eccentric protocols (Kongsgaard 2009; Beyer 2015)'),
  mobility:          cls('mobility-drill',         'moderate', 'Range-of-motion + loaded end-range control drills'),
  stability:         cls('stability-control',      'moderate', 'Anti-movement / unilateral control work (core + joint stability)'),
  // Cardio qualities are gym-SUPPORTED, not gym-trained directly (cardioGymSupport translates them);
  // real aerobic/anaerobic conditioning is Stage-7 endurance — named here, not built (🔒 10).
  aerobicCapacity:   cls('aerobic-support',        'low',      'Gym support for aerobic economy — heavy strength + reactive/tendon-stiffness work (Rønnestad & Mujika 2014); direct conditioning is Stage 7'),
  anaerobicCapacity: cls('anaerobic-support',      'low',      'Gym support for anaerobic power — maximal-strength + power base; direct interval conditioning is Stage 7'),
};

// The committed class for a quality (or a safe generic default for an unknown quality — seed).
export function interventionClassFor(qualityId) {
  return INTERVENTION_CLASS[qualityId] || cls('general-strength', 'low', 'default class for an unmapped quality (seed)');
}

export default { INTERVENTION_CLASS, interventionClassFor };
