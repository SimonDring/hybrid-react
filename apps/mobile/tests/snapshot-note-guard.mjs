// snapshot-note-guard.mjs — Phase 3 M0 T4: the TR-01 recurrence guard, made
// mechanical (13-VALIDATION-STRATEGY.md §2.3).
//
// TR-01 was a real behaviour regression (a style-band fallthrough) that got
// RE-BASELINED INTO THE GOLDENS UNNOTICED — "precisely the failure mode
// golden-master auditing exists to catch" (audit 06). §2.3's discipline: every
// re-baseline carries an expected-delta note (which archetypes move, which
// keys, why, and the explicit claim "no other archetype moves"), and a diff
// touching __snapshots__/ WITHOUT one fails review. This script makes that a
// build-failing check instead of reviewer vigilance (EDS L13 pattern).
//
// ── THE CONVENTION (either satisfies the guard) ──────────────────────────────
//   1. A SIBLING NOTE FILE: the SAME diff that touches a file under
//      apps/mobile/tests/__snapshots__/ also touches
//      apps/mobile/tests/__snapshots__/EXPECTED-DELTA.md (added-to, dated,
//      one entry per re-baseline — see that file's own header for the
//      required shape); OR
//   2. A COMMIT-MESSAGE BLOCK: the tip commit's message contains a line
//      starting `EXPECTED-DELTA:` (case-insensitive) — for a single reviewed
//      commit that carries its own note inline (this repo's established
//      practice pre-dates this script — see e.g. commits a841ea9/b23108a's
//      "Expected-delta note" / "Expected golden delta" paragraphs).
// Either is mechanically checkable; neither requires trusting a reviewer to
// remember to look.
//
// ── USAGE ─────────────────────────────────────────────────────────────────────
//   node tests/snapshot-note-guard.mjs
//     Default (CI/local): diffs the current branch against its merge-base
//     with the PR's base branch (pull_request events: $GITHUB_BASE_REF),
//     falling back to HEAD~1..HEAD (push events / local single-commit check).
//     Reads the tip commit message via `git log -1`.
//
//   node tests/snapshot-note-guard.mjs --files a.json,b.json --message "..."
//     Debug/demo mode: bypasses git entirely — feeds an explicit file list +
//     commit message straight into the check. Used to prove the guard can go
//     RED and GREEN without depending on (or mutating) real repo/git state —
//     see the M0 Task 4 report for the falsifiability evidence this produced.
import { spawnSync } from 'node:child_process';

export const SNAPSHOT_DIR = 'apps/mobile/tests/__snapshots__/';
export const NOTE_FILE = 'apps/mobile/tests/__snapshots__/EXPECTED-DELTA.md';

/**
 * Pure check — no I/O. Exported so it can be unit-tested (and was, for this
 * task's falsifiability evidence) without touching git or the filesystem.
 * @param {string[]} changedFiles repo-relative paths touched by the diff
 * @param {string|null} commitMessage the tip commit's full message, or null
 */
export function checkNote(changedFiles, commitMessage) {
  const touchedSnapshots = changedFiles.filter((f) => f.startsWith(SNAPSHOT_DIR) && f !== NOTE_FILE);
  if (touchedSnapshots.length === 0) {
    return { ok: true, reason: 'no snapshot files changed — nothing to guard' };
  }
  const noteFileTouched = changedFiles.includes(NOTE_FILE);
  const hasCommitBlock = !!commitMessage && /^EXPECTED-DELTA:/im.test(commitMessage);
  if (noteFileTouched && hasCommitBlock) {
    return { ok: true, reason: `${touchedSnapshots.length} snapshot file(s) changed, with BOTH a note-file update and a commit-message block`, touchedSnapshots };
  }
  if (noteFileTouched) {
    return { ok: true, reason: `${touchedSnapshots.length} snapshot file(s) changed, with an EXPECTED-DELTA.md update in the same diff`, touchedSnapshots };
  }
  if (hasCommitBlock) {
    return { ok: true, reason: `${touchedSnapshots.length} snapshot file(s) changed, with an EXPECTED-DELTA: block in the commit message`, touchedSnapshots };
  }
  return {
    ok: false,
    reason: `${touchedSnapshots.length} snapshot file(s) changed with NO expected-delta note (neither ${NOTE_FILE} in this diff, nor an "EXPECTED-DELTA:" line in the commit message)`,
    touchedSnapshots,
  };
}

// ── git-backed default (CLI path) ────────────────────────────────────────────
function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout;
}

function gitChangedFiles() {
  const base = process.env.GITHUB_BASE_REF;
  if (base) {
    // pull_request: diff against the merge-base with the PR's base branch.
    sh('git', ['fetch', '--no-tags', '--depth=100', 'origin', base]);
    const out = sh('git', ['diff', '--name-only', `origin/${base}...HEAD`]);
    if (out != null) return out.split('\n').filter(Boolean);
  }
  // push / local: the tip commit's own diff.
  const out = sh('git', ['diff', '--name-only', 'HEAD~1', 'HEAD']);
  return out != null ? out.split('\n').filter(Boolean) : [];
}

function gitTipMessage() {
  return sh('git', ['log', '-1', '--format=%B']);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--files') out.files = argv[++i];
    else if (argv[i] === '--message') out.message = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const changedFiles = args.files !== undefined
    ? args.files.split(',').map((s) => s.trim()).filter(Boolean)
    : gitChangedFiles();
  const commitMessage = args.files !== undefined ? (args.message || null) : gitTipMessage();

  const result = checkNote(changedFiles, commitMessage);
  if (result.touchedSnapshots) {
    console.log('Snapshot files touched:', result.touchedSnapshots.join(', '));
  }
  if (result.ok) {
    console.log('PASS:', result.reason);
    process.exit(0);
  }
  console.error('FAIL:', result.reason);
  console.error(`  Fix: add/append ${NOTE_FILE} in this same diff (which archetypes move, which`);
  console.error('  keys, why, and the explicit claim "no other archetype moves" — 13-VALIDATION-');
  console.error('  STRATEGY.md §2.3), OR add a line starting "EXPECTED-DELTA:" to the commit message.');
  process.exit(1);
}

// Only run the CLI when invoked directly (so importing checkNote for a unit
// test never shells out to git or calls process.exit).
if (import.meta.url === `file://${process.argv[1]}`) main();
