import {
  sessionLoad, workoutLoad, dailyLoads, acuteChronic, acwr, acwrSeries,
  loadDecision, combinedMultiplier, acwrThresholdsForSport
} from '@performance-os/engine/lib/plan/trainingLoad.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// sessionLoad — Edwards TRIMP from zones
const z = { hr_zones: { z1: 10, z2: 10, z3: 5, z4: 5, z5: 2 }, duration_sec: 1920 };
assert(sessionLoad(z).load === 10*1 + 10*2 + 5*3 + 5*4 + 2*5 && !sessionLoad(z).estimated, 'T1 zone TRIMP');
assert(sessionLoad({ duration_sec: 3600 }).load === 180 && sessionLoad({ duration_sec: 3600 }).estimated, 'T2 fallback duration*3 estimated');
assert(sessionLoad(null).load === 0, 'T3 null → 0');

// workoutLoad
assert(workoutLoad({ duration_sec: 1800 }) === 90, 'T4 workout load duration*3');

// dailyLoads — unlinked workout counts, linked one does not
const logs = [{ completed_at: '2026-06-10T18:00:00Z', hr_zones: { z3: 20 }, duration_sec: 1200 }];
const wks = [
  { start_time: '2026-06-10T07:00:00Z', duration_sec: 1800, session_id: null },     // unlinked → counts
  { start_time: '2026-06-10T19:00:00Z', duration_sec: 1800, session_id: 'sess-1' }   // linked → ignored
];
const dl = dailyLoads(logs, wks);
assert(dl.length === 1 && dl[0].date === '2026-06-10', 'T5 one day');
assert(dl[0].load === (20*3) + 90, 'T6 session TRIMP + unlinked workout, linked excluded');

// acuteChronic / acwr — 28 days of steady 100/day → acwr ~1; <1 chronic → null
const steady = [];
for (let i = 0; i < 28; i++) steady.push({ date: new Date(Date.UTC(2026,5,1) + i*86400000).toISOString().split('T')[0], load: 100 });
const ac = acuteChronic(steady, '2026-06-28');
assert(Math.abs(acwr(ac) - 1) < 0.1, 'T7 steady load → acwr ~1');
assert(acwr(acuteChronic([], '2026-06-28')) === null, 'T8 no history → null');

// loadDecision — bands
assert(loadDecision(null, []).action === 'none', 'T9 null acwr → none');
assert(loadDecision(1.4, []).action === 'ease' && loadDecision(1.4, []).multiplier < 1, 'T10 1.4 → ease <1');
assert(loadDecision(1.6, [1.6,1.6,1.6,1.6]).action === 'deload' && loadDecision(1.6, [1.6,1.6,1.6,1.6]).multiplier === 0.5, 'T11 sustained >1.5 → deload 0.5');
assert(loadDecision(1.6, [1.0,1.0,1.6,null]).action === 'ease', 'T12 high but not sustained → ease, not deload');
assert(loadDecision(0.7, [0.7,0.7,0.7,0.7]).action === 'nudge_up', 'T13 sustained <0.8 → nudge_up');
assert(loadDecision(1.0, []).action === 'none', 'T14 sweet spot → none');

// combinedMultiplier — conservative for ease/deload, gated for nudge, floor 0.5
assert(combinedMultiplier(1.0, { action: 'ease', multiplier: 0.7 }) === 0.7, 'T15 ease = min(rm, loadMult)');
assert(combinedMultiplier(0.8, { action: 'ease', multiplier: 0.9 }) === 0.8, 'T16 readiness more conservative wins');
assert(combinedMultiplier(0.2, { action: 'deload', multiplier: 0.5 }) === 0.5, 'T17 floor clamp 0.5');
assert(combinedMultiplier(1.0, { action: 'nudge_up', multiplier: 1.0 }) === 1.0, 'T18 nudge + recovered → full plan');
assert(combinedMultiplier(0.7, { action: 'nudge_up', multiplier: 1.0 }) === 0.7, 'T19 nudge but low readiness → respect readiness');
assert(combinedMultiplier(0.9, { action: 'none', multiplier: 1 }) === 0.9, 'T20 none → readiness only');

// acwrThresholdsForSport — per-sport threshold override
const t = acwrThresholdsForSport('gaelic_football');
assert(t && typeof t.high === 'number', 'T21 sport thresholds resolve from loadManagement');
// gaelic_football has sweetSpotHigh:1.3, highRiskAbove:1.5 — tighter than global
assert(t.easeFrom === 1.3 && t.high === 1.5, 'T22 gaelic_football easeFrom=1.3, high=1.5');
assert(acwrThresholdsForSport('unknown_sport') === null, 'T23 unknown sport returns null');

// loadDecision with custom thresholds — acwrVal=1.45 > high=1.4, 3 recent > 1.4 >= sustainedDays=2 → deload
const d = loadDecision(1.45, [1.45, 1.45, 1.45], { sweetLow: 0.8, easeFrom: 1.2, high: 1.4, policy: { sustainedDays: 2, deloadMultiplier: 0.6, easeSlope: 0.5, nudgeUp: 1.05 } });
assert(d.action === 'deload', 'T24 custom thresholds drive the decision');
assert(d.multiplier === 0.6, 'T25 custom deloadMultiplier applied');
