// packages/engine/tests/aerobic-load.test.mjs
//
// Phase 2 T1 — governed Banister-TRIMP aerobic load (parallel; does not touch the
// live ACWR path — trainingLoad.workoutLoad/dailyLoads are unchanged). Verifies the
// pure aerobicLoad() scorer + aerobicDailyLoads() roll-up mirror dailyLoads' shape
// but score unlinked workouts via real HR-based TRIMP (or the duration proxy).
import assert from 'node:assert/strict';
import { aerobicLoad, aerobicDailyLoads } from '@performance-os/engine';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
const close = (a, b, tol, m) => ok(Math.abs(a - b) < tol, `${m} (got ${a}, expected ~${b})`);

// ── male coefficient path (Banister 1991): TRIMP = min × HRr × 0.64·e^(1.92·HRr) ──
{
  const workout = { duration_sec: 3600, avg_hr: 150 };
  const HRr = (150 - 50) / (190 - 50);
  const expected = 60 * HRr * (0.64 * Math.exp(1.92 * HRr));
  const r = aerobicLoad(workout, { restHr: 50, maxHr: 190, sex: 'male', age: null });
  close(r.load, expected, 0.5, 'male TRIMP matches the Banister formula');
  ok(r.method === 'trimp', 'male path — method is trimp');
  ok(r.confidence === 'moderate', 'male path, explicit restHr+maxHr — confidence moderate');
}

// ── female coefficient path differs: 0.86·e^(1.67·HRr) ──
{
  const workout = { duration_sec: 3600, avg_hr: 150 };
  const HRr = (150 - 50) / (190 - 50);
  const expected = 60 * HRr * (0.86 * Math.exp(1.67 * HRr));
  const r = aerobicLoad(workout, { restHr: 50, maxHr: 190, sex: 'female', age: null });
  close(r.load, expected, 0.5, 'female TRIMP matches the sex-specific coefficient');
  ok(r.method === 'trimp', 'female path — method is trimp');
}

// ── restHr fallback (population 60) drops confidence to low ──
{
  const workout = { duration_sec: 3600, avg_hr: 150 };
  const HRr = (150 - 60) / (190 - 60);
  const expected = 60 * HRr * (0.64 * Math.exp(1.92 * HRr));
  const r = aerobicLoad(workout, { restHr: null, maxHr: 190, sex: 'male', age: null });
  close(r.load, expected, 0.5, 'restHr-default TRIMP uses the population 60bpm fallback');
  ok(r.method === 'trimp', 'restHr-default path — still a trimp method');
  ok(r.confidence === 'low', 'restHr-default path — confidence drops to low');
}

// ── maxHr absent + age present → Tanaka 2001 estimate (208 − 0.7·age); moderate confidence held ──
{
  const workout = { duration_sec: 2700, avg_hr: 140 };
  const estMaxHr = Math.round(208 - 0.7 * 30);
  const HRr = Math.max(0, Math.min(1, (140 - 55) / (estMaxHr - 55)));
  const expected = 45 * HRr * (0.64 * Math.exp(1.92 * HRr));
  const r = aerobicLoad(workout, { restHr: 55, maxHr: null, sex: 'male', age: 30 });
  close(r.load, expected, 0.5, 'age-derived HRmax (Tanaka 2001) feeds the TRIMP calc');
  ok(r.method === 'trimp', 'age-derived-maxHr path — still a trimp method');
  ok(r.confidence === 'moderate', 'age-derived-maxHr path — restHr was explicit, confidence stays moderate');
}

// ── missing avgHr → duration proxy, exactly round(min*3) ──
{
  const workout = { duration_sec: 2700 }; // 45 min, no avg_hr
  const r = aerobicLoad(workout, { restHr: 50, maxHr: 190, sex: 'male', age: null });
  ok(r.load === Math.round(45 * 3), 'missing avgHr — duration proxy equals round(min*3)');
  ok(r.method === 'duration', 'missing avgHr — method is duration');
  ok(r.confidence === 'low', 'missing avgHr — confidence low');
}

// ── maxHr unusable (absent, no age to derive it) → duration proxy even with avgHr present ──
{
  const workout = { duration_sec: 1800, avg_hr: 150 }; // 30 min
  const r = aerobicLoad(workout, { restHr: 50, maxHr: null, sex: 'male', age: null });
  ok(r.load === Math.round(30 * 3), 'unusable maxHr (no age to derive it) — duration proxy equals round(min*3)');
  ok(r.method === 'duration', 'unusable maxHr — method is duration');
  ok(r.confidence === 'low', 'unusable maxHr — confidence low');
}

// ── aerobicDailyLoads: sums session logs (via sessionLoad) + UNLINKED workouts (via
//    aerobicLoad) by date; workouts carrying a session_id are ignored (already
//    represented by their session's log) — mirrors trainingLoad.dailyLoads exactly. ──
{
  const sessionLogs = [
    { completed_at: '2026-07-01T10:00:00Z', duration_sec: 1800, hr_zones: { z1: 10, z2: 5 } },
  ];
  const workouts = [
    { session_id: 'linked-1', start_time: '2026-07-01T09:00:00Z', duration_sec: 3600, avg_hr: 150 }, // must be ignored
    { start_time: '2026-07-02T09:00:00Z', duration_sec: 3600, avg_hr: 150 }, // unlinked — scored via aerobicLoad
  ];
  const ctx = { restHr: 50, maxHr: 190, sex: 'male', age: null };
  const dl = aerobicDailyLoads(sessionLogs, workouts, ctx);

  ok(dl.length === 2, 'aerobicDailyLoads — two distinct dates');
  const day1 = dl.find(d => d.date === '2026-07-01');
  const day2 = dl.find(d => d.date === '2026-07-02');
  ok(day1 && day1.load === 20, 'day 1 — only the session log counts (z1*1 + z2*2 = 20), linked workout ignored');
  const HRr = (150 - 50) / (190 - 50);
  const expectedDay2 = Math.round(60 * HRr * (0.64 * Math.exp(1.92 * HRr)));
  ok(day2 && day2.load === expectedDay2, 'day 2 — the unlinked workout is scored via aerobicLoad (Banister TRIMP)');
}

console.log(`\naerobic-load: ${n}/${n} checks passed`);
