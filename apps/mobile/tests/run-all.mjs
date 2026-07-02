// The engine test gate. Runs every tests/*.js and FAILS (exit 1) if any file exits
// non-zero. Each test uses the shared assert() that sets process.exitCode = 1 on a failed
// assertion; report-only scripts (e.g. profile-review.js) simply exit 0; the golden-master
// compares against its committed snapshot. Wire this into CI so a regression can't merge.
//
//   node tests/run-all.mjs          run the whole suite
//   npm test                        (from the repo root or apps/mobile) → this runner
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
// Every .js in tests/ is a runnable test or report script; this .mjs runner is excluded by
// the extension filter, and __snapshots__ is a directory (also excluded).
const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();

const failed = [];
const t0 = Date.now();
for (const f of files) {
  const r = spawnSync(process.execPath, [join(dir, f)], { encoding: 'utf8' });
  if (r.status === 0) {
    process.stdout.write(`  ✓ ${f}\n`);
  } else {
    failed.push(f);
    process.stdout.write(`  ✗ ${f}\n`);
    // Surface why it failed: the FAIL: lines, then a short stderr tail.
    for (const l of (r.stdout || '').split('\n').filter((l) => l.includes('FAIL')).slice(0, 8)) {
      process.stdout.write(`      ${l}\n`);
    }
    for (const l of (r.stderr || '').trim().split('\n').slice(-4)) {
      if (l) process.stdout.write(`      ${l}\n`);
    }
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${files.length - failed.length}/${files.length} test files passed in ${secs}s.`);
if (failed.length) {
  console.error(`FAILED (${failed.length}): ${failed.join(', ')}`);
  process.exit(1);
}
