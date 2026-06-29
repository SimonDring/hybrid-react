// tests/sport-schedule-availability.js — gym routes around swim days for ANY availability.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
const FULL = ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const NAME2KEY = { Monday:'mon', Tuesday:'tue', Wednesday:'wed', Thursday:'thu', Friday:'fri', Saturday:'sat', Sunday:'sun' };
const A = (o) => ({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', experienceLevel: 'intermediate', sex: 'male', daysPerWeek: 3, equipment: FULL, sportIntent: 'recreational', sportGoal: 'build_base', sportDays: ['tue','thu','sat'], ...o });
let fails = 0;
const gymDayKeys = (answers) => {
  const plan = generatePlan(answersToProfile(answers));
  return plan.phases[0].weeks[0].sessions.map(s => NAME2KEY[(s.title || '').split(' · ')[0]] || (s.title || ''));
};
const noClash = (keys, msg) => { const swim = new Set(['tue','thu','sat']); const clash = keys.filter(k => swim.has(k)); const ok = clash.length === 0; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (clash on ${clash.join(',')})`)); if (!ok) fails++; };

// All weekdays available → must NOT land on tue/thu/sat, and must be evenly spread.
const all = gymDayKeys(A({ days: ['mon','tue','wed','thu','fri','sat','sun'] }));
noClash(all, 'all-days availability avoids swim days');
console.log('  resolved gym days:', JSON.stringify(all));
{ const ok = JSON.stringify(all) === JSON.stringify(['mon','wed','fri']); console.log((ok ? 'PASS' : 'FAIL') + ': all-days resolves to evenly-spread Mon/Wed/Fri' + (ok ? '' : ` (got ${JSON.stringify(all)})`)); if (!ok) fails++; }

// Mon–Fri available → still avoids tue/thu.
noClash(gymDayKeys(A({ days: ['mon','tue','wed','thu','fri'] })), 'mon-fri availability avoids swim days');

// Blank availability → unchanged suggestGymDays behaviour, still no clash.
noClash(gymDayKeys(A({ days: [] })), 'blank availability avoids swim days');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
