/**
 * manual-sport-entry.test.mjs — Phase 3 S6a: the pure ACL adapter for hand-logged
 * pitch/match sessions. Normalises athlete input through the Metric Dictionary, validates
 * at the boundary, and emits owner-private observation rows for the two M5 tables.
 *
 * Non-vacuous throughout: honest-provenance rejection, purity, and the derived-sRPE rule
 * are each proven with a discriminating case that a no-op adapter would fail.
 * Design: docs/superpowers/specs/2026-07-21-phase3-manual-sport-logging-design.md.
 */
import { adaptManualSportEntry, groupSportObservations } from '@performance-os/engine';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', msg); process.exitCode = 1; } };

const CTX = { observedAt: '2026-07-20T18:30:00.000Z', on: '2026-07-20', ref: 'sess-1' };
const rowFor = (rows, id) => rows.find((r) => r.metric_id === id);

// ── 1. a full honest manual log → correct rows, tables, columns, provenance ──
{
  const out = adaptManualSportEntry(
    { minutes: 70, rpe: 6, availability: 'available', distanceM: 8200, sprintCount: 14, topSpeedMs: 8.1, highSpeedM: 640 },
    CTX,
  );
  ok(out.ok === true, 'a full log is ok');
  ok(out.errors.length === 0, 'a fully-valid log has no errors');

  // match_performances: minutes (self-report) + availability (self-report)
  const mins = rowFor(out.matchRows, 'exposure.minutes.match');
  ok(mins && mins.minutes === 70 && mins.provenance_class === 'self-report', 'minutes → match row, minutes col, self-report');
  ok(mins.fixture_ref === 'sess-1' && mins.observed_at === CTX.observedAt && mins.played_on === '2026-07-20', 'match row carries ref/observed_at/played_on from ctx');
  ok(mins.reliability_tag === 'moderate', 'minutes self-report reliability stamped from the dictionary (moderate)');
  const avail = rowFor(out.matchRows, 'availability.status.match');
  ok(avail && avail.availability_status === 'available' && avail.provenance_class === 'self-report', 'availability → match row, availability_status col');

  // external_load_observations: rpe (self-report), derived srpe (self-report), gps (third-party)
  const rpe = rowFor(out.externalRows, 'rpe.session.pitch');
  ok(rpe && rpe.pitch_rpe === 6 && rpe.provenance_class === 'self-report' && rpe.session_ref === 'sess-1', 'rpe → external row, pitch_rpe col, self-report');
  ok(rpe.observed_on === '2026-07-20', 'external row carries observed_on from ctx');
  const srpe = rowFor(out.externalRows, 'srpe.load.session');
  ok(srpe && srpe.raw && srpe.raw.value === 420 && srpe.provenance_class === 'self-report', 'derived sRPE = rpe×minutes = 420, in raw (column is null), self-report');
  const dist = rowFor(out.externalRows, 'gps.total_distance.session');
  ok(dist && dist.distance_m === 8200 && dist.provenance_class === 'third-party', 'GPS distance → external row, distance_m col, THIRD-PARTY (never self-report)');
  ok(dist.reliability_tag === 'moderate', 'GPS third-party reliability stamped from the dictionary (moderate)');
  const sprint = rowFor(out.externalRows, 'sprint.count.session');
  ok(sprint && sprint.sprint_count === 14 && sprint.provenance_class === 'third-party', 'sprints → sprint_count col, third-party');
  const hsr = rowFor(out.externalRows, 'gps.high_speed_distance.session');
  ok(hsr && hsr.high_speed_m === 640, 'high-speed distance → high_speed_m col');
  const spd = rowFor(out.externalRows, 'speed.max.session');
  ok(spd && spd.raw && spd.raw.value === 8.1 && spd.provenance_class === 'third-party', 'top speed → raw (column null), third-party');

  // every row must carry the NOT-NULL columns
  for (const r of [...out.matchRows, ...out.externalRows])
    ok(r.metric_id && r.provenance_class && r.observed_at, `every row has metric_id/provenance/observed_at (${r.metric_id})`);
}

// ── 2. a minutes+RPE-only log is a valid, honest observation (the S6a headline) ──
{
  const out = adaptManualSportEntry({ minutes: 60, rpe: 5 }, CTX);
  ok(out.ok, 'minutes + RPE alone is a valid log');
  ok(out.matchRows.length === 1 && out.externalRows.length === 2, 'produces exactly minutes + (rpe, srpe) = 1 match + 2 external rows');
  ok(rowFor(out.externalRows, 'srpe.load.session').raw.value === 300, 'sRPE = 5×60 = 300');
}

// ── 3. honesty is ENFORCED — the dictionary rejects a mislabelled datum ──────
// The adapter must NEVER emit a self-report GPS distance. (We can't ask the adapter to
// mislabel via the normal API, so assert the boundary the other way: an out-of-range /
// bad value is rejected and reported, never silently coerced.)
{
  const out = adaptManualSportEntry({ minutes: 70, rpe: 99 }, CTX); // RPE 99 is out of the 0–10 CR10 range
  ok(!rowFor(out.externalRows, 'rpe.session.pitch'), 'an out-of-range RPE is NOT emitted as a row');
  ok(out.errors.some((e) => /rpe/i.test(e)), 'the rejected RPE is REPORTED, never silently dropped (Art 15)');
  ok(rowFor(out.matchRows, 'exposure.minutes.match'), 'the valid minutes still land (partial failure is isolated)');
  // no sRPE without a valid RPE
  ok(!rowFor(out.externalRows, 'srpe.load.session'), 'sRPE is NOT derived when its RPE input was rejected');
}
{
  const out = adaptManualSportEntry({ availability: 'injured-ish' }, CTX); // not in the enum
  ok(!out.ok && out.errors.some((e) => /availability/i.test(e)), 'a bad availability enum is rejected + reported');
}

// ── 4. empty / meaningless input → ok:false, no rows ────────────────────────
{
  const out = adaptManualSportEntry({}, CTX);
  ok(out.ok === false && out.matchRows.length === 0 && out.externalRows.length === 0, 'empty input produces no rows and ok:false');
}

// ── 5. purity — same input + ctx ⇒ byte-identical rows (no clock/random inside) ──
{
  const a = adaptManualSportEntry({ minutes: 70, rpe: 6 }, CTX);
  const b = adaptManualSportEntry({ minutes: 70, rpe: 6 }, CTX);
  ok(JSON.stringify(a) === JSON.stringify(b), 'adapter is pure/deterministic for the same input+ctx');
}

// ── 6. groupSportObservations round-trips the emitted rows into a friendly session ──
{
  const out = adaptManualSportEntry({ minutes: 70, rpe: 6, availability: 'modified', distanceM: 8200, sprintCount: 14 }, CTX);
  const grouped = groupSportObservations([...out.matchRows, ...out.externalRows]);
  ok(grouped.length === 1, 'one ref → one grouped session');
  const s = grouped[0];
  ok(s.ref === 'sess-1' && s.on === '2026-07-20', 'grouped session carries ref + date');
  ok(s.minutes === 70 && s.rpe === 6 && s.availability === 'modified' && s.distanceM === 8200 && s.sprintCount === 14 && s.srpe === 420,
    'grouped session reassembles every logged metric from its column/raw');
}

console.log(`\nmanual-sport-entry: ${pass} passed, ${fail} failed`);
