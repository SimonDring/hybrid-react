// tests/derive-priority.js — retire-legacy P2: the priority list is derived from the exerciseLibrary.
import { derivePriorityExercises } from '@performance-os/engine/lib/sportKnowledge/derivePriority.js';
import { sportKnowledge as skb } from '@performance-os/engine';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }
const CAT = new Set(EXERCISES.map((e) => e.id));

// every migrated sport derives a non-empty, catalogue-joined priority list
for (const id of skb.ids()) {
  const d = derivePriorityExercises(skb.get(id), 'off');
  assert(d.length > 0 && d.every((x) => CAT.has(x)), `T1 ${id} derives a non-empty, catalogue-joined list`);
}

// ordered by transferToSportRating (highest first)
const p = skb.get('running_middle');
const derived = derivePriorityExercises(p, 'off');
const ratingById = new Map((p.exerciseLibrary.exercises || []).map((e) => [e.id, e.transferToSportRating ?? 5]));
let sorted = true;
for (let i = 1; i < derived.length; i++) if ((ratingById.get(derived[i - 1]) ?? 5) < (ratingById.get(derived[i]) ?? 5)) sorted = false;
assert(sorted, 'T2 derived list is ordered by transferToSportRating (desc)');

// phase filter: an in-season list drops exercises flagged suitableInSeason:false
const inS = derivePriorityExercises(p, 'in');
const inUnsuitable = (p.exerciseLibrary.exercises || []).filter((e) => e.suitableInSeason === false).map((e) => e.id);
assert(inUnsuitable.every((x) => !inS.includes(x)), 'T3 in-season list drops suitableInSeason:false movements');

// empty / unknown → empty (never throws)
assert(derivePriorityExercises(null, 'off').length === 0, 'T4 null profile → empty');
assert(derivePriorityExercises({ exerciseLibrary: { exercises: [] } }, 'off').length === 0, 'T5 empty library → empty');
