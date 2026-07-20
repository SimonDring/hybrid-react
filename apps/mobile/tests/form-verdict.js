// formVerdict — turns the engine's computeForm() output ({ctl,atl,tsb,band,confidence,
// rationale}) into a plain-language verdict, in the exact style of readinessVerdict/
// loadVerdict (apps/mobile/src/lib/verdicts.js). Presentation only — no engine/plan logic.
import { formVerdict, TONE } from '../src/lib/verdicts.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

function form(band, confidence, extra = {}) {
  return { ctl: 40, atl: 35, tsb: 5, band, confidence, rationale: 'test fixture', ...extra };
}

// ── band 'fresh' → positive, "good day to push" ─────────────────────────────
const fresh = formVerdict(form('fresh', 0.9));
assert(fresh.tone === 'positive', 'T1 fresh → tone positive');
assert(fresh.color === TONE.positive, 'T2 fresh → color is TONE.positive');
assert(typeof fresh.label === 'string' && fresh.label.length > 0, 'T3 fresh → label present');
assert(typeof fresh.headline === 'string' && fresh.headline.length > 0, 'T4 fresh → headline present');
assert(/push/i.test(fresh.note), 'T5 fresh → note mentions pushing');

// ── band 'fatigued' → strain, "ease and absorb" ──────────────────────────────
const fatigued = formVerdict(form('fatigued', 0.9));
assert(fatigued.tone === 'strain', 'T6 fatigued → tone strain');
assert(fatigued.color === TONE.strain, 'T7 fatigued → color is TONE.strain');
assert(/ease|absorb/i.test(fatigued.note), 'T8 fatigued → note mentions easing/absorbing');

// ── band 'neutral' → caution (mirrors the sweet/under/high split elsewhere in this
// file — "neutral" content-wise reads as caution/steady, distinct from the true
// no-data 'neutral' tone below), steady note ─────────────────────────────────
const neutral = formVerdict(form('neutral', 0.9));
assert(neutral.tone === 'caution' || neutral.tone === 'neutral', 'T9 neutral band → caution or neutral tone');
assert(neutral.color === TONE[neutral.tone], 'T10 neutral band → color matches its own tone');
assert(/steady|balanced|plan/i.test(neutral.note), 'T11 neutral band → steady note');

// ── band null / missing history → neutral "building baseline" ───────────────
const nullBand = formVerdict(form(null, 0));
assert(nullBand.tone === 'neutral', 'T12 null band → tone neutral');
assert(nullBand.color === TONE.neutral, 'T13 null band → color is TONE.neutral');
assert(/building|baseline/i.test(nullBand.label), 'T14 null band → "Building baseline" label');
assert(/more sessions|appears here/i.test(nullBand.note), 'T14b null band → "not enough history yet" note');

// formVerdict must not throw on a wholly absent/undefined form (defensive, same
// posture as loadVerdict(null) elsewhere in this file).
const missing = formVerdict(null);
assert(missing.tone === 'neutral', 'T15 formVerdict(null) → tone neutral');
assert(missing.color === TONE.neutral, 'T16 formVerdict(null) → color TONE.neutral');
assert(/building|baseline/i.test(missing.label), 'T17 formVerdict(null) → "Building baseline" label');
const undef = formVerdict(undefined);
assert(undef.tone === 'neutral', 'T18 formVerdict(undefined) → tone neutral');

// ── low confidence (<0.5) → confidence caveat is honestly attached (Art 13/14) ──
const freshLowConfidence = formVerdict(form('fresh', 0.3));
assert(freshLowConfidence.tone === 'positive', 'T19 low-confidence fresh → tone STAYS positive (confidence never re-tones)');
assert(freshLowConfidence.color === TONE.positive, 'T20 low-confidence fresh → color stays TONE.positive');
assert(/confidence/i.test(freshLowConfidence.note), 'T21 low-confidence fresh → note carries a confidence caveat');
assert(freshLowConfidence.note !== fresh.note, 'T22 low-confidence fresh → note differs from the high-confidence note (caveat appended)');

const fatiguedLowConfidence = formVerdict(form('fatigued', 0.1));
assert(/confidence/i.test(fatiguedLowConfidence.note), 'T23 low-confidence fatigued → note carries a confidence caveat too');

// ── confidence at/above 0.5 → no caveat appended ─────────────────────────────
const freshMidConfidence = formVerdict(form('fresh', 0.5));
assert(freshMidConfidence.note === fresh.note, 'T24 confidence 0.5 (not < 0.5) → no caveat appended, note unchanged');
const freshNoConfidence = formVerdict(form('fresh', undefined));
assert(freshNoConfidence.note === fresh.note, 'T25 confidence undefined → no caveat appended (nothing to qualify)');

// ── every returned verdict's color is exactly TONE[tone] — never a hardcoded token ──
for (const v of [fresh, fatigued, neutral, nullBand, freshLowConfidence, fatiguedLowConfidence]) {
  assert(v.color === TONE[v.tone], `T26 color for tone '${v.tone}' equals TONE['${v.tone}']`);
}

console.log('form-verdict tests done');
