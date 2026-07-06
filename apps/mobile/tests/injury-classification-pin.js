// tests/injury-classification-pin.js — WP-41: the contraindication CLASSIFICATION GOLDEN.
//
// The injury system matches on exercise NAMES (regex). That is the app's only hard safety
// gate, and a catalogue rename (or a new exercise whose name dodges the patterns) silently
// changes safety behaviour — the reassessment's #1 latent safety risk. This pin converts
// that silent break into a LOUD one: it snapshots, for every injury region × rehab phase,
// exactly which catalogue exercises are blocked. Any change — a rename, a new exercise, a
// regex edit — fails CI with a reviewable diff. Re-baseline ONLY deliberately:
//     UPDATE=1 node tests/injury-classification-pin.js
// and adjudicate every moved row in review (is the new classification clinically right?).
//
// The full id/pattern-level contraindication vocabulary (replacing name regexes) is the
// recorded follow-up — it re-authors clinical rules and needs Simon's science review.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { INJURY_PROFILES } from '@performance-os/engine/lib/injury/profiles.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SNAP = path.join(__dirname, '__snapshots__', 'injury-classification.json');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const PHASES = ['protect', 'early_motion', 'loading', 'return_to_sport'];

// The classification: region.phase → sorted blocked exercise ids (by CURRENT regexes).
function classify() {
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
