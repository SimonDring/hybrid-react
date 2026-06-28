import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '@performance-os/engine/lib/Utils.js';
import { parseExercise } from '@performance-os/engine/lib/Utils.js';
import { matchLift, parseReps, parseRpe } from '@performance-os/engine/lib/liftProgression.js';
import RestTimer from '../components/RestTimer.jsx';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { ensureAudio } from '../lib/sound.js';
import SubstituteSheet from '../components/SubstituteSheet.jsx';

const WEIGHT_STEP = 2.5;
// Midnight palette: primer = teal (the app's primary accent), main = neutral. No rust.
const SECTION_COLOR = { primer: 'var(--accent)', main: 'var(--txt-muted)' };

// Numeric weight from a target string ("82.5 kg" → 82.5, "15 kg/hand" → 15, "—" → null).
function parseWeight(s) { const m = /([\d.]+)/.exec(s || ''); return m ? Number(m[1]) : null; }
// Leading set count from a prescription ("2 × 15" → 2) — drives the primer circuit rounds.
function setsCount(s) { const m = /^(\d+)\s*[×x]/.exec(s || ''); return m ? Number(m[1]) : null; }
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Expand a session into an ordered list of STEPS for the runner.
 *  • primer items                → a CIRCUIT: one `primerRound` step per round, each
 *    listing every primer move (no per-move rest, not logged).
 *  • non-strength main item       → one `prep` step (do it, tap Done — not logged)
 *  • strength item "N × R"        → N `set` steps (weight/reps/RPE, logged)
 *  • supersets (same group)       → interleaved by round (A1·s1, A2·s1, rest, A1·s2 …);
 *    only the last set of each round carries the real rest.
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
        note: it.note || it.cue || ''
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

function Stepper({ label, value, unit, onDec, onInc, disabled }) {
  return (
    <div className="rn-stepper">
      <div className="rn-stepper-label">{label}</div>
      <div className="rn-stepper-row">
        <button className="rn-step-btn" onClick={onDec} disabled={disabled} aria-label={`decrease ${label}`}>−</button>
        <div className="rn-step-val">{disabled ? '—' : (value ?? '—')}{!disabled && unit ? <span className="rn-step-unit">{unit}</span> : null}</div>
        <button className="rn-step-btn" onClick={onInc} disabled={disabled} aria-label={`increase ${label}`}>+</button>
      </div>
    </div>
  );
}

