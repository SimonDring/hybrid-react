// wearable-adapter-contract.test.mjs — M6(e) / TR-15: a wearable / daily-metrics row enters the
// engine through ONE typed, honestly-named seam. The naming stops overclaiming what the device
// measures (Art 16): vendor composites are labelled DERIVED, not measured. Pure remap — values
// unchanged (the readiness pipeline's own tests + the golden master prove no behaviour moved).
import { adaptWearableReading } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const row = {
  sleep_duration_min: 450, sleep_deep_min: 90, sleep_rem_min: 100,
  readiness_score: 72, sleep_score: 84,
  sleep_quality: 4, soreness: 2, mood: 3, stress: 2, energy: 4, illness: false,
  source: 'google_health', date: '2026-07-16',
};

// ── Honest grouping: measured vs vendorDerived vs subjective ──────────────────
{
  const w = adaptWearableReading(row);
  assert(w.measured.sleepDurationMin === 450 && w.measured.sleepDeepMin === 90 && w.measured.sleepRemMin === 100,
    'raw sensor readings land under `measured`');
  assert(w.vendorDerived.readinessComposite === 72 && w.vendorDerived.sleepComposite === 84,
    'vendor black-box scores land under `vendorDerived` (NOT measured — Art 16 honesty)');
  assert(w.subjective.mood === 3 && w.subjective.soreness === 2 && w.subjective.illness === false,
    'athlete self-report lands under `subjective`');
  assert(w.meta.source === 'google_health' && w.meta.date === '2026-07-16', 'provenance under `meta`');
}

// ── Values are UNCHANGED (a label, not a decision — byte-identity contract) ────
{
  const w = adaptWearableReading(row);
  assert(w.vendorDerived.readinessComposite === row.readiness_score
    && w.measured.sleepDurationMin === row.sleep_duration_min,
    'the adapter is a pure remap — every value equals the source field');
}

// ── Absent fields → null, never invented ──────────────────────────────────────
{
  const w = adaptWearableReading({ sleep_duration_min: 400 });
  assert(w.vendorDerived.readinessComposite === null && w.vendorDerived.sleepComposite === null,
    'no vendor composite supplied → null (the engine estimates downstream; nothing is fabricated)');
  assert(w.measured.sleepDurationMin === 400 && w.measured.sleepDeepMin === null, 'partial rows map cleanly');
}

// ── Empty / undefined input is safe ───────────────────────────────────────────
{
  const w = adaptWearableReading();
  assert(w && w.measured && w.vendorDerived && w.subjective && w.meta, 'undefined input → a fully-shaped empty reading');
}
