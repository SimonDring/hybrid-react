// tests/injury-engine.js
import { getQuestions, assess } from '@performance-os/engine/lib/injury/symptomAssessment.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// T1: getQuestions returns questions for each region
const lowerQ = getQuestions('lower_limb');
assert(Array.isArray(lowerQ) && lowerQ.length >= 4, 'T1a lower_limb has >= 4 questions');
const upperQ = getQuestions('upper_limb');
assert(Array.isArray(upperQ) && upperQ.length >= 3, 'T1b upper_limb has >= 3 questions');
const spineQ = getQuestions('core_spine');
assert(Array.isArray(spineQ) && spineQ.length >= 4, 'T1c core_spine has >= 4 questions');

// T2: neurological symptom → red flag for lower limb
const result2 = assess('lower_limb', { location: 'knee', onset: 'sudden', weight_bearing: 'yes', neurological: 'yes', swelling: 'no', pain_at_rest: 'no' });
assert(result2.result === 'red_flag', 'T2 neurological → red_flag');

// T3: bowel/bladder change → red flag for spine
const result3 = assess('core_spine', { location: 'lumbar', neurological: 'no', bowel_bladder: 'yes', radiating: 'no', onset: 'gradual' });
assert(result3.result === 'red_flag', 'T3 bowel/bladder change → red_flag');

// T4: cannot bear weight + sudden + swelling → red flag
const result4 = assess('lower_limb', { location: 'ankle', onset: 'sudden', weight_bearing: 'no', neurological: 'no', swelling: 'yes', pain_at_rest: 'no' });
assert(result4.result === 'red_flag', 'T4 cannot weight-bear + sudden + swelling → red_flag');

// T5: gradual knee pain, bearing weight, no neuro → probable result
const result5 = assess('lower_limb', { location: 'knee', onset: 'gradual', weight_bearing: 'yes', neurological: 'no', swelling: 'no', pain_at_rest: 'no' });
assert(result5.result === 'probable', 'T5 gradual knee → probable');
assert(result5.body_part_key === 'knee', 'T5 body_part_key is knee');

// T6: radiating arm pain from neck → red flag for spine
const result6 = assess('core_spine', { location: 'cervical', neurological: 'no', bowel_bladder: 'no', radiating: 'yes', onset: 'sudden' });
assert(result6.result === 'red_flag', 'T6 radiating pain → red_flag');

// T7: gradual lower back, no red flags → probable
const result7 = assess('core_spine', { location: 'lumbar', neurological: 'no', bowel_bladder: 'no', radiating: 'no', onset: 'gradual' });
assert(result7.result === 'probable', 'T7 gradual lower back → probable');
assert(result7.body_part_key === 'lumbar', 'T7 body_part_key is lumbar');

import { getContraindications } from '@performance-os/engine/lib/injury/injuryRules.js';
import { hasRecurrenceRisk } from '@performance-os/engine/data/injuryTaxonomy.js';

// T8: knee protect phase blocks squats and runs
const c8 = getContraindications('knee', 3, 'protect');
assert(c8.blockedPatterns.some(p => p.test('Squat')), 'T8 knee protect blocks squat');
assert(c8.blockedPatterns.some(p => p.test('Running interval')), 'T8 knee protect blocks run');

// T9: knee return_to_sport has fewer blocks than protect
const c9_protect = getContraindications('knee', 3, 'protect');
const c9_rts = getContraindications('knee', 3, 'return_to_sport');
assert(c9_rts.blockedPatterns.length < c9_protect.blockedPatterns.length, 'T9 return_to_sport blocks fewer than protect');

// T10: severity 4+ forces protect-level blocks regardless of phase
const c10 = getContraindications('knee', 4, 'return_to_sport');
assert(c10.blockedPatterns.some(p => p.test('Squat')), 'T10 severity 4 overrides phase to protect-level');

