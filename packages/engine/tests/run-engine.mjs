// The ENGINE-OWNED test gate (Phase 3 M0 T1 — closes TR-11: at the pin the engine
// had no suite of its own and delegated entirely to apps/mobile/tests). Runs every
// tests/*.test.mjs in THIS directory and FAILS (exit 1) if any file exits non-zero.
// Each test uses its own inline assert() (repo convention: see apps/mobile/tests/*.js)
// that sets process.exitCode = 1 on a failed assertion.
//
// Convention for T3+ (13-VALIDATION-STRATEGY §5.2 property suite) and beyond:
// add engine-owned tests as packages/engine/tests/*.test.mjs — this runner picks
// them up automatically, no registration needed. Test files here import ONLY from
// the engine (`@performance-os/engine` or relative `../src/...` paths) — never
// from apps/mobile — so the engine stays exercisable without booting the app
// (spec §2.1). The app suite (apps/mobile/tests) is retained for adapter/store/UI
// seams and is unaffected by this runner.
//
//   node tests/run-engine.mjs                 run the whole engine-owned suite
//   npm run test:engine -w @performance-os/engine   (from repo root) → this runner
import { readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dir = dirname(fileURLToPath(import.meta.url));

// Worktree guard (mirrors apps/mobile/tests/run-all.mjs): in a git worktree without
// its own node_modules, Node resolves @performance-os/engine through the MAIN
// checkout's node_modules — so the suite would silently test the main repo's
// engine, not the worktree's edits. Fail loudly instead of lying.
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

// Discover every *.test.mjs in this directory (T3's property files, this task's
// smoke test, and anything added later) — sorted for a stable, readable run order.
const files = readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort();

if (files.length === 0) {
  console.error('✗ No packages/engine/tests/*.test.mjs files found — the engine-owned suite');
  console.error('  cannot be silently empty (it must gate every PR). Add at least smoke.test.mjs.');
  process.exit(1);
}

// Per-file timeout: a single hung file must not stall the CI gate indefinitely —
// the runner is serial by design (same rationale as apps/mobile/tests/run-all.mjs).
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
console.log(`\n${files.length - failed.length}/${files.length} engine test files passed in ${secs}s.`);
if (failed.length) {
  console.error(`FAILED (${failed.length}): ${failed.join(', ')}`);
  process.exit(1);
}
