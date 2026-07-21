import { parseExercise } from './uiHelpers.js';
import { matchLift, parseReps, parseRpe } from '@performance-os/engine';
import { classifyItem } from './exerciseMeta.js';

// Numeric weight from a target string ("82.5 kg" → 82.5, "15 kg/hand" → 15, "—" → null).
export function parseWeight(s) { const m = /([\d.]+)/.exec(s || ''); return m ? Number(m[1]) : null; }
// Leading set count from a prescription ("2 × 15" → 2) — drives the primer circuit rounds.
export function setsCount(s) { const m = /^(\d+)\s*[×x]/.exec(s || ''); return m ? Number(m[1]) : null; }

/**
 * Expand a session into an ordered list of STEPS for the runner.
 *  • primer items                → a CIRCUIT: one `primerRound` step per round, each
 *    listing every primer move (no per-move rest, not logged).
 *  • non-strength main item       → one `prep` step (do it, tap Done — not logged)
 *  • strength item "N × R"        → N `set` steps (weight/reps/RPE, logged)
 *  • supersets (same group)       → interleaved by round (A1·s1, A2·s1, rest, A1·s2 …);
 *    only the last set of each round carries the real rest.
 *
 * Each `set` step is stamped with `collectRpe`/`collectWeight` from the Task-1 classifier
 * (packages/engine catalogue lookup via exerciseMeta.js): mobility/rehab items never reach
 * this path (classifyItem's `simpleDone` routes them to `makePrep` instead); loadable core
 * work collects weight + RPE; unresolvable items keep legacy (full-collection) behaviour.
 */
export function buildSteps(session) {
  const allItems = (session.items || []).filter(it => !it.substituted);
  const primerItems = allItems.filter(it => it.section === 'primer');
  const mainItems = allItems.filter(it => it.section !== 'primer');
  const steps = [];

  // Primer → a short CIRCUIT: one step per round, each listing every primer move.
  // Rounds come from the primer moves' set count (e.g. "2 × 15" → 2 rounds).
  if (primerItems.length) {
    const counts = primerItems.map(it => setsCount(it.sets)).filter(Boolean);
    const rounds = counts.length ? Math.max(...counts) : 2;
    const moves = primerItems.map(it => ({ name: it.name, reps: parseReps(it.sets), note: it.note || it.cue || '' }));
    for (let r = 1; r <= rounds; r++) {
      steps.push({ kind: 'primerRound', section: 'primer', round: r, totalRounds: rounds, moves });
    }
  }

  // Main work → set-by-set. Group consecutive supersetted items (same group) into a block.
  const blocks = [];
  mainItems.forEach(it => {
    const last = blocks[blocks.length - 1];
    if (it.superset && it.group && last && last.superset && last.group === it.group) last.items.push(it);
    else blocks.push({ superset: !!it.superset, group: it.group, items: [it] });
  });

  const makeSetSteps = (it) => {
    const cls = classifyItem(it);
    if (cls.simpleDone) return [];
    const p = parseExercise(it);
    if (p.type !== 'strength') return [];
    const lift = matchLift(it.name);
    const arr = [];
    for (let s = 1; s <= p.sets; s++) {
      arr.push({
        kind: 'set', item: it, section: it.section || 'main', exerciseName: it.name,
        setIndex: s, totalSets: p.sets,
        targetReps: parseReps(it.sets), repsLabel: p.reps,
        targetWeight: parseWeight(it.weight),
        weightLabel: (it.weight && it.weight !== '—') ? it.weight : null,
        targetRpe: parseRpe(it.rpe),
        restSec: it.restSec || 0,
        liftKey: lift ? lift.key : null,
        note: it.note || it.cue || '',
        collectRpe: cls.collectRpe,
        collectWeight: cls.collectWeight
      });
    }
    return arr;
  };

  const makePrep = (it) => ({
    kind: 'prep', item: it, section: it.section || 'main', exerciseName: it.name,
    prescription: it.sets || '', rpe: (it.rpe || '').replace(/^RPE\s+/i, ''),
    restSec: it.restSec || 0, note: it.note || it.cue || ''
  });

  blocks.forEach(block => {
    if (block.items.length === 1) {
      const it = block.items[0];
      const sets = makeSetSteps(it);
      if (sets.length === 0) steps.push(makePrep(it));   // non-strength main (run/swim/mobility)
      else steps.push(...sets);
    } else {
      const perMember = block.items.map(it => makeSetSteps(it));
      const rounds = Math.max(0, ...perMember.map(s => s.length));
      for (let r = 0; r < rounds; r++) {
        const round = perMember.map(s => s[r]).filter(Boolean);
        round.forEach((st, i) => {
          st.restSec = i === round.length - 1 ? (st.restSec || 0) : 0;  // rest once per round
          steps.push(st);
        });
      }
    }
  });

  return steps;
}
