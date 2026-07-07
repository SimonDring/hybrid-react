/**
 * doseSchemes — the platform's DOSE MODEL as governed knowledge (WP-14, the D12
 * enabler): rep/RPE schemes keyed by (scheme key, phase), plus rest, power dosing,
 * and the iso/core set strings. Extracted VERBATIM from allocator.scheme() and its
 * sibling constants — the audit's largest single knowledge leak (§4.2): "the thing
 * a coach would most want to review" lived as code literals.
 *
 * KEYS. Where the style→quality mapping is scientifically true, the key IS the
 * quality id (maxStrength ← 'strength' style; hypertrophy ← 'bodybuilding').
 * 'strengthEndurance' carries the old 'functional' scheme (a GPP strength blend —
 * the closest quality home; tagged low confidence). 'sportSupport' is deliberately
 * NOT a quality: it is the legacy sport style's composite scheme, kept transitional
 * until WP-21 doses D11 sessions from each session's target quality (using
 * qualities.js doseResponse + the staged H9 C6–C8 corrections).
 *
 * The STYLE_SCHEME_BRIDGE reproduces the old style-keyed behaviour exactly —
 * golden masters prove byte-identity through the bridge.
 *
 * PHASES. base | build | peak (mesocycle intents), plus deload (drop volume AND
 * intensity — recovery) and taper (drop volume, KEEP intensity — peaking; Bosquet
 * 2007, Travis & Mujika 2020: reduce volume ~40–60%, maintain intensity).
 */

const ev = (confidence, source) => ({ level: 'seed', confidence, source, needsReview: true });

