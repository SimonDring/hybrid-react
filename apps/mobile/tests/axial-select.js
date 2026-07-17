import { preferredMember, allocateGym } from '@performance-os/engine/lib/session/sessionBuilder.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };

// candidates with their axialLoad: barbell_row(2), db_row(1), chest_supported_row(0)
const cands = ['barbell_row','db_row','chest_supported_row'];
assert(preferredMember(cands, 0, 4) === 'barbell_row', 'fresh spine → head (barbell row)');
assert(preferredMember(cands, 4, 4) === 'chest_supported_row', 'spent spine → lowest-axial (chest-supported)');
assert(preferredMember(['barbell_row'], 4, 4) === 'barbell_row', 'no alternative → head regardless');

// session specs expose axialLoad
const sessions = allocateGym({
  targets: { back: 12, quads: 12, chest: 8 },
  slots: [{ minutes: 60 }],
  ctx: { style: 'strength', intent: 'base', level: 'advanced', sex: 'male',
         access: ['barbell','dumbbell','machine','cable','bodyweight'], exercisePriority: ['back_squat','barbell_row'] }
});
assert(typeof sessions[0].axialLoad === 'number', `session exposes axialLoad (got ${sessions[0].axialLoad})`);

console.log(process.exitCode ? 'axial-select FAILURES' : `PASS: axial-select — ${pass} assertions`);
