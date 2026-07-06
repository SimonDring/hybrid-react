// tests/acwr-band-single-source.js — WP-57: ONE governed ACWR band classifier.
// The load view (trainingStore) and the coach roll-up (teamStatus) hand-copied the
// 0.8/1.3/1.5 cut-points from the KB by convention — the exact mirrored-threshold
// drift class this repo has documented three times. Both now consume the engine's
// acwrBand(); this pins the boundaries to the governed entry and the vocabulary maps.
import { acwrBand, kb } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const t = kb.value('load.acwr.thresholds');

// Boundary-exact pins against the GOVERNED values (not literals): the classifier must
// move if — and only if — the knowledge entry moves.
assert(acwrBand(null) === null, 'null → null (no data)');
assert(acwrBand(t.sweetLow - 0.01) === 'under', 'below sweetLow → under');
assert(acwrBand(t.sweetLow) === 'sweet', 'sweetLow inclusive → sweet');
assert(acwrBand(t.easeFrom) === 'sweet', 'easeFrom inclusive → sweet');
assert(acwrBand(t.easeFrom + 0.01) === 'high', 'above easeFrom → high');
assert(acwrBand(t.high) === 'high', 'high inclusive → high');
assert(acwrBand(t.high + 0.01) === 'over', 'above high → over');

// The two consumers carry NO cut-point literals of their own any more — vocabulary only.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url));
for (const rel of ['../src/stores/trainingStore.js', '../src/lib/teamStatus.js']) {
  const src = fs.readFileSync(path.join(here, rel), 'utf8');
  const mirrors = src.match(/acwr[A-Za-z]*\s*[<>]=?\s*(0\.8|1\.3|1\.5)/g) || [];
  assert(mirrors.length === 0, `${path.basename(rel)} carries no hand-copied ACWR cut-points (${mirrors.join(', ') || 'clean'})`);
}
