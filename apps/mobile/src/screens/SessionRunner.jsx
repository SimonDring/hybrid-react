import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { sessionKey } from '@performance-os/engine';
import RestTimer from '../components/RestTimer.jsx';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { ensureAudio } from '../lib/sound.js';
import SubstituteSheet from '../components/SubstituteSheet.jsx';
import SessionOverview from '../components/SessionOverview.jsx';
import InfoTip from '../components/ui/InfoTip.jsx';
import { GLOSSARY } from '../data/metricGlossary.js';
import { buildSteps } from '../lib/runnerSteps.js';
import { lastLoggedWeightFor } from '../lib/exerciseMeta.js';

const WEIGHT_STEP = 2.5;
// Midnight palette: primer = teal (the app's primary accent), main = neutral. No rust.
const SECTION_COLOR = { primer: 'var(--accent)', main: 'var(--txt-muted)' };

const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// buildSteps now lives in ../lib/runnerSteps.js (plain module, so it can be tested under
// node without a JSX parser). Re-exported here so nothing importing it from the screen breaks.
export { buildSteps };

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
  const key = sessionKey(Number(phaseId), Number(weekNum), Number(sessionIdx));
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
  const [overviewOpen, setOverviewOpen] = useState(false);
  const restingRef = useRef(false);          // guards against double-advance (skip + auto)
  const carryRef = useRef({});               // exerciseName → last actual {weight,reps,rpe}

  const step = steps[cursor] || null;

  // Most recent logged weight for this exercise from a PREVIOUS session (loadable core
  // work with no prescribed target, e.g. Pallof press). Computed once here so the
  // draft-seeding effect below and the "Last time" hint in the render agree. Keyed on
  // steps too: an in-session substitution rebuilds steps at the SAME cursor, and the
  // memo must re-resolve for the new exercise (steps is content-signature-memoized, so
  // no spurious recomputes). Once this session's carry covers the exercise (sets 2+),
  // the carry wins the seed and the hint would be stale — return null then. Reading
  // carryRef.current here is safe: it's mutated synchronously in logCurrentSet before
  // the cursor update triggers this memo.
  const lastTime = useMemo(() => {
    if (!step || step.kind !== 'set' || step.targetWeight != null || !step.collectWeight) return null;
    if (carryRef.current[step.exerciseName]) return null;   // in-session carry already covers this
    return lastLoggedWeightFor(step.exerciseName, setLogsBySession, sessionDbId);
  }, [cursor, steps]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Seed the draft on entering a set step: carry forward the last actual for this
  // exercise, else fall back to the prescribed target, else the last logged weight
  // from a previous session.
  useEffect(() => {
    if (!step || step.kind !== 'set') return;
    const carried = carryRef.current[step.exerciseName];
    setDraft({
      weight: carried?.weight ?? step.targetWeight ?? lastTime,
      reps: carried?.reps ?? step.targetReps,
      rpe: carried?.rpe ?? step.targetRpe
    });
    setResting(false);
    restingRef.current = false;
  }, [cursor, steps]);  // eslint-disable-line react-hooks/exhaustive-deps

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
  // Forward nav is blocked on an unlogged working set — you must log it to advance
  // (primer/prep steps and already-logged sets can be stepped past freely).
  const setUnlogged = step.kind === 'set' && !loggedSet.has(loggedKey(step.exerciseName, step.setIndex));
  const forwardDisabled = isLast || setUnlogged;

  // A step is "done" if it's behind the cursor, or (for a set) already logged.
  const isStepDone = (i) => {
    const st = steps[i];
    if (!st) return false;
    if (st.kind === 'set') return loggedSet.has(loggedKey(st.exerciseName, st.setIndex));
    return i < cursor;
  };

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

  // Manual step navigation (header arrows). Cancels any active rest, then moves the
  // cursor; a set step re-seeds its draft via the cursor effect.
  const goTo = (delta) => {
    setResting(false); setRestSeed(null); restingRef.current = false;
    setCursor(c => Math.max(0, Math.min(steps.length - 1, c + delta)));
  };

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
      actual_rpe: step.collectRpe === false ? null : draft.rpe,
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

  const hasWeight = step.kind === 'set' && step.collectWeight !== false
    && (step.targetWeight != null || step.weightLabel != null || step.collectWeight === true);

  return (
    <div className="runner" style={{ '--rn-color': color }}>
      {/* Header: progress + exit */}
      <div className="runner-head">
        <button className="runner-exit" onClick={() => navigate(detailPath)} aria-label="Exit runner">✕</button>
        <div className="runner-nav-group">
          <button className="runner-nav" onClick={() => goTo(-1)} disabled={cursor === 0} aria-label="Previous step">‹</button>
          <span className="runner-progress-text">Step {cursor + 1} of {steps.length}</span>
          <button className="runner-nav" onClick={() => goTo(1)} disabled={forwardDisabled} aria-label="Next step" title={setUnlogged ? 'Log this set to continue' : 'Next step'}>›</button>
        </div>
        <button className="runner-nav" onClick={() => setOverviewOpen(o => !o)} aria-label="Session overview">▼</button>
      </div>
      <div className="runner-bar"><div className="runner-bar-fill" style={{ width: `${((cursor) / steps.length) * 100}%` }} /></div>

      {overviewOpen && (
        <SessionOverview steps={steps} cursor={cursor} isStepDone={isStepDone} onClose={() => setOverviewOpen(false)} />
      )}

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
                {step.weightLabel
                  ? ` @ ${step.weightLabel}`
                  : (step.collectWeight === true ? ' · pick a load you can hold with good form' : '')}
                {step.collectRpe !== false ? ` @ RPE ${step.targetRpe}` : ''}
              </div>
              {lastTime != null && <div className="rn-target">Last time: {lastTime} kg</div>}

              <div className="rn-steppers">
                <Stepper label="Reps" value={draft.reps} onDec={() => bump('reps', -1, 0)} onInc={() => bump('reps', 1)} />
                <Stepper label="Weight" unit="kg" value={draft.weight} disabled={!hasWeight}
                  onDec={() => bump('weight', -WEIGHT_STEP, 0)} onInc={() => bump('weight', WEIGHT_STEP)} />
              </div>

              {step.collectRpe !== false && (
                <>
                  <div className="rn-rpe-label">RPE <InfoTip {...GLOSSARY.rpe} /></div>
                  <div className="rating-row">
                    {[6, 7, 8, 9, 10].map(n => (
                      <button key={n} className={`rating-btn ${draft.rpe === n ? 'selected' : ''}`} onClick={() => setDraft(d => ({ ...d, rpe: n }))}>{n}</button>
                    ))}
                  </div>
                </>
              )}

              <button className="btn-primary" style={{ width: '100%', marginTop: 22 }} onClick={logCurrentSet}>
                {isLast ? 'Log set & finish' : 'Log set'}
              </button>
              {step.setIndex === 1 && (
                <button className="btn-text" style={{ width: '100%', marginTop: 8 }} onClick={openSubstitute}>
                  Equipment taken? Substitute
                </button>
              )}
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
