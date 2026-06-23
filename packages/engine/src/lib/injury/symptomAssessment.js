// src/lib/injury/symptomAssessment.js
// Pure functions — no side effects, no imports from UI or store.

// Questions per body region.
// Each question: { key, text, options: [{value, label}] }
const QUESTIONS = {
  lower_limb: [
    { key: 'location', text: 'Where is the discomfort mainly located?',
      options: [
        { value: 'knee',      label: 'Knee' },
        { value: 'ankle',     label: 'Ankle / foot' },
        { value: 'hip',       label: 'Hip / groin' },
        { value: 'hamstring', label: 'Hamstring / back of thigh' },
        { value: 'calf',      label: 'Calf / Achilles' },
        { value: 'shin',      label: 'Shin / front of lower leg' },
        { value: 'quad',      label: 'Front of thigh / quadriceps' },
      ]
    },
    { key: 'onset', text: 'Did this start suddenly during activity, or come on gradually over days?',
      options: [{ value: 'sudden', label: 'Sudden (during activity)' }, { value: 'gradual', label: 'Gradually over days / weeks' }]
    },
    { key: 'weight_bearing', text: 'Can you put full weight through it comfortably?',
      options: [{ value: 'yes', label: 'Yes, fully' }, { value: 'partial', label: 'With difficulty or pain' }, { value: 'no', label: 'No — cannot bear weight' }]
    },
    { key: 'neurological', text: 'Is there any numbness, tingling, or pins and needles in the foot or leg?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'swelling', text: 'Is there significant swelling or bruising?',
      options: [{ value: 'yes', label: 'Yes, significant' }, { value: 'mild', label: 'Mild swelling' }, { value: 'no', label: 'No' }]
    },
    { key: 'pain_at_rest', text: 'Does the pain occur at rest, or mainly during activity?',
      options: [{ value: 'yes', label: 'Also at rest or at night' }, { value: 'no', label: 'Mainly during / after activity' }]
    },
  ],

  upper_limb: [
    { key: 'location', text: 'Where is the discomfort mainly located?',
      options: [
        { value: 'shoulder', label: 'Shoulder' },
        { value: 'elbow',    label: 'Elbow' },
        { value: 'wrist',    label: 'Wrist / hand' },
      ]
    },
    { key: 'onset', text: 'Did this start suddenly or come on gradually?',
      options: [{ value: 'sudden', label: 'Sudden' }, { value: 'gradual', label: 'Gradually' }]
    },
    { key: 'overhead', text: 'Can you raise your arm to shoulder height without significant pain?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'partial', label: 'With difficulty' }, { value: 'no', label: 'No' }]
    },
    { key: 'neurological', text: 'Is there numbness or tingling in your arm or hand?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'impact', text: 'Was there a direct impact, fall, or collision?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
  ],

  core_spine: [
    { key: 'location', text: 'Where is the pain located?',
      options: [
        { value: 'lumbar',   label: 'Lower back' },
        { value: 'thoracic', label: 'Upper / mid back' },
        { value: 'cervical', label: 'Neck' },
        { value: 'core',     label: 'Core / abdomen' },
      ]
    },
    { key: 'neurological', text: 'Is there any numbness, tingling, or weakness in your legs or arms?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'bowel_bladder', text: 'Any changes to bladder or bowel control?',
      options: [{ value: 'yes', label: 'Yes (any change)' }, { value: 'no', label: 'No' }]
    },
    { key: 'radiating', text: 'Does the pain travel down your leg or arm?',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
    },
    { key: 'onset', text: 'Did this come on suddenly or gradually?',
      options: [{ value: 'sudden', label: 'Sudden' }, { value: 'gradual', label: 'Gradually' }]
    },
  ],

  other: [
    { key: 'onset', text: 'Did this start suddenly or come on gradually?',
      options: [{ value: 'sudden', label: 'Suddenly' }, { value: 'gradual', label: 'Gradually' }]
    },
  ]
};

export function getQuestions(body_region) {
  return QUESTIONS[body_region] || QUESTIONS.other;
}

// Maps location answer → body_part_key
const LOCATION_TO_KEY = {
  knee: 'knee', ankle: 'ankle', hip: 'hip', hamstring: 'hamstring',
  calf: 'calf', shin: 'shin', quad: 'quad',
  shoulder: 'shoulder', elbow: 'elbow', wrist: 'wrist',
  lumbar: 'lumbar', thoracic: 'thoracic', cervical: 'cervical', core: 'core',
};

// Maps body_part_key → probable diagnosis_key when onset is gradual + activity-related
const GRADUAL_DIAGNOSIS = {
  knee:      'runners_knee',
  ankle:     'ankle_sprain',
  hamstring: 'hamstring_strain',
  hip:       'hip_flexor_strain',
  calf:      'achilles_tendinopathy',
  shin:      'shin_splints',
  quad:      'quad_strain',
  shoulder:  'shoulder_impingement',
  elbow:     'lateral_epicondylitis',
  wrist:     'wrist_sprain',
  lumbar:    'lower_back_strain',
  thoracic:  'thoracic_strain',
  cervical:  'neck_strain',
  core:      'abdominal_strain',
};

// Red-flag messages per trigger
const RED_FLAG_MESSAGES = {
  neurological:   'Numbness or tingling suggests nerve involvement. Please see a physiotherapist or GP before starting any rehab.',
  bowel_bladder:  'Changes to bladder or bowel control with back pain require urgent medical assessment. Please see a GP or go to A&E.',
  radiating:      'Pain radiating into the arm or leg suggests nerve root involvement. Please see a physiotherapist or GP.',
  cannot_wt_bear: 'Unable to bear weight with sudden onset and swelling may indicate a fracture or significant ligament injury. Please see a GP or physiotherapist.',
  cannot_raise:   'Inability to raise the arm with sudden onset and impact suggests a serious shoulder injury. Please see a GP or physiotherapist.',
};

/**
 * Assess symptom answers and return a result.
 * @param {string} body_region  'lower_limb' | 'upper_limb' | 'core_spine' | 'other'
 * @param {object} answers      { [question.key]: answer.value }
 * @returns {{ result: 'red_flag'|'probable'|'unclear', reason?, redirect_message?, body_part_key?, diagnosis_key?, confidence? }}
 */
export function assess(body_region, answers = {}) {
  const a = answers;

  // ── Core/spine red flags (strictest) ─────────────────────────────────────
  if (body_region === 'core_spine') {
    if (a.bowel_bladder === 'yes') return { result: 'red_flag', reason: 'bowel_bladder', redirect_message: RED_FLAG_MESSAGES.bowel_bladder };
    if (a.neurological === 'yes')  return { result: 'red_flag', reason: 'neurological',   redirect_message: RED_FLAG_MESSAGES.neurological };
    if (a.radiating === 'yes')     return { result: 'red_flag', reason: 'radiating',       redirect_message: RED_FLAG_MESSAGES.radiating };
    const key = LOCATION_TO_KEY[a.location] || 'lumbar';
    return { result: 'probable', body_part_key: key, diagnosis_key: GRADUAL_DIAGNOSIS[key] || null, confidence: 'low' };
  }

  // ── Lower limb red flags ──────────────────────────────────────────────────
  if (body_region === 'lower_limb') {
    if (a.neurological === 'yes') return { result: 'red_flag', reason: 'neurological', redirect_message: RED_FLAG_MESSAGES.neurological };
    if (a.onset === 'sudden' && a.weight_bearing === 'no' && (a.swelling === 'yes' || a.swelling === 'mild'))
      return { result: 'red_flag', reason: 'cannot_wt_bear', redirect_message: RED_FLAG_MESSAGES.cannot_wt_bear };
    const key = LOCATION_TO_KEY[a.location] || 'knee';
    const diagnosis = a.onset === 'sudden' ? null : GRADUAL_DIAGNOSIS[key] || null;
    return { result: 'probable', body_part_key: key, diagnosis_key: diagnosis, confidence: diagnosis ? 'medium' : 'low' };
  }

  // ── Upper limb red flags ──────────────────────────────────────────────────
  if (body_region === 'upper_limb') {
    if (a.neurological === 'yes') return { result: 'red_flag', reason: 'neurological', redirect_message: RED_FLAG_MESSAGES.neurological };
    if (a.onset === 'sudden' && a.overhead === 'no' && a.impact === 'yes')
      return { result: 'red_flag', reason: 'cannot_raise', redirect_message: RED_FLAG_MESSAGES.cannot_raise };
    const key = LOCATION_TO_KEY[a.location] || 'shoulder';
    const diagnosis = a.onset === 'sudden' ? null : GRADUAL_DIAGNOSIS[key] || null;
    return { result: 'probable', body_part_key: key, diagnosis_key: diagnosis, confidence: diagnosis ? 'medium' : 'low' };
  }

  return { result: 'unclear', body_part_key: 'other' };
}

export default { getQuestions, assess };