// T11: severity 1 returns empty blocks
const c11 = getContraindications('knee', 1, 'loading');
assert(c11.blockedPatterns.length === 0, 'T11 severity 1 → no blocks');

// T12: lumbar protect blocks deadlifts and squats
const c12 = getContraindications('lumbar', 3, 'protect');
assert(c12.blockedPatterns.some(p => p.test('Deadlift')), 'T12 lumbar protect blocks deadlift');

// T13: hasRecurrenceRisk returns true for known diagnoses
assert(hasRecurrenceRisk('patellar_tendinopathy') === true, 'T13 patellar_tendinopathy has recurrence risk');
assert(hasRecurrenceRisk('wrist_sprain') === false, 'T13 wrist_sprain has no recurrence risk');
assert(hasRecurrenceRisk('acl') === true, 'T13 ACL has recurrence risk');

import { applyInjuryRules, applyPrevention } from '@performance-os/engine/lib/injury/injuryFilter.js';

const mockSession = {
  title: 'Monday · Gym — Lower body',
  discipline: 'gym',
  focus: 'Lower body strength',
  duration: '60 min',
  intensity: 'hard',
  lowerBody: true,
  items: [
    { num: 'P1', name: 'Hip Flexor Stretch', sets: '2 × 30s', tag: 'mobility', restSec: 20 },
    { num: 'A1', name: 'Squat', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 },
    { num: 'B1', name: 'Romanian Deadlift', sets: '3 × 8', rpe: 'RPE 7', restSec: 120 },
    { num: 'B2', name: 'Leg press', sets: '3 × 10', rpe: 'RPE 7', restSec: 90 },
    { num: 'C1', name: 'Calf raise', sets: '3 × 15', rpe: 'RPE 6', restSec: 60 },
  ]
};

const mockWeek = { num: 1, sessions: [mockSession] };

// T14: no active injuries → session unchanged
const w14 = applyInjuryRules(mockWeek, []);
assert(!w14.sessions[0].injuryBanner, 'T14 no injuries → no banner');
assert(w14.sessions[0].items.length === mockSession.items.length, 'T14 no injuries → items unchanged');

// T15: knee injury at protect phase blocks squat, RDL, leg press
const kneeInjury = { id: '1', body_part_key: 'knee', severity: 3, rehab_phase: 'protect', status: 'active', body_part: 'Left knee', side: 'left' };
const w15 = applyInjuryRules(mockWeek, [kneeInjury]);
const subbed = w15.sessions[0].items.filter(i => i.substituted);
assert(subbed.length >= 3, 'T15 knee protect → at least 3 items substituted (squat, RDL, leg press)');
assert(!!w15.sessions[0].injuryBanner, 'T15 injury banner present');

// T16: mobility primer items are NOT blocked
const primerKept = w15.sessions[0].items.find(i => i.name === 'Hip Flexor Stretch');
assert(!primerKept.substituted, 'T16 mobility primer not substituted');

// T17: >70% blocked → session replaced with rehab session
const severeInjury = { id: '2', body_part_key: 'knee', severity: 5, rehab_phase: 'protect', status: 'active', body_part: 'Left knee', side: 'left' };
const w17 = applyInjuryRules(mockWeek, [severeInjury]);
assert(w17.sessions[0].discipline === 'rehab', 'T17 severe injury → session replaced with rehab discipline');

// T18: applyPrevention with no recovered injuries → session unchanged
const w18 = applyPrevention(mockWeek, []);
assert(!w18.sessions[0].items.some(i => i.prevention), 'T18 no recovered injuries → no prevention items');

// T19: recovered knee injury → prevention items added
const recoveredKnee = { id: '3', body_part_key: 'knee', status: 'recovered', diagnosis_key: 'patellar_tendinopathy' };
const w19 = applyPrevention(mockWeek, [recoveredKnee]);
assert(w19.sessions[0].items.some(i => i.prevention), 'T19 recovered knee → prevention items added');
