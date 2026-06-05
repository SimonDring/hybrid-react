/**
 * Strength engine — builds a week of gym sessions from the user's profile.
 *
 * The science (see research notes in the rebuild plan):
 *  • Volume is the main driver of hypertrophy: ~10–20 hard sets per muscle group
 *    per week, with diminishing returns past ~20 (Schoenfeld dose-response).
 *  • Each muscle should be trained ≥2×/week — better growth than 1×, and a
 *    clearer strength benefit (Schoenfeld 2016 frequency meta-analysis).
 *  • Linear vs undulating periodisation barely differ when volume is equated, so
 *    we keep it simple: block phases (base→build→peak) shift rep range + RPE.
 *
 * That "≥2× per muscle" rule is what drives the split by gym-days — the only way
 * to hit everything twice on few days is full-body; more days lets us split:
 *    1–3 days → full body         (everything 2–3×)
 *    4 days   → upper / lower ×2   (each half 2×)
 *    5 days   → upper / lower + push / pull / legs   (hybrid, ~2×)
 *    6 days   → push / pull / legs ×2                (each muscle 2×)
 *
 * Goal "flavour" (strength_style) changes rep scheme + exercise emphasis, NOT
 * the split:
 *    strength      → heavy, low reps, big compounds (powerlifting bias)
 *    bodybuilding  → moderate–high reps, more isolation + volume
 *    functional    → mixed reps, compounds + unilateral + carries + core
 *
 * buildWeek(ctx) → array of session specs (no day assigned yet — the scheduler
 * places them). Each spec:
 *    { discipline:'gym', focus, duration, items, intensity, lowerBody }
 * `intensity` ('hard'|'moderate') and `lowerBody` let the scheduler space heavy
 * leg work away from hard runs (the main concurrent-training conflict).
 */

import { EXERCISES, LEVELS, availableEquip } from '../../data/strengthExercises.js';

// ---- split → ordered day blueprints by gym-days ----
// Each day is a blueprint with a DISTINCT emphasis; together they cover the
// movement patterns ~2×/week with a slight pull lean for posture. This is what
// makes consecutive sessions feel different rather than copy-pasted.
const SPLITS = {
  1: ['fbA'],
  2: ['fbA', 'fbB'],
  3: ['fbA', 'fbB', 'fbC'],
  4: ['upperPush', 'lowerSquat', 'upperPull', 'lowerHinge'],
  5: ['upperPush', 'lowerSquat', 'pushDelt', 'pullVert', 'lowerHinge'],
  6: ['pushChest', 'pullVert', 'lowerSquat', 'pushDelt', 'pullHoriz', 'lowerHinge']
};

