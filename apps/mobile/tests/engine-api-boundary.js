// tests/engine-api-boundary.js — WP-25: the app consumes the engine through its
// PUBLIC API (the @performance-os/engine barrel), not deep module paths.
//
// The allowlist below is the documented residue — each entry has an owner and a
// reason, and the list may ONLY SHRINK: a new deep import anywhere in
// apps/mobile/src fails this test (the SKB-join ratchet pattern, applied to the
// engine boundary; audit V11/T21). Tests are exempt (they exercise internals).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// file (relative to src) → allowed deep paths, with the owner that retires them.
const ALLOWLIST = {
  'lib/PlanService.js': ['lib/plan/reflow.js'],                    // namespace form of API symbols (all on the barrel)
  'screens/DevPlayground.jsx': ['lib/strength/targets.js', 'lib/strength/program.js', 'lib/indices/index.js', 'lib/performance/index.js', 'lib/PlanGenerator.js', 'lib/plan/volume.js', 'data/exerciseQualities.js', 'data/muscleVolume.js', 'data/strengthExercises.js'], // dev tooling reads internals by design
};

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(name)) files.push(p);
  }
})(SRC);

const offenders = [];
for (const f of files) {
  const rel = relative(SRC, f);
  const src = readFileSync(f, 'utf8');
  const deep = [...src.matchAll(/from '@performance-os\/engine\/([^']+)'/g)].map((m) => m[1]);
  const allowed = new Set(ALLOWLIST[rel] || []);
  for (const d of deep) if (!allowed.has(d)) offenders.push(`${rel} → ${d}`);
}
assert(offenders.length === 0,
  `every engine import in apps/mobile/src goes through the barrel or the documented allowlist${offenders.length ? ' — offenders:\n  ' + offenders.join('\n  ') : ''}`);

// The allowlist itself can't go stale: every entry must still exist as claimed.
let stale = [];
for (const [rel, paths] of Object.entries(ALLOWLIST)) {
  let src = '';
  try { src = readFileSync(join(SRC, rel), 'utf8'); } catch { stale.push(`${rel} (file gone)`); continue; }
  for (const d of paths) if (!src.includes(`@performance-os/engine/${d}`)) stale.push(`${rel} → ${d}`);
}
assert(stale.length === 0, `allowlist entries are still real (stale: ${stale.join(', ') || 'none'})`);

// The six named calls exist on the barrel.
const api = await import('@performance-os/engine');
for (const name of ['plan', 'reflow', 'trainNow', 'deriveReadiness', 'deriveLoad', 'validate']) {
  assert(typeof api[name] === 'function', `API call "${name}" is exported`);
}