export default function SessionRunner() {
  const { phaseId, weekNum, sessionIdx } = useParams();
  const navigate = useNavigate();
  const sessions = useTrainingStore(s => s.sessions);
  const setLogsBySession = useTrainingStore(s => s.setLogsBySession);
  const logSet = useTrainingStore(s => s.logSet);
  const substituteExercise = useTrainingStore(s => s.substituteExercise);
  const substituteOptionsFor = useTrainingStore(s => s.substituteOptionsFor);

  // Keep the screen awake for the whole focused session so it never auto-locks
  // between sets or during rest (the rest timer stays visible + its alarm fires).
  useWakeLock(true);

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  const session = week ? week.sessions[Number(sessionIdx)] : null;
  const key = Utils.weekKey(Number(phaseId), Number(weekNum), Number(sessionIdx));
  const state = sessions[key];
  const sessionDbId = state ? state.id : null;
  const detailPath = `/phases/${phaseId}/weeks/${weekNum}/sessions/${sessionIdx}`;

  // Build steps from the session's CONTENT signature, not its object identity —
  // PlanService hands back a fresh object every render, so an identity memo would
  // rebuild each render and reset the steppers mid-set. The signature is stable while
  // training and changes only when an exercise is substituted (a session-only swap),
  // which then correctly rebuilds the affected steps.
  const stepsSig = session
    ? session.items.filter(it => !it.substituted).map(it => `${it.name}|${it.sets}|${it.section || ''}`).join(';')
    : '';
  const steps = useMemo(() => (session ? buildSteps(session) : []), [stepsSig]);  // eslint-disable-line react-hooks/exhaustive-deps
  const logs = (sessionDbId && setLogsBySession[sessionDbId]) || [];
  const loggedKey = (name, idx) => `${name}__${idx}`;
  const loggedSet = useMemo(
    () => new Set(logs.filter(l => !l.is_primer).map(l => loggedKey(l.exercise_name, l.set_index))),
    [logs]
  );

  // Cursor: fresh start → step 0 (do the primer); resume (logs exist) → first set
  // not yet logged, skipping the primer you've already done.
  const [cursor, setCursor] = useState(() => {
    if (!steps.length || !logs.length) return 0;
    const i = steps.findIndex(st => st.kind === 'set' && !loggedSet.has(loggedKey(st.exerciseName, st.setIndex)));
    return i < 0 ? steps.length : i;
  });

  const [draft, setDraft] = useState({ weight: null, reps: null, rpe: null });
  const [resting, setResting] = useState(false);
  const [restSeed, setRestSeed] = useState(null);
  const [subSheet, setSubSheet] = useState(null);   // { originalName, options } when open
  const restingRef = useRef(false);          // guards against double-advance (skip + auto)
  const carryRef = useRef({});               // exerciseName → last actual {weight,reps,rpe}

  const step = steps[cursor] || null;

  // Seed the draft on entering a set step: carry forward the last actual for this
  // exercise, else fall back to the prescribed target.
  useEffect(() => {
    if (!step || step.kind !== 'set') return;
    const carried = carryRef.current[step.exerciseName];
    setDraft({
      weight: carried?.weight ?? step.targetWeight,
      reps: carried?.reps ?? step.targetReps,
      rpe: carried?.rpe ?? step.targetRpe
    });
    setResting(false);
    restingRef.current = false;
  }, [cursor, steps]);

  // All steps already logged on entry → straight to completion.
  useEffect(() => {
    if (steps.length && cursor >= steps.length) navigate(`${detailPath}?finish=1`);
  }, [cursor, steps.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return <div style={{ padding: 24 }}>Session not found</div>;
  if (!state || !state.started) {
    return (
      <div style={{ padding: 24 }}>
        <p className="sub" style={{ marginBottom: 16 }}>This session hasn't been started yet.</p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate(detailPath)}>Back to session</button>
      </div>
    );
  }
  if (!step) return null;  // finishing (effect navigates)

  const isLast = cursor + 1 >= steps.length;
  const color = SECTION_COLOR[step.section] || 'var(--txt-muted)';
  const next = steps[cursor + 1] || null;

  const advanceAfterRest = (restSec) => {
    ensureAudio();   // unlock audio within this tap so the rest-end beep can play later
    if (restSec > 0 && !isLast) {
      restingRef.current = true;
      setRestSeed({ secs: restSec, at: Date.now() });
      setResting(true);
    } else {
      goNext();
    }
  };

  const goNext = () => {
    setResting(false);
    setRestSeed(null);
    restingRef.current = false;
    if (isLast) navigate(`${detailPath}?finish=1`);
    else setCursor(c => c + 1);
  };

  // Skip + timer-complete both route here; the ref ensures we advance only once.
  const endRest = () => { ensureAudio(); if (!restingRef.current) return; restingRef.current = false; goNext(); };

  // Equipment unavailable → open same-muscle alternatives for the current exercise.
  const openSubstitute = () => {
    setSubSheet({ originalName: step.exerciseName, options: substituteOptionsFor(step.item) });
  };
  // Swap this session only (local override). The content-signature step memo rebuilds
  // the affected steps; the cursor stays on the current set, now the new exercise.
  const applySubstitute = (option) => {
    substituteExercise(key, step.exerciseName, option);
    setSubSheet(null);
  };

  const logCurrentSet = () => {
    ensureAudio();   // unlock audio within this tap so the rest-end beep can play later
    carryRef.current[step.exerciseName] = { weight: draft.weight, reps: draft.reps, rpe: draft.rpe };
    logSet({
      id: `${sessionDbId}_${slug(step.exerciseName)}_${step.setIndex}`,
      session_id: sessionDbId,
      exercise_key: step.liftKey || null,
      exercise_name: step.exerciseName,
      section: step.section,
      set_index: step.setIndex,
      target_weight: step.targetWeight,
      target_reps: step.targetReps,
      target_rpe: step.targetRpe,
      actual_weight: draft.weight,
      actual_reps: draft.reps,
      actual_rpe: draft.rpe,
      is_primer: false,
      completed_at: new Date().toISOString()
    });
    advanceAfterRest(step.restSec);
  };

  const bump = (field, delta, min) => setDraft(d => {
    const cur = d[field] == null ? 0 : d[field];
    let nextVal = Math.round((cur + delta) * 100) / 100;
    if (min != null && nextVal < min) nextVal = min;
    return { ...d, [field]: nextVal };
  });

  const hasWeight = step.kind === 'set' && (step.targetWeight != null || step.weightLabel != null);

  return (
    <div className="runner" style={{ '--rn-color': color }}>
      {/* Header: progress + exit */}
      <div className="runner-head">
        <button className="runner-exit" onClick={() => navigate(detailPath)} aria-label="Exit runner">✕</button>
        <div className="runner-progress-text">Step {cursor + 1} of {steps.length}</div>
        <div style={{ width: 32 }} />
      </div>
      <div className="runner-bar"><div className="runner-bar-fill" style={{ width: `${((cursor) / steps.length) * 100}%` }} /></div>

      {resting ? (
        <div className="runner-body">
          <div className="rn-rest">
            <div className="rn-section" style={{ color: 'var(--txt-muted)' }}>REST</div>
            <RestTimer restStart={restSeed} onComplete={endRest} />
            {next && (
              <div className="rn-next">
                Up next: <strong>{next.exerciseName}</strong>
                {next.kind === 'set' ? ` · set ${next.setIndex} of ${next.totalSets}` : ''}
              </div>
            )}
            <button className="btn-primary" style={{ width: '100%', marginTop: 18 }} onClick={endRest}>Skip rest</button>
          </div>
        </div>
      ) : (
        <div className="runner-body">
          <div className="rn-section" style={{ color }}>{step.section === 'primer' ? 'PRIMER' : 'MAIN'}</div>
          <h1 className="rn-name">{step.kind === 'primerRound' ? 'Primer circuit' : step.exerciseName}</h1>

          {step.kind === 'primerRound' ? (
            <div className="step-card">
              <div className="rn-setline" style={{ color }}>Round {step.round} of {step.totalRounds}</div>
              <div className="rn-circuit">
                {step.moves.map((m, i) => (
                  <div className="rn-circuit-move" key={i}>
                    <span className="rn-cm-name">{m.name}</span>
                    {m.reps != null && <span className="rn-cm-reps">× {m.reps}</span>}
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: 22 }} onClick={() => advanceAfterRest(0)}>
                {isLast ? 'Finish' : (step.round < step.totalRounds ? `Start round ${step.round + 1}` : 'Start main')}
              </button>
            </div>
          ) : step.kind === 'prep' ? (
            <div className="step-card">
              <div className="rn-prescription">{step.prescription}{step.rpe ? ` · ${step.rpe}` : ''}</div>
              {step.note && <div className="rn-note">{step.note}</div>}
              <button className="btn-primary" style={{ width: '100%', marginTop: 22 }} onClick={() => advanceAfterRest(step.restSec)}>
                {isLast ? 'Finish' : 'Done'}
              </button>
            </div>
          ) : (
            <div className="step-card">
              <div className="rn-setline">Set {step.setIndex} of {step.totalSets}</div>
              <div className="rn-target">
                Target: {step.targetReps ?? step.repsLabel} reps
                {step.weightLabel ? ` @ ${step.weightLabel}` : ''} @ RPE {step.targetRpe}
              </div>

              <div className="rn-steppers">
                <Stepper label="Reps" value={draft.reps} onDec={() => bump('reps', -1, 0)} onInc={() => bump('reps', 1)} />
                <Stepper label="Weight" unit="kg" value={draft.weight} disabled={!hasWeight}
                  onDec={() => bump('weight', -WEIGHT_STEP, 0)} onInc={() => bump('weight', WEIGHT_STEP)} />
              </div>

              <div className="rn-rpe-label">RPE</div>
              <div className="rating-row">
                {[6, 7, 8, 9, 10].map(n => (
                  <button key={n} className={`rating-btn ${draft.rpe === n ? 'active' : ''}`} onClick={() => setDraft(d => ({ ...d, rpe: n }))}>{n}</button>
                ))}
              </div>

              <button className="btn-primary" style={{ width: '100%', marginTop: 22 }} onClick={logCurrentSet}>
                {isLast ? 'Log set & finish' : 'Log set'}
              </button>
              <button className="btn-text" style={{ width: '100%', marginTop: 8 }} onClick={openSubstitute}>
                Equipment taken? Substitute
              </button>
            </div>
          )}

          {step.note && step.kind === 'set' && <div className="rn-note" style={{ marginTop: 14 }}>{step.note}</div>}
        </div>
      )}

      {subSheet && (
        <SubstituteSheet
          originalName={subSheet.originalName}
          options={subSheet.options}
          onPick={applySubstitute}
          onClose={() => setSubSheet(null)}
        />
      )}
    </div>
  );
}
