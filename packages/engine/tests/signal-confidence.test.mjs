// signal-confidence.test.mjs — Phase 3 M3b: athlete-signal (readiness) confidence made
// OPERATIVE (TR-13/SR-04/SR-08). Proves that one un-baselined OR stale bad wellness entry
// cannot swing an athlete's volume, while a mature, corroborated signal keeps its authority
// (Art 13 — confidence governs authority; uncertainty widens the margin, never halts).
//
// Engine-owned + pure: readinessIndex/recoveryIndex are pure functions of profile data;
// recency uses the supplied asOf date, never the clock (Art 18).
import { recoveryIndex, readinessIndex } from '@performance-os/engine/lib/indices/index.js';
import { recoveryFromScore } from '@performance-os/engine/lib/recovery/recovery.js';
import { recencyFactor } from '@performance-os/engine/lib/baseline.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const asOf = '2026-07-15';
const DAY = 86400000;
const dayBefore = (n) => new Date(Date.parse(asOf) - n * DAY).toISOString().slice(0, 10);
// A poor-readiness wellness row (low subjective + a below-baseline objective set).
const badRow = (date) => ({ date, source: 'fitbit', energy: 2, mood: 2, soreness: 2, stress: 2, sleep_quality: 2, sleep_duration_min: 300, hrv_ms: 35, resting_hr: 62 });
const priorRow = (n) => ({ date: dayBefore(n), source: 'fitbit', energy: 3, mood: 3, soreness: 3, stress: 3, sleep_quality: 3, sleep_duration_min: 450, hrv_ms: 55, resting_hr: 52 });

// ── SOURCE CONFIDENCE (TR-13): recoveryIndex no longer hard-codes maturity=1 ─────────
// A single entry with NO prior history → low confidence; the SAME entry with a mature
// (7-day) history → higher confidence. Value is IDENTICAL (maturity scales confidence, not value).
const subj = { sleepQuality: 2, soreness: 2, mood: 2, stress: 2, energy: 2 };
const fresh0 = recoveryIndex({ objectiveScore: 35, subjective: subj, source: 'fitbit', prior: [], asOf, date: asOf });
const mature = recoveryIndex({ objectiveScore: 35, subjective: subj, source: 'fitbit', prior: Array.from({ length: 7 }, (_, i) => priorRow(i + 1)), asOf, date: asOf });
assert(fresh0.value === mature.value, `maturity scales confidence, not the value (${fresh0.value} === ${mature.value})`);
assert(fresh0.confidence === 0, `single un-baselined entry → 0 confidence (was hard-coded high) (got ${fresh0.confidence})`);
assert(mature.confidence > fresh0.confidence, `a mature baseline → higher confidence (${mature.confidence} > ${fresh0.confidence})`);
// Legacy no-prior call is unchanged (maturity defaults to the neutral 1).
assert(recoveryIndex({ objectiveScore: 35, subjective: subj, source: 'fitbit' }).confidence > 0.5, 'no-prior (legacy) call keeps full-maturity confidence — additive, byte-identical');

// ── RECENCY (SR-04): a stale driving row is down-weighted ────────────────────────────
assert(recencyFactor(asOf, asOf) === 1, 'recencyFactor same-day → 1 (fresh)');
assert(Math.abs(recencyFactor(asOf, dayBefore(3)) - 0.5) < 1e-9, 'recencyFactor 3 days (half-life) → 0.5');
assert(recencyFactor(asOf, null) === 1, 'missing date → 1 (no false penalty)');
const priors7 = Array.from({ length: 7 }, (_, i) => priorRow(i + 2)); // history exists
const freshMature = recoveryIndex({ objectiveScore: 35, subjective: subj, source: 'fitbit', prior: priors7, asOf, date: asOf });
const staleMature = recoveryIndex({ objectiveScore: 35, subjective: subj, source: 'fitbit', prior: priors7, asOf, date: dayBefore(6) });
assert(staleMature.confidence < freshMature.confidence, `stale driving row → lower confidence than fresh (${staleMature.confidence} < ${freshMature.confidence})`);

// ── CONFIDENCE-GATED CUT: the same low readiness swings volume ONLY when trusted ─────
const CUT = 1 - recoveryFromScore(35).volumeModifier; // ungated low-band cut (~0.22)
assert(Math.abs(CUT - 0.22) < 1e-9, `ungated low-readiness cut is the full ~22% (got ${CUT})`);

// (a) immature single entry → BOUNDED, small adjustment (not the 22% swing)
const immature = readinessIndex({ metric: badRow(asOf), prior: [], objectiveScore: 35, asOf, v2: true });
const immatureOut = recoveryFromScore(immature.value, { confidence: immature.confidence, greenCut: 67 });
const immatureCut = 1 - immatureOut.volumeModifier;
assert(immatureOut.volumeModifier > 0.9, `immature single entry → bounded, small cut, NOT 22% (modifier ${immatureOut.volumeModifier})`);
assert(immatureCut < CUT / 2, `immature cut is far below the full swing (${immatureCut} < ${CUT / 2})`);
assert(immatureOut.rpeOffset === 0, 'immature signal does not ease intensity (rpeOffset stays 0)');

// (b) mature-baseline bad entry → retains authority (a bigger, warranted cut)
const matureIx = readinessIndex({ metric: badRow(asOf), prior: Array.from({ length: 10 }, (_, i) => priorRow(i + 1)), objectiveScore: 35, asOf, v2: true });
const matureOut = recoveryFromScore(matureIx.value, { confidence: matureIx.confidence, greenCut: 67 });
assert(matureIx.confidence > immature.confidence, `mature history → higher confidence than the un-baselined entry (${matureIx.confidence} > ${immature.confidence})`);
assert(matureOut.volumeModifier < immatureOut.volumeModifier, `mature bad entry keeps authority — bigger cut than the immature one (${matureOut.volumeModifier} < ${immatureOut.volumeModifier})`);
assert(matureOut.volumeModifier <= 0.8, `mature bad entry retains ~full authority (modifier ${matureOut.volumeModifier})`);
assert(matureOut.rpeOffset === -1, 'mature low-readiness signal eases intensity (rpeOffset -1)');

// (c) a stale bad entry is down-weighted vs a fresh one (same mature history)
const staleIx = readinessIndex({ metric: badRow(dayBefore(6)), prior: Array.from({ length: 10 }, (_, i) => priorRow(i + 7)), objectiveScore: 35, asOf, v2: true });
const staleOut = recoveryFromScore(staleIx.value, { confidence: staleIx.confidence, greenCut: 67 });
assert(staleOut.volumeModifier > matureOut.volumeModifier, `stale entry cuts LESS than the fresh mature one (${staleOut.volumeModifier} > ${matureOut.volumeModifier})`);

// ── the gate is INERT without a confidence (legacy path unchanged) ───────────────────
assert(recoveryFromScore(35).volumeModifier === 0.78, 'no confidence supplied → legacy full 0.78 (gate inert)');
assert(recoveryFromScore(35).rpeOffset === -1, 'no confidence supplied → legacy rpeOffset -1 (gate inert)');

console.log('signal-confidence tests done');