// A blueprint = display focus + leg-day flag + ordered movement-pattern slots.
// slot.pat: a movement pattern (or 'iso' + muscle). slot.role: primary (heavy
// compound) | accessory | core | iso. `bb`/`fn` slots appear only for that style.
const BLUEPRINTS = {
  fbA: { focus: 'Full body · squat focus', lower: true, slots: [
    { pat: 'squat', role: 'primary' }, { pat: 'hpush', role: 'accessory' }, { pat: 'hpull', role: 'accessory' },
    { pat: 'hinge', role: 'accessory' }, { pat: 'core', role: 'core' }, { pat: 'carry', role: 'accessory', fn: true } ] },
  fbB: { focus: 'Full body · posterior focus', lower: true, slots: [
    { pat: 'hinge', role: 'primary' }, { pat: 'vpush', role: 'accessory' }, { pat: 'vpull', role: 'accessory' },
    { pat: 'lunge', role: 'accessory' }, { pat: 'calf', role: 'iso' }, { pat: 'core', role: 'core' } ] },
  fbC: { focus: 'Full body · push & single-leg', lower: true, slots: [
    { pat: 'hpush', role: 'primary' }, { pat: 'lunge', role: 'accessory' }, { pat: 'hpull', role: 'accessory' },
    { pat: 'hinge', role: 'accessory' }, { pat: 'core', role: 'core' }, { pat: 'iso', muscle: 'sidedelt', role: 'iso', bb: true } ] },
  upperPush: { focus: 'Upper · push focus', lower: false, slots: [
    { pat: 'hpush', role: 'primary' }, { pat: 'hpull', role: 'accessory' }, { pat: 'vpush', role: 'accessory' },
    { pat: 'vpull', role: 'accessory' }, { pat: 'iso', muscle: 'reardelt', role: 'iso' }, { pat: 'iso', muscle: 'triceps', role: 'iso', bb: true } ] },
  upperPull: { focus: 'Upper · pull focus', lower: false, slots: [
    { pat: 'vpull', role: 'primary' }, { pat: 'vpush', role: 'accessory' }, { pat: 'hpull', role: 'accessory' },
    { pat: 'hpush', role: 'accessory' }, { pat: 'iso', muscle: 'reardelt', role: 'iso' }, { pat: 'iso', muscle: 'biceps', role: 'iso', bb: true } ] },
  pushChest: { focus: 'Push · chest focus', lower: false, slots: [
    { pat: 'hpush', role: 'primary' }, { pat: 'hpush', role: 'accessory' }, { pat: 'vpush', role: 'accessory' },
    { pat: 'iso', muscle: 'sidedelt', role: 'iso' }, { pat: 'iso', muscle: 'triceps', role: 'iso' } ] },
  pushDelt: { focus: 'Push · shoulder focus', lower: false, slots: [
    { pat: 'vpush', role: 'primary' }, { pat: 'hpush', role: 'accessory' }, { pat: 'iso', muscle: 'sidedelt', role: 'iso' },
    { pat: 'iso', muscle: 'reardelt', role: 'iso' }, { pat: 'iso', muscle: 'triceps', role: 'iso' } ] },
  pullVert: { focus: 'Pull · width focus', lower: false, slots: [
    { pat: 'vpull', role: 'primary' }, { pat: 'hpull', role: 'accessory' }, { pat: 'iso', muscle: 'reardelt', role: 'iso' },
    { pat: 'iso', muscle: 'biceps', role: 'iso' } ] },
  pullHoriz: { focus: 'Pull · thickness focus', lower: false, slots: [
    { pat: 'hpull', role: 'primary' }, { pat: 'vpull', role: 'accessory' }, { pat: 'iso', muscle: 'reardelt', role: 'iso' },
    { pat: 'iso', muscle: 'biceps', role: 'iso' } ] },
  lowerSquat: { focus: 'Lower · quad focus', lower: true, slots: [
    { pat: 'squat', role: 'primary' }, { pat: 'lunge', role: 'accessory' }, { pat: 'hinge', role: 'accessory' },
    { pat: 'calf', role: 'iso' }, { pat: 'iso', muscle: 'quad', role: 'iso', bb: true }, { pat: 'core', role: 'core' } ] },
  lowerHinge: { focus: 'Lower · posterior focus', lower: true, slots: [
    { pat: 'hinge', role: 'primary' }, { pat: 'lunge', role: 'accessory' }, { pat: 'iso', muscle: 'ham', role: 'iso' },
    { pat: 'calf', role: 'iso' }, { pat: 'core', role: 'core' } ] }
};

