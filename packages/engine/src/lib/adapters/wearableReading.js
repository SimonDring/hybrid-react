/**
 * wearableReading — the ONE typed seam a wearable / daily-metrics row enters the engine through
 * (M-ATH adapter; M6(e) / TR-15). Before this, `metric.*` fields were read scattered across the
 * readiness pipeline, and the naming OVERCLAIMED what the device measures — a vendor "readiness
 * score" or "sleep score" is a black-box COMPOSITE the vendor's algorithm computes, not a measured
 * signal. Art 16 (never oversell): this adapter names honestly, grouping every field by what it
 * actually IS.
 *
 * BYTE-IDENTICAL: this is an interface + naming layer — the VALUES are unchanged (a label, not a
 * decision). Consumers read the same numbers through an honest seam.
 *
 *   measured      — raw sensor readings the device genuinely measures (sleep duration + stages).
 *   vendorDerived — the vendor's own composite scores (readiness/sleep) — NOT ground truth; an
 *                   opaque algorithm's output, treated as a soft input, never as a measurement.
 *   subjective    — the athlete's own self-report (sleep quality, soreness, mood, stress, energy,
 *                   illness) — honest about being a rating, not a sensor.
 *   meta          — provenance (source device, date).
 *
 * Pure: a plain field remap, no clock, no I/O (Art 18).
 */

export function adaptWearableReading(metric = {}) {
  const m = metric || {};
  return {
    measured: {
      sleepDurationMin: m.sleep_duration_min ?? null,
      sleepDeepMin: m.sleep_deep_min ?? null,
      sleepRemMin: m.sleep_rem_min ?? null,
    },
    // The vendor's black-box composites — honestly named as DERIVED, not measured (Art 16). Present
    // only when the device/app supplied one; the engine's own estimators fill in when absent.
    vendorDerived: {
      readinessComposite: m.readiness_score ?? null, // was `readiness_score` — a vendor algorithm, not a measured readiness
      sleepComposite: m.sleep_score ?? null,          // was `sleep_score` — a vendor algorithm, not a measured sleep quality
    },
    subjective: {
      sleepQuality: m.sleep_quality ?? null,
      soreness: m.soreness ?? null,
      mood: m.mood ?? null,
      stress: m.stress ?? null,
      energy: m.energy ?? null,
      illness: m.illness ?? null,
    },
    meta: {
      source: m.source ?? null,
      date: m.date ?? null,
    },
  };
}

export default { adaptWearableReading };
