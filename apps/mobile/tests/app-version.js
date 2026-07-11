// tests/app-version.js — the pure build-version formatter shown in Settings (and used to answer
// "which build is this device running?"). Pure string logic; the globals it reads
// (__APP_VERSION__/__APP_COMMIT__) are injected at build time and live only in getAppVersion().
import { formatVersion } from '../src/lib/appVersion.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(formatVersion('2.0.0', 'a1b2c3d') === 'v2.0.0 · a1b2c3d', 'A1 version + commit');
assert(formatVersion('2.0.0', '') === 'v2.0.0', 'A2 version only when no commit');
assert(formatVersion('2.0.0', null) === 'v2.0.0', 'A3 null commit → version only');
assert(formatVersion('', 'a1b2c3d') === 'v? · a1b2c3d', 'A4 missing version → v?');
assert(formatVersion(undefined, undefined) === 'v?', 'A5 both missing → v?');