// ── Rep/RPE schemes by (scheme key, phase) ────────────────────────────────────
export const DOSE_SCHEMES = {
  maxStrength: {   // ← 'strength' style
    base:   { main: '4 × 5', acc: '3 × 8', mainRpe: 'RPE 7', accRpe: 'RPE 7' },
    build:  { main: '4 × 4', acc: '3 × 6', mainRpe: 'RPE 8', accRpe: 'RPE 7→8' },
    peak:   { main: '4 × 3', acc: '3 × 5', mainRpe: 'RPE 8→9', accRpe: 'RPE 8' },
    deload: { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' },
    taper:  { main: '2 × 3', acc: '2 × 4', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
    evidence: ev('moderate', 'Block-periodised strength dosing (Issurin); RPE/RIR autoregulation (Helms 2016)')
  },
  hypertrophy: {   // ← 'bodybuilding' style
    base:   { main: '3 × 12', acc: '3 × 12', mainRpe: 'RPE 7', accRpe: 'RPE 8' },
    build:  { main: '4 × 10', acc: '3 × 12', mainRpe: 'RPE 8', accRpe: 'RPE 8→9' },
    peak:   { main: '4 × 8', acc: '3 × 10', mainRpe: 'RPE 8→9', accRpe: 'RPE 9' },
    deload: { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' },
    taper:  { main: '2 × 6', acc: '2 × 8', mainRpe: 'RPE 8', accRpe: 'RPE 8' },
    evidence: ev('moderate', 'RP mesocycle dosing (Israetel); hypertrophy rep ranges (Schoenfeld 2017 — see H9 C8 for the staged widening)')
  },
  strengthEndurance: {   // ← 'functional' style (GPP strength blend — closest quality home)
    base:   { main: '3 × 8', acc: '3 × 10', mainRpe: 'RPE 7', accRpe: 'RPE 7' },
    build:  { main: '4 × 6', acc: '3 × 8', mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
    peak:   { main: '3 × 5', acc: '3 × 6', mainRpe: 'RPE 8', accRpe: 'RPE 8' },
    deload: { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' },
    taper:  { main: '2 × 4', acc: '2 × 6', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
    evidence: ev('low', 'Internal GPP blend (Kraemer/Ratamess general-adaptation window); bridged verbatim from the functional style')
  },
  sportSupport: {   // ← 'sport' style — TRANSITIONAL composite, replaced by per-quality dosing in WP-21
    base:   { main: '3 × 5', acc: '3 × 8', mainRpe: 'RPE 7', accRpe: 'RPE 6' },
    build:  { main: '4 × 4', acc: '3 × 8', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
    peak:   { main: '4 × 3', acc: '3 × 6', mainRpe: 'RPE 8→9', accRpe: 'RPE 7→8' },
    deload: { main: '2 × 4', acc: '2 × 6', mainRpe: 'RPE 5', accRpe: 'RPE 5' },
    taper:  { main: '2 × 3', acc: '2 × 5', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
    evidence: ev('moderate', 'Strength-support-for-sport dosing (Rønnestad & Mujika 2014 heavy-low-volume); lower accessory RPE protects the sport (EDS L1)')
  },
  robustness: {   // HSR — reviewed (H9 C6): heavy-slow resistance for tendon/tissue tolerance
    base:   { main: '3 × 8', acc: '3 × 10', mainRpe: 'RPE 7', accRpe: 'RPE 7', mainNote: '3 s down, 3 s up — heavy, tendon-loading tempo' },
    build:  { main: '4 × 8', acc: '3 × 10', mainRpe: 'RPE 7→8', accRpe: 'RPE 7', mainNote: '3 s down, 3 s up — heavy, tendon-loading tempo' },
    peak:   { main: '4 × 6', acc: '3 × 8', mainRpe: 'RPE 8', accRpe: 'RPE 7', mainNote: '3 s down, 3 s up — heavy, tendon-loading tempo' },
    deload: { main: '2 × 8', acc: '2 × 10', mainRpe: 'RPE 6', accRpe: 'RPE 6' },
    taper:  { main: '2 × 6', acc: '2 × 8', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
    evidence: { level: 'reviewed', confidence: 'moderate', source: 'HSR for tendon load tolerance — Kongsgaard 2009; Beyer 2015 (HSR ≥ eccentric, tendinopathy); H9 review C6', needsReview: false }
  },
  explosiveStrength: {   // strength-speed — low reps, sub-max RPE, bar speed is the point
    base:   { main: '4 × 3', acc: '3 × 6', mainRpe: 'RPE 7', accRpe: 'RPE 7' },
    build:  { main: '5 × 3', acc: '3 × 6', mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
    peak:   { main: '4 × 2', acc: '3 × 5', mainRpe: 'RPE 8', accRpe: 'RPE 7→8' },
    deload: { main: '2 × 3', acc: '2 × 6', mainRpe: 'RPE 6', accRpe: 'RPE 6' },
    taper:  { main: '3 × 2', acc: '2 × 5', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
    evidence: { level: 'reviewed', confidence: 'moderate', source: 'Strength-speed dosing (Haff & Nimphius 2012); power-quality exercises take POWER_DOSE', needsReview: false }
  },
  reactiveStrength: {   // reactive sessions are mostly power-quality items (POWER_DOSE); this doses the rest
    base:   { main: '4 × 4', acc: '3 × 8', mainRpe: 'RPE 7', accRpe: 'RPE 6' },
    build:  { main: '4 × 4', acc: '3 × 8', mainRpe: 'RPE 7', accRpe: 'RPE 6→7' },
    peak:   { main: '4 × 3', acc: '3 × 6', mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
    deload: { main: '2 × 4', acc: '2 × 6', mainRpe: 'RPE 5', accRpe: 'RPE 5' },
    taper:  { main: '2 × 3', acc: '2 × 5', mainRpe: 'RPE 7', accRpe: 'RPE 7' },
    evidence: { level: 'reviewed', confidence: 'moderate', source: 'Plyometric session dosing + contact ceilings — de Villarreal 2009; H9 review C7', needsReview: false }
  },
};

// Session foot-contact ceilings for reactive/plyometric work (H9 C7 — de Villarreal
// 2009): total jump contacts per session by training age. The 48–72 h spacing half of
// C7 belongs to the scheduler (D13) — recorded there, not here.
export const REACTIVE_LIMITS = {
  footContacts: { beginner: 80, intermediate: 100, advanced: 120 },
  // 48–72 h between plyometric exposures (tendon/SSC recovery). The scheduler treats
  // ADJACENT days (<48 h) as a spacing violation and pays this penalty — same family
  // as its heavy-axial spine rule; ≥2 calendar days apart satisfies the window.
  spacing: { minHours: 48, maxHours: 72, schedulerPenaltyAdjacent: 9 },
  evidence: { level: 'reviewed', confidence: 'moderate', source: 'de Villarreal 2009 (meta): moderate volumes suffice; 48–72 h between sessions; H9 review C7', needsReview: false }
};

/**
 * D12 dose lookup by TARGET QUALITY (WP-21): the scheme block for a session whose D9
 * objective names `quality`, or null when the quality has no block — the caller falls
 * back to its style-bridged scheme. deload/taper resolve inside the block (taper wins).
 */
export function doseForQuality(quality, intent, { deload = false, taper = false } = {}) {
  const q = DOSE_SCHEMES[quality];
  if (!q) return null;
  if (taper) return q.taper;
  if (deload) return q.deload;
  return q[intent] || q.base;
}

// The legacy style vocabulary → scheme key. Unknown styles fall back exactly as the
// old table did (→ the functional scheme).
export const STYLE_SCHEME_BRIDGE = {
  strength: 'maxStrength',
  bodybuilding: 'hypertrophy',
  functional: 'strengthEndurance',
  sport: 'sportSupport',
};
export const DEFAULT_SCHEME_KEY = 'strengthEndurance';

// WP-49 T4c: a build DISCIPLINE doses its lifts in its own character, regardless of the per-day
// diagnosis quality — a powerlifter's bench is always heavy low-rep, not whatever quality the
// diagnosis targets that session. Each discipline pins to the canonical, phase-progressing quality
// scheme above whose rep/RPE ramp implements its doseCharacter range (powerlifting 1-5 ← maxStrength
// 5→4→3; hypertrophy 6-12 ← hypertrophy 12→10→8; olympic 1-3 ← explosiveStrength 3→3→2). The exact
// rest comes from the discipline module's doseCharacter (looked up in the allocator).
export const DISCIPLINE_DOSE_QUALITY = {
  powerlifting: 'maxStrength',
  hypertrophy: 'hypertrophy',
  olympic: 'explosiveStrength',
};

// Max-strength mains need a barbell: with only dumbbells/bodyweight a 4×4 @ RPE 8
// cannot be loaded heavily enough to mean anything — shift mains to a strength-
// hypertrophy range the equipment can actually train (RPE strings unchanged).
export const LIGHT_STRENGTH_MAINS = {
  base: { main: '4 × 8', acc: '3 × 10' },
  build: { main: '4 × 8', acc: '3 × 10' },
  peak: { main: '4 × 6', acc: '3 × 8' },
  fallback: { main: '4 × 8', acc: '3 × 10' },
};

// ── Power / plyometric dose (quality-dosed, never the role scheme) ────────────
// Low reps, sub-maximal RPE (quality not failure), full recovery; exempt from the
// female rep bump — this is how jumps/cleans develop rate-of-force-development.
// (Session foot-contact ceilings are the staged H9 C7 correction.)
export const POWER_DOSE = {
  sets: '4 × 4', rpe: 'RPE 7', restSec: 150,
  note: 'explosive — move fast, full recovery; stop the set if speed drops',
  evidence: ev('moderate', 'Plyometric/ballistic dosing convention (de Villarreal 2009; Haff & Nimphius 2012)')
};

// ── Rest prescription (seconds) by role/class ─────────────────────────────────
export const REST_SECONDS = {
  power: 150,                 // full recovery between explosive sets
  primaryHeavy: 180,          // strength/sport mains (heavy CNS work)
  primaryOther: 120,          // other styles' mains
  isoCoreCalf: 60,
  accessoryHighCns: 150,      // heavy RDL / good morning / rack pull as straight sets
  accessoryModerateCns: 90,
  accessoryDefault: 75,
  supersetB: 20,              // the B-move runs in the A-move's rest gap
  evidence: ev('moderate', 'Inter-set rest for strength vs accessory work (de Salles 2009; Schoenfeld 2016 — ≥2 min for compounds)')
};

// ── Iso / core set strings ────────────────────────────────────────────────────
export const ISO_SETS = { bodybuilding: '3 × 12–15', default: '3 × 12' };
export const CORE_SETS = { light: '2 × 30s', default: '3 × 30s' };

export default { DOSE_SCHEMES, STYLE_SCHEME_BRIDGE, DEFAULT_SCHEME_KEY, DISCIPLINE_DOSE_QUALITY, LIGHT_STRENGTH_MAINS, POWER_DOSE, REST_SECONDS, ISO_SETS, CORE_SETS, REACTIVE_LIMITS, doseForQuality };