// ---- rep/intensity scheme by style + phase intent ----
// main = primary compound, acc = accessory. Deload overrides everything.
function scheme(style, intent, deload) {
  if (deload) return { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' };
  const table = {
    strength: {
      base:  { main: '4 × 5', acc: '3 × 8',  mainRpe: 'RPE 7',    accRpe: 'RPE 7' },
      build: { main: '4 × 4', acc: '3 × 6',  mainRpe: 'RPE 8',    accRpe: 'RPE 7→8' },
      peak:  { main: '4 × 3', acc: '3 × 5',  mainRpe: 'RPE 8→9',  accRpe: 'RPE 8' }
    },
    bodybuilding: {
      base:  { main: '3 × 12', acc: '3 × 12', mainRpe: 'RPE 7',   accRpe: 'RPE 8' },
      build: { main: '4 × 10', acc: '3 × 12', mainRpe: 'RPE 8',   accRpe: 'RPE 8→9' },
      peak:  { main: '4 × 8',  acc: '3 × 10', mainRpe: 'RPE 8→9', accRpe: 'RPE 9' }
    },
    functional: {
      base:  { main: '3 × 8', acc: '3 × 10', mainRpe: 'RPE 7',   accRpe: 'RPE 7' },
      build: { main: '4 × 6', acc: '3 × 8',  mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
      peak:  { main: '3 × 5', acc: '3 × 6',  mainRpe: 'RPE 8',   accRpe: 'RPE 8' }
    }
  };
  return (table[style] || table.functional)[intent] || table.functional.base;
}

// ---- subtle, evidence-based sex tuning ----
// The heavy compounds are IDENTICAL between sexes: relative strength/hypertrophy
// gains are the same (Refalo et al. 2025 meta-analysis), so the split, the main
// lifts and their loads don't change. The one robust difference is that women
// fatigue more slowly and recover faster between sets, completing more reps at a
// given load (biological-sex fatigue studies) — so they can absorb a little more
// rep volume on the SUPPORTING work. We nudge accessory/isolation reps up a
// couple, nothing else. Heavy mains, core holds, carries and timed work untouched.
function femaleRepBump(sex) { return sex === 'female' ? 2 : 0; }
function bumpReps(sets, d) {
  if (!d) return sets;
  // Bump the rep number(s) after the × — but not seconds/metres (holds, carries).
  return String(sets).replace(/×\s*(\d+(?:–\d+)?)(?!\s*[sm])/, (m, reps) => '× ' + reps.replace(/\d+/g, n => String(Number(n) + d)));
}

// Progression note shown on the primary lift.
function mainNote(deload) {
  return deload
    ? 'deload — ~65% load, leave 3+ reps in the tank'
    : '+small load when the last set is ≤ target RPE';
}

// ---- exercise picking, with a bodyweight fall-back when no weights ----
// `weights` true when the user has a full gym or home weights.
function lift(weights, barbell, bodyweight) {
  return weights ? barbell : bodyweight;
}

// ---- target working weights from optional 1RMs (squat / bench / deadlift) ----
// Kept deliberately simple: an Epley-based %1RM from the prescribed reps + reps-
// in-reserve (from RPE), with a gentle weekly creep within a phase. Lifts the
// user didn't give a max for show "—" and a cue to log their working set.
function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function round2_5(x) { return Math.round(x / 2.5) * 2.5; }
function parseReps(sets) { const m = /[×x]\s*(\d+)/.exec(sets || ''); return m ? Number(m[1]) : null; }
function parseRpe(rpe) { const m = /(\d+)/.exec(rpe || ''); return m ? Number(m[1]) : 7; } // first (lower) number — conservative

// Map an exercise name to which 1RM drives it + a strength factor vs that lift.
function liftMatch(name) {
  const n = (name || '').toLowerCase();
  // Only barbell main lifts get 1RM-based targets — skip DB/goblet/band variants.
  if (/\bdb\b|dumbbell|goblet|kettlebell|\bband\b/.test(n)) return null;
  if (/bench press/.test(n)) return { key: 'bench', factor: 1 };
  if (/romanian deadlift/.test(n)) return { key: 'deadlift', factor: 0.8 }; // RDL ≈ 80% of DL
  if (/trap-bar|hex deadlift|^deadlift|\bdeadlift\b/.test(n) && !/romanian/.test(n)) return { key: 'deadlift', factor: 1 };
  if (/squat/.test(n) && /back|front/.test(n) && !/split/.test(n)) return { key: 'squat', factor: 1 };
  return null;
}

// Annotate items with target weights in place.
function applyWeights(items, lifts, winp) {
  if (!lifts) lifts = {};
  for (const it of items) {
    const m = liftMatch(it.name);
    if (!m) continue;
    const oneRM = num(lifts[m.key]);
    const reps = parseReps(it.sets);
    if (!oneRM) {
      it.weight = '—';
      if (it.num === 'A1') it.note = (it.note ? it.note + ' · ' : '') + 'log your top set — targets build from it';
      continue;
    }
    if (!reps) continue;
    const rir = Math.max(0, 10 - parseRpe(it.rpe));
    let pct = 1 / (1 + (reps + rir) / 30);                 // Epley inverse
    pct *= 1 + Math.min(0.05, 0.01 * ((winp || 1) - 1));   // gentle weekly creep
    it.weight = `${round2_5(oneRM * m.factor * pct)} kg`;
  }
}

// ---- exercise selection from the database ----
function slotMatches(e, slot) {
  if (slot.pat === 'iso') return e.pattern === 'iso' && (!slot.muscle || e.muscle === slot.muscle);
  return e.pattern === slot.pat;
}

// Pick one exercise for a slot: filter by available equipment + the athlete's
// level, prefer primary-role lifts for primary slots, avoid repeats within the
// session, and rotate the choice by week so variations change over time.
function pickFor(slot, { equip, level, weekNum, used, seed }) {
  let cands = EXERCISES.filter(e => slotMatches(e, slot) && equip.has(e.equip) && e.level <= level);
  if (slot.role === 'primary') {
    const prim = cands.filter(e => e.role === 'primary');
    if (prim.length) cands = prim;
    // Anchor the session on a barbell lift when one's available.
    const barbell = cands.filter(e => e.equip === 'barbell');
    if (barbell.length) cands = barbell;
  }
  // Fallback: relax to any bodyweight option for this pattern if nothing fits.
  if (!cands.length) cands = EXERCISES.filter(e => slotMatches(e, slot) && e.equip === 'bodyweight' && e.level <= level);
  if (!cands.length) return null;
  const fresh = cands.filter(e => !used.has(e.id));
  const pool = fresh.length ? fresh : cands;
  const ex = pool[(weekNum + seed) % pool.length];
  used.add(ex.id);
  return ex;
}

// Rep scheme for non-primary slots.
function coreSets(deload) { return deload ? '2 × 30s' : '3 × 30s'; }
function isoSets(style) { return style === 'bodybuilding' ? '3 × 12–15' : '3 × 12'; }

// Build a session's items from its blueprint, choosing real exercises.
function buildSessionItems(bp, { style, s, deload, equip, level, weekNum, maxItems, repBump }) {
  // Strength style keeps it compound-focused (drop most isolation, keep calves);
  // bb/fn slots only appear for their style.
  let slots = bp.slots.filter(sl => (!sl.bb || style === 'bodybuilding') && (!sl.fn || style === 'functional'));
  if (style === 'strength') slots = slots.filter(sl => sl.role !== 'iso' || sl.pat === 'calf');
  slots = slots.slice(0, maxItems);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const used = new Set();
  const items = [];
  slots.forEach((sl, i) => {
    const ex = pickFor(sl, { equip, level, weekNum, used, seed: i });
    if (!ex) return;
    const num = `${letters[Math.min(i, letters.length - 1)]}1`;
    const per = ex.unilateral ? ' ea.' : '';
    if (sl.role === 'primary') {
      items.push({ num, name: ex.name, sets: s.main + per, rpe: s.mainRpe, note: mainNote(deload) });
    } else if (sl.role === 'core') {
      const reps = /plank|hold|dead bug|copenhagen/i.test(ex.name) ? coreSets(deload) : '3 × 12' + per;
      items.push({ num, name: ex.name, sets: reps, rpe: 'RPE 6', tag: 'mobility', note: '' });
    } else if (sl.role === 'iso') {
      const t = /calf/i.test(ex.name) ? '3 × 12' : isoSets(style);
      items.push({ num, name: ex.name, sets: bumpReps(t + per, repBump), rpe: s.accRpe, tag: ex.pattern === 'calf' ? 'mobility' : undefined, note: '' });
    } else {
      items.push({ num, name: ex.name, sets: bumpReps(s.acc + per, repBump), rpe: s.accRpe, note: '' });
    }
  });
  return items;
}

/**
 * Build the week's gym sessions from the exercise database.
 * @param {object} ctx
 *   gymDays   number 1–6 (how many gym sessions this week)
 *   style     'strength' | 'bodybuilding' | 'functional'
 *   intent    'base' | 'build' | 'peak'
 *   deload    boolean
 *   minutes   typical session length (caps the exercise count + sets duration)
 *   access    array of equipment keys; level  experience; weekNum  for rotation
 *   lifts     optional 1RMs for target weights
 * @returns {Array} session specs (no day assigned yet)
 */
export function buildWeek(ctx = {}) {
  const gymDays = Math.max(1, Math.min(6, ctx.gymDays || 3));
  const style = ctx.style || 'functional';
  const intent = ctx.intent || 'base';
  const deload = !!ctx.deload;
  const minutes = ctx.minutes || 60;
  const equip = availableEquip(ctx.access || []);
  const level = LEVELS[ctx.level] ?? 0;
  const weekNum = ctx.weekNum || 1;

  const s = scheme(style, intent, deload);
  const days = SPLITS[gymDays] || SPLITS[3];
  const lo = Math.max(35, minutes - 10);
  const duration = `${lo}–${minutes} min`;
  const maxItems = minutes <= 45 ? 5 : minutes <= 60 ? 6 : 7;
  const repBump = femaleRepBump(ctx.sex);

  return days.map(bpKey => {
    const bp = BLUEPRINTS[bpKey] || BLUEPRINTS.fbA;
    const items = buildSessionItems(bp, { style, s, deload, equip, level, weekNum, maxItems, repBump });
    applyWeights(items, ctx.lifts, ctx.winp); // no-op for bodyweight names
    return {
      discipline: 'gym',
      focus: bp.focus,
      duration,
      items,
      intensity: deload ? 'moderate' : 'hard',
      lowerBody: bp.lower
    };
  });
}

// ===========================================================================
// Supplemental strength — short sessions that SUPPORT an endurance athlete who
// didn't pick the gym. The research: endurance runners/swimmers benefit from
// 2×/week strength (posterior chain, single-leg, plyometrics, tendon work for
// runners; pulling, shoulders, core for swimmers) — it improves economy and
// durability without big hypertrophy volume. These are light/short and marked
// intensity:'moderate', lowerBody:false so the scheduler can pair them with an
// easy run/swim day (a double) rather than spacing them like a hard leg day.
// ===========================================================================
function supportItems(forSport, variant, weights, deload) {
  const sets = deload ? '2' : '3';
  const run = [
    [ // A — posterior chain + single-leg
      { num: 'A1', name: lift(weights, 'Romanian deadlift', 'Single-leg hip hinge'), sets: `${sets} × 6`, rpe: 'RPE 7', note: 'controlled hinge' },
      { num: 'B1', name: 'Bulgarian split squat', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'knee tracks toe' },
      { num: 'B2', name: 'Single-leg calf raise', sets: '3 × 12 ea.', rpe: 'RPE 7', note: 'tendon stiffness', tag: 'mobility' },
      { num: 'C1', name: 'Hip thrust / glute bridge', sets: `${sets} × 10`, rpe: 'RPE 7', note: '' },
      { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', note: 'anti-rotation core', tag: 'mobility' }
    ],
    [ // B — plyometric + durability
      { num: 'A1', name: 'Pogo hops / low box jumps', sets: `${sets} × 6`, rpe: 'RPE 7', note: 'stiff, springy — quality over height' },
      { num: 'B1', name: 'Step-up', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'drive through the heel' },
      { num: 'B2', name: 'Nordic / slider hamstring curl', sets: `${sets} × 6`, rpe: 'RPE 7', note: 'slow eccentric', tag: 'mobility' },
      { num: 'C1', name: 'Copenhagen plank', sets: '3 × 20s ea.', rpe: 'RPE 7', note: 'adductor health', tag: 'mobility' },
      { num: 'C2', name: 'Calf raise', sets: '3 × 15', rpe: 'RPE 7', note: '', tag: 'mobility' }
    ]
  ];
  const swim = [
    [ // A — pull & posture
      { num: 'A1', name: lift(weights, 'Pull-up / lat pulldown', 'Band-assisted pull-up'), sets: `${sets} × 8`, rpe: 'RPE 7', note: 'full range' },
      { num: 'A2', name: 'Band / cable row', sets: `${sets} × 12`, rpe: 'RPE 7', note: 'squeeze 1s' },
      { num: 'B1', name: 'DB shoulder press', sets: `${sets} × 10`, rpe: 'RPE 7', note: '' },
      { num: 'C1', name: 'Prone Y-T-W raises', sets: '3 × 10', rpe: 'RPE 6', note: 'scap / rotator health', tag: 'mobility' },
      { num: 'C2', name: 'Hollow hold', sets: '3 × 30s', rpe: 'RPE 6', note: 'midline', tag: 'mobility' }
    ],
    [ // B — lats & rotation
      { num: 'A1', name: 'Straight-arm pulldown', sets: `${sets} × 12`, rpe: 'RPE 7', note: 'feel the lats' },
      { num: 'B1', name: lift(weights, 'Single-arm DB row', 'Inverted row'), sets: `${sets} × 10 ea.`, rpe: 'RPE 7', note: '' },
      { num: 'B2', name: 'External rotation', sets: '3 × 12 ea.', rpe: 'RPE 6', note: 'cuff health', tag: 'mobility' },
      { num: 'C1', name: 'Rotational core (Pallof / chop)', sets: '3 × 10 ea.', rpe: 'RPE 6', note: '', tag: 'mobility' },
      { num: 'C2', name: 'Plank', sets: '3 × 40s', rpe: 'RPE 6', note: '', tag: 'mobility' }
    ]
  ];
  const pool = forSport === 'swim' ? swim : run;
  return pool[variant % pool.length];
}

/**
 * Build short supplemental-strength sessions for an endurance athlete.
 * @param {object} ctx
 *   count    how many sessions this week (1–2)
 *   for      'run' | 'swim' (which support template family)
 *   deload   boolean
 *   access   equipment keys
 *   weekNum  rotates the variant so the two/weekly sessions differ
 * @returns {Array} session specs (intensity 'moderate', lowerBody false)
 */
export function buildSupport(ctx = {}) {
  const count = Math.max(1, Math.min(2, ctx.count || 2));
  const forSport = ctx.for === 'swim' ? 'swim' : 'run';
  const deload = !!ctx.deload;
  const access = ctx.access || [];
  const weights = access.includes('full_gym') || access.includes('home_weights') || access.length === 0;
  const base = (ctx.weekNum || 1) - 1;
  const repBump = femaleRepBump(ctx.sex);
  const focus = forSport === 'swim' ? 'Swim-support strength' : 'Run-support strength';
  return Array.from({ length: count }, (_, i) => ({
    discipline: 'gym',
    focus,
    duration: '25–30 min',
    items: supportItems(forSport, base + i, weights, deload).map(it => ({ ...it, sets: bumpReps(it.sets, repBump) })),
    intensity: 'moderate',
    lowerBody: false,
    supplemental: true
  }));
}

export default { buildWeek, buildSupport };
