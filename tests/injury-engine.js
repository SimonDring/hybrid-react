// tests/injury-engine.js
import { getQuestions, assess } from '../src/lib/injury/symptomAssessment.js';

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

import { getContraindications, recurrenceRisk } from '../src/lib/injury/injuryRules.js';

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

// T13: recurrenceRisk returns true for known diagnoses
assert(recurrenceRisk('patellar_tendinopathy') === true, 'T13 patellar_tendinopathy has recurrence risk');
assert(recurrenceRisk('wrist_sprain') === false, 'T13 wrist_sprain has no recurrence risk');
assert(recurrenceRisk('acl') === true, 'T13 ACL has recurrence risk');
