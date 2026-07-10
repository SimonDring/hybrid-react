// The engine test gate. Runs every tests/*.js and FAILS (exit 1) if any file exits
// non-zero. Each test uses the shared assert() that sets process.exitCode = 1 on a failed
// assertion; report-only scripts (e.g. profile-review.js) simply exit 0; the golden-master
// compares against its committed snapshot. Wire this into CI so a regression can't merge.
//
//   node tests/run-all.mjs          run the whole suite
//   npm test                        (from the repo root or apps/mobile) → this runner
import { readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dir = dirname(fileURLToPath(import.meta.url));

// Worktree guard: in a git worktree without its own node_modules, Node resolves
// @performance-os/engine through the MAIN checkout's node_modules — so the suite
// would silently test the main repo's engine, not the worktree's edits. Fail loudly
// instead of lying. (Fix: `npm install` at the worktree root, or symlink
// node_modules/@performance-os/{engine,shared} to the worktree's packages/.)
const repoRoot = realpathSync(join(dir, '..', '..', '..'));
let engineEntry = null;
try {
  engineEntry = realpathSync(createRequire(join(dir, '..', 'package.json')).resolve('@performance-os/engine'));
} catch {
  console.error('✗ @performance-os/engine does not resolve at all (no node_modules here?).');
  console.error('  Run `npm install` at this checkout\'s root and re-run.');
  process.exit(1);
}
if (!engineEntry.startsWith(repoRoot + sep)) {
  console.error('✗ @performance-os/engine resolves OUTSIDE this checkout:');
  console.error(`    resolved: ${engineEntry}`);
  console.error(`    checkout: ${repoRoot}`);
  console.error('  You are probably in a git worktree without node_modules — the suite would');
  console.error('  test the main repo\'s engine, not your edits. Run `npm install` at the');
  console.error('  worktree root (or symlink node_modules/@performance-os/{engine,shared}');
  console.error('  to this checkout\'s packages/) and re-run.');
  process.exit(1);
}
// Every .js in tests/ is a runnable test or report script; this .mjs runner is excluded by
// the extension filter, and __snapshots__ is a directory (also excluded).
const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();

// Per-file timeout: the whole suite runs in ~15 s, so any single file at 120 s is hung,
// not slow. Without this, one hang stalls the CI gate (and therefore every deploy)
// indefinitely — the runner is serial by design.
const FILE_TIMEOUT_MS = 120_000;

const failed = [];
const t0 = Date.now();
for (const f of files) {
  const r = spawnSync(process.execPath, [join(dir, f)], { encoding: 'utf8', timeout: FILE_TIMEOUT_MS, killSignal: 'SIGKILL' });
  if (r.error && r.error.code === 'ETIMEDOUT') {
    failed.push(f);
    process.stdout.write(`  ✗ ${f} — TIMED OUT after ${FILE_TIMEOUT_MS / 1000}s (killed; a test file must never hang)\n`);
  } else if (r.status === 0) {
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
