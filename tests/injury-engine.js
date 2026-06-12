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
