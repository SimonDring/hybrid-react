import { scheduleWeek } from '@performance-os/engine/lib/plan/scheduler.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const spec = (focus, axialLoad) => ({ discipline: 'gym', focus, duration: '~45 min', items: [], intensity: 'hard', axialLoad, muscleVol: {} });

// Two high-axial sessions + one low, 3 of 7 days → high-axial must not be adjacent.
const out = scheduleWeek({ sportSpecs: [spec('A', 4), spec('B', 4), spec('C', 0)], dayNames: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] });
const highDays = out.filter(s => s.axialLoad >= 3).map(s => s.dayIdx).sort((a,b) => a - b);
assert(highDays.length === 2, `two high-axial days (got ${highDays.length})`);
assert((highDays[1] - highDays[0]) >= 2, `high-axial days not adjacent (got gap ${highDays[1]-highDays[0]})`);

console.log(process.exitCode ? 'axial-schedule FAILURES' : `PASS: axial-schedule — ${pass} assertions`);
