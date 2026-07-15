// tests/injury-classification-pin.js — WP-41 / TR-10: the contraindication CLASSIFICATION GOLDEN.
//
// The injury safety join is the app's only hard safety gate. It now keys on exercise
// IDENTITY (id / movement pattern), not display name (TR-10 / M4a Task 1) — so a catalogue
// RENAME can no longer sneak a contraindicated lift past an injured athlete, and a NEW
// exercise of a contraindicated pattern is blocked by safe default. This pin still converts
// any silent break into a LOUD one: it snapshots, for every injury region × rehab phase,
// exactly which catalogue exercises the id/pattern join blocks. Any change — a rename, a new
// exercise, a vocab edit — fails CI with a reviewable diff. Re-baseline ONLY deliberately:
//     UPDATE=1 node tests/injury-classification-pin.js
// and adjudicate every moved row in review (is the new classification clinically right?).
//
// Promoting the residual regex-gap exercises (in the vocab's clearedIds — e.g. hang_clean /
// power_clean for a protected knee) from cleared → blocked re-authors clinical rules and
// remains the recorded follow-up for Simon's science review.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { INJURY_PROFILES } from '@performance-os/engine/lib/injury/profiles.js';
import { contraindicationCell, isExerciseContraindicated } from '@performance-os/engine/lib/injury/contraindicationVocab.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SNAP = path.join(__dirname, '__snapshots__', 'injury-classification.json');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const PHASES = ['protect', 'early_motion', 'loading', 'return_to_sport'];

// Build the id/pattern Sets for a region×phase cell (raw phase, no severity policy — the pin
// classifies phases directly, exactly as the pre-TR-10 pin drove the regexes per phase).
function setsFor(region, phase) {
  const c = contraindicationCell(region, phase);
  return { patternSet: new Set(c.patterns), extraIdSet: new Set(c.extraIds), clearedIdSet: new Set(c.clearedIds) };
}

// The classification: region.phase → sorted blocked exercise ids (by the id/pattern JOIN).
function classify() {
  const out = {};
  for (const region of Object.keys(INJURY_PROFILES)) {
    for (const phase of PHASES) {
      const sets = setsFor(region, phase);
      const blocked = EXERCISES.filter((ex) => isExerciseContraindicated(ex, sets)).map((ex) => ex.id).sort();
      out[`${region}.${phase}`] = blocked;
    }
  }
  return out;
}

// The classification by the legacy NAME regexes (still the off-catalogue fallback in
// injuryFilter). Used only for the parity assertion below.
function classifyByRegex() {
  const out = {};
  for (const [region, profile] of Object.entries(INJURY_PROFILES)) {
    for (const phase of PHASES) {
      const patterns = (profile.contraindications && profile.contraindications[phase]) || [];
      const blocked = EXERCISES.filter((ex) => patterns.some((r) => r.test(ex.name))).map((ex) => ex.id).sort();
      out[`${region}.${phase}`] = blocked;
    }
  }
  return out;
}

const current = classify();

// PARITY GUARD (TR-10): the id/pattern vocabulary MUST reproduce the name-regex authoring
// over the live catalogue, byte-for-byte. If the vocab (contraindicationVocab.js) and the
// regexes (profiles.js) ever drift apart, this fails loudly — the two must be edited together.
{
  const byRegex = classifyByRegex();
  let drift = 0;
  for (const k of Object.keys(current)) {
    if (JSON.stringify(current[k]) !== JSON.stringify(byRegex[k])) {
      drift++;
      const a = new Set(byRegex[k]), b = new Set(current[k]);
      console.error(`  DRIFT ${k}: id/pattern +[${[...b].filter(x => !a.has(x)).join(', ')}] -[${[...a].filter(x => !b.has(x)).join(', ')}]`);
    }
  }
  assert(drift === 0,
    'id/pattern contraindication vocabulary reproduces the name-regex authoring over the catalogue ' +
    `(${drift} region.phase set(s) drifted — contraindicationVocab.js and profiles.js must stay in lockstep)`);
}

if (process.env.UPDATE === '1') {
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(current, null, 1) + '\n');
  console.log(`UPDATED ${path.relative(process.cwd(), SNAP)} — review every moved row deliberately.`);
  process.exit(0);
}

assert(fs.existsSync(SNAP),
  'snapshot exists (first run: UPDATE=1 node tests/injury-classification-pin.js, then review + commit)');

if (fs.existsSync(SNAP)) {
  const pinned = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  const keys = new Set([...Object.keys(pinned), ...Object.keys(current)]);
  let moved = 0;
  for (const k of keys) {
    const a = JSON.stringify(pinned[k] || null);
    const b = JSON.stringify(current[k] || null);
    if (a !== b) {
      moved++;
      const was = new Set(pinned[k] || []), now = new Set(current[k] || []);
      const gained = [...now].filter((x) => !was.has(x));
      const lost = [...was].filter((x) => !now.has(x));
      console.error(`  MOVED ${k}: +[${gained.join(', ')}] -[${lost.join(', ')}]`);
    }
  }
  assert(moved === 0,
    `safety classification unchanged (${moved} region.phase set(s) moved — a rename/new exercise/regex edit ` +
    'changed what an injured athlete may be given; adjudicate, then UPDATE=1 to re-baseline)');

  // Structural sanity on the pin itself.
  assert(Object.keys(pinned).length === Object.keys(INJURY_PROFILES).length * PHASES.length,
    'pin covers every region × phase');
  const protectSizes = Object.entries(pinned).filter(([k]) => k.endsWith('.protect')).map(([, v]) => v.length);
  assert(protectSizes.every((n) => n > 0),
    'every region blocks SOMETHING in its protect phase (an empty protect set is almost certainly a broken regex)');
}
