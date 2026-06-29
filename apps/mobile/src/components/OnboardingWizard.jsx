/**
 * OnboardingWizard — the shared first-run questionnaire UI (strength-focused).
 *
 * Lean flow: Welcome → About you → Goal (Build me vs Support a sport) → goal detail
 * → Experience → Capacity (days/length/equipment) → optional main lifts → injuries
 * → summary. The plan is always a GYM plan; "support a sport" biases the strength
 * program rather than adding endurance sessions. Answer→profile mapping lives in
 * src/lib/onboardingModel.js. Used by the production Onboarding screen + /dev tester.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { BLANK_ANSWERS, localISODate, resolveStartDate, answersToProfile } from '../lib/onboardingModel.js';
import { epley1RM, pullupE1RM } from '@performance-os/engine/lib/liftProgression.js';
import { suggestGymDays } from '@performance-os/engine/lib/plan/constraints.js';
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';

// ---- Option catalogues ----
export const GOAL_TYPES = [
  { key: 'build', label: 'Build me', hint: 'Strength, muscle or functional fitness', emoji: '🏋️' },
  { key: 'sport', label: 'Support a sport', hint: 'Strength to power your running, cycling or swimming', emoji: '🎯' }
];
export const STYLES = [
  { key: 'strength',     label: 'Get stronger',       hint: 'Heavy, low reps, the big lifts' },
  { key: 'bodybuilding', label: 'Build muscle',       hint: 'Moderate–high reps, more volume' },
  { key: 'functional',   label: 'Functional fitness', hint: 'Compounds, carries, core — athletic & desk-counter' }
];
export const SPORTS = skb.selectable().map(p => ({ key: p.id, label: p.label, emoji: (p.meta && p.meta.emoji) || '🎯' }));
const SPORT_INTENTS = [
  { key: 'compete',      label: 'I compete',        hint: 'Races or events — training stays sport-specific.' },
  { key: 'recreational', label: 'For fitness',      hint: 'No events planned — balanced programme with sport support.' },
  { key: 'build_base',   label: 'Building my base', hint: 'No events right now — maximise strength and conditioning.' }
];
const SPORT_INTENT_QUESTION = {
  run:   'Why do you run?',
  cycle: 'Why do you cycle?',
  swim:  'Why do you swim?'
};

const LEVELS = [
  { key: 'beginner', label: 'Beginner', hint: 'New to lifting' },
  { key: 'returning', label: 'Returning', hint: 'Back after a break' },
  { key: 'intermediate', label: 'Intermediate', hint: 'Consistent for a while' },
  { key: 'advanced', label: 'Advanced', hint: 'Years under the bar' }
];
const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' }
];
const START_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'monday', label: 'Next Monday' },
  { key: 'date', label: 'Pick a date' }
];
// Quick presets that fill the equipment set in one tap…
const EQUIPMENT_PRESETS = [
  { key: 'full_gym', label: 'Full gym', hint: 'Barbells, machines, cables', equip: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'] },
  { key: 'home_weights', label: 'Home / free weights', hint: 'Dumbbells, maybe a barbell', equip: ['barbell', 'dumbbell', 'kettlebell', 'band', 'bodyweight'] },
  { key: 'dumbbells', label: 'Dumbbells only', hint: 'A pair of dumbbells', equip: ['dumbbell', 'bodyweight'] },
  { key: 'bands', label: 'Bands only', hint: 'Resistance bands', equip: ['band', 'bodyweight'] },
  { key: 'bodyweight', label: 'Bodyweight only', hint: 'No equipment', equip: ['bodyweight'] }
];
// …or fine-tune the exact kit.
const EQUIPMENT_ITEMS = [
  { key: 'barbell', label: 'Barbell' }, { key: 'dumbbell', label: 'Dumbbells' },
  { key: 'machine', label: 'Machines' }, { key: 'cable', label: 'Cables' },
  { key: 'band', label: 'Bands' }, { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'bodyweight', label: 'Bodyweight' }
];
const sameSet = (a = [], b = []) => a.length === b.length && a.every(x => b.includes(x));
const equipLabel = (equip = []) =>
  EQUIPMENT_PRESETS.find(p => sameSet(equip, p.equip))?.label
  || (equip.length ? equip.map(k => EQUIPMENT_ITEMS.find(i => i.key === k)?.label || k).join(', ') : '—');

// ---- shared styles ----
const INPUT = {
  width: '100%', minWidth: 0, maxWidth: '100%', fontSize: 16, padding: '12px 14px', borderRadius: 11, border: '1px solid var(--hairline)',
  background: 'var(--bg-surface)', fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box'
};
const FIELD_LABEL = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.6, marginBottom: 6, textTransform: 'uppercase' };
const HINT = { fontSize: 11, color: 'var(--txt-muted)', marginTop: 6, lineHeight: 1.4 };

// ---- UI atoms ----
function Chip({ selected, onClick, label, hint, emoji, center }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      minHeight: emoji ? 62 : (hint ? 58 : 46),
      padding: emoji ? '12px 14px' : '10px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--hairline)'}`,
      background: selected ? 'rgba(111,211,196,0.12)' : 'var(--bg-surface)', color: 'var(--txt-strong)',
      transition: 'border-color 0.12s, background 0.12s',
      display: 'flex', alignItems: 'center', justifyContent: center && !emoji ? 'center' : 'flex-start', gap: emoji ? 12 : 0,
      textAlign: center && !emoji ? 'center' : 'left'
    }}>
      {emoji && <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--txt-muted)', lineHeight: 1.3 }}>{hint}</span>}
      </span>
    </button>
  );
}
function OptionGrid({ cols = 2, gap = 8, fill = false, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: '1fr', gap, ...(fill ? { height: '100%' } : {}) }}>
      {children}
    </div>
  );
}
function Field({ label, value, onChange, type = 'text', placeholder = '', suffix }) {
  return (
    <div>
      <label style={FIELD_LABEL}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type={type} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={INPUT}
          inputMode={type === 'number' ? 'decimal' : undefined} />
        {suffix && <span style={{ fontSize: 13, color: 'var(--txt-muted)', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}
function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', minWidth: 84 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--txt-strong)', flex: 1 }}>{value}</div>
    </div>
  );
}
// Small inline pill toggle (used for the pull-up vs lat-pulldown choice).
function MiniToggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--hairline)'}`,
      background: on ? 'rgba(111,211,196,0.12)' : 'var(--bg-surface)', color: 'var(--txt-strong)'
    }}>{label}</button>
  );
}
// A quick-test row: a weight + reps (or reps only for pull-ups) with a live e1RM readout.
function TestRow({ label, weight, reps, onWeight, onReps, e1rm, repsOnly }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: repsOnly ? '1fr auto' : '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
      <div>
        <label style={FIELD_LABEL}>{label}</label>
        {repsOnly
          ? <input type="number" inputMode="numeric" placeholder="reps" value={reps ?? ''} onChange={e => onReps(e.target.value)} style={INPUT} />
          : <input type="number" inputMode="decimal" placeholder="kg" value={weight ?? ''} onChange={e => onWeight(e.target.value)} style={INPUT} />}
      </div>
      {!repsOnly && (
        <div>
          <label style={FIELD_LABEL}>Reps</label>
          <input type="number" inputMode="numeric" placeholder="reps" value={reps ?? ''} onChange={e => onReps(e.target.value)} style={INPUT} />
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--txt-muted)', paddingBottom: 12, minWidth: 62, textAlign: 'right' }}>
        {e1rm ? <span><b style={{ color: 'var(--txt-strong)' }}>{e1rm}</b> kg</span> : '—'}
      </div>
    </div>
  );
}

export default function OnboardingWizard({ initialAnswers, onComplete, onAnswersChange, devTools = false, completeLabel = 'Create my plan' }) {
  const [a, setA] = useState({ ...BLANK_ANSWERS, ...(initialAnswers || {}) });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  const set = (patch) => setA(prev => ({ ...prev, ...patch }));
  const toggle = (key, listName) => set({ [listName]: a[listName].includes(key) ? a[listName].filter(k => k !== key) : [...a[listName], key] });

  // Quick-test scratch (raw weight/reps the user types); the COMPUTED e1RM lands in
  // a.lifts via setLift, tagged 'tested' so the model doesn't re-normalise it.
  const [test, setTest] = useState({});
  const setLift = (key, value, source) => setA(prev => {
    const lifts = { ...prev.lifts, [key]: value };
    const liftsSource = { ...(prev.liftsSource || {}) };
    if (source) liftsSource[key] = source; else delete liftsSource[key];
    return { ...prev, lifts, liftsSource };
  });

  const changeRef = useRef(onAnswersChange);
  changeRef.current = onAnswersChange;
  useEffect(() => { if (changeRef.current) changeRef.current(a); }, [a]);

  const isBuild = a.goalType === 'build';
  const isSport = a.goalType === 'sport';

  // Engine's recommended day count from goal + experience; the slider defaults here.
  const optimalDays = useMemo(() => {
    try { return suggestOptimalFrequency(answersToProfile(a)).optimalDays; }
    catch { return 3; }
  }, [a.goalType, a.strengthStyle, a.sport, a.runDiscipline, a.sportIntent, a.experienceLevel]);

  // Default the slider to the optimum once, when the user first lands without a pick.
  useEffect(() => {
    if (a.daysPerWeek == null) set({ daysPerWeek: optimalDays });
  }, [optimalDays]);

  const hasBarbell = (a.equipment || []).includes('barbell');
  const hasCable = (a.equipment || []).includes('cable');
  const hasBodyweight = (a.equipment || []).includes('bodyweight');
  const showLifts = hasBarbell || hasCable || hasBodyweight;

  const steps = [
    { hero: true, valid: () => true,
      render: () => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 8px' }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, marginBottom: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, background: 'linear-gradient(145deg, #6FD3C4, #3BA89A)', boxShadow: '0 12px 34px rgba(111,211,196,0.30)' }}>🏋️</div>
          <h1 style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--txt-strong)', margin: '0 0 10px' }}>Welcome</h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt-strong)', margin: '0 0 8px' }}>Strength training, built around you.</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--txt-muted)', maxWidth: 320, margin: 0 }}>
            A handful of quick questions and we'll build a science-based plan for your goal, your time and your kit — then adapt it as life happens.
          </p>
        </div>
      ) },

    { title: 'About you', subtitle: 'The basics tailor your volumes, loads and recovery.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="Name" value={a.name} onChange={v => set({ name: v })} placeholder="Your name" />
          <Field label="Age" value={a.age} onChange={v => set({ age: v })} type="number" suffix="yrs" />
          <div>
            <label style={FIELD_LABEL}>Sex</label>
            <OptionGrid cols={3} gap={6}>
              {['male', 'female', 'other'].map(s => (
                <Chip key={s} center selected={a.sex === s} onClick={() => set({ sex: s })} label={s[0].toUpperCase() + s.slice(1)} />
              ))}
            </OptionGrid>
            <div style={HINT}>Used only to set sensible starting loads & rep tuning.</div>
          </div>
          <Field label="Bodyweight" value={a.bodyweight_kg} onChange={v => set({ bodyweight_kg: v })} type="number" suffix="kg" />
        </div>
      ) },

    { title: "What's your goal?", subtitle: 'Everything is built in the gym — pick what it should serve.', valid: () => !!a.goalType,
      render: () => <OptionGrid cols={1}>{GOAL_TYPES.map(g => <Chip key={g.key} emoji={g.emoji} selected={a.goalType === g.key} onClick={() => set({ goalType: g.key })} label={g.label} hint={g.hint} />)}</OptionGrid> },

    isBuild && { title: 'What are you building?', subtitle: 'This sets your rep ranges, exercise mix and volume.', valid: () => !!a.strengthStyle,
      render: () => <OptionGrid cols={1}>{STYLES.map(s => <Chip key={s.key} selected={a.strengthStyle === s.key} onClick={() => set({ strengthStyle: s.key })} label={s.label} hint={s.hint} />)}</OptionGrid> },

    isSport && { title: 'Which sport — and where are you?', subtitle: 'We program supportive strength: heavier, lower-volume, tuned to your sport.', valid: () => !!a.sport && !!a.sportIntent && (() => { const d = skb.get(a.sport) && skb.get(a.sport).meta && skb.get(a.sport).meta.disciplines; return !d || !!a.runDiscipline; })(),
      render: () => (
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={FIELD_LABEL}>Sport</label>
            <OptionGrid cols={3}>{SPORTS.map(s => <Chip key={s.key} emoji={s.emoji} center selected={a.sport === s.key} onClick={() => set({ sport: s.key, runDiscipline: '' })} label={s.label} />)}</OptionGrid>
          </div>
          {(() => { const d = skb.get(a.sport) && skb.get(a.sport).meta && skb.get(a.sport).meta.disciplines; return d ? (
            <div>
              <label style={FIELD_LABEL}>What distance do you run?</label>
              <OptionGrid cols={3}>
                {d.map(disc => (
                  <Chip key={disc.key} center selected={a.runDiscipline === disc.key}
                    onClick={() => set({ runDiscipline: disc.key })}
                    label={disc.label} hint={disc.hint} />
                ))}
              </OptionGrid>
            </div>
          ) : null; })()}
          <div>
            <label style={FIELD_LABEL}>{SPORT_INTENT_QUESTION[a.sport] || 'How do you train?'}</label>
            <OptionGrid cols={1} gap={6}>
              {SPORT_INTENTS.map(opt => (
                <Chip key={opt.key} selected={a.sportIntent === opt.key} onClick={() => set({ sportIntent: opt.key })} label={opt.label} hint={opt.hint} />
              ))}
            </OptionGrid>
          </div>
          {a.sportIntent === 'compete' && (
            <div>
              <label style={FIELD_LABEL}>Next event date <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none', fontSize: 10, letterSpacing: 0 }}>(optional)</span></label>
              <input
                type="date"
                style={INPUT}
                value={a.eventDate || ''}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => set({ eventDate: e.target.value })}
              />
              <div style={HINT}>Used to auto-size the block length and track your season. Leave blank if unsure.</div>
            </div>
          )}
        </div>
      ) },

    isSport && { title: 'When do you train your sport?', subtitle: 'We’ll build your gym days around these so they don’t clash.',
      valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Sport days (optional)</label>
            <OptionGrid cols={4}>
              {DAYS.map(d => (
                <Chip key={d.key} center selected={a.sportDays.includes(d.key)}
                  onClick={() => {
                    const sportDays = a.sportDays.includes(d.key)
                      ? a.sportDays.filter(k => k !== d.key)
                      : [...a.sportDays, d.key];
                    const patch = { sportDays };
                    // Only auto-fill gym days the user hasn't customised yet.
                    if ((a.days || []).length === 0 && a.daysPerWeek) {
                      patch.days = suggestGymDays({ sportDays, gymDays: a.daysPerWeek });
                    }
                    set(patch);
                  }} label={d.label} />
              ))}
            </OptionGrid>
          </div>
          <div style={HINT}>
            Tell us the days you swim/run/ride and we’ll keep heavy gym work off them — and lighten anything that has to share a day.
          </div>
        </div>
      ) },

    { title: 'Your lifting experience', subtitle: 'How much strength training have you done?', valid: () => !!a.experienceLevel,
      render: () => <OptionGrid cols={2} fill>{LEVELS.map(l => <Chip key={l.key} center selected={a.experienceLevel === l.key} onClick={() => set({ experienceLevel: l.key })} label={l.label} hint={l.hint} />)}</OptionGrid> },

    { title: 'How much can you train?', subtitle: "Be realistic — a plan you stick to beats an ideal one you can't.", valid: () => a.daysPerWeek != null && (a.equipment || []).length > 0,
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={FIELD_LABEL}>Days per week</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input type="range" min={2} max={7} step={1}
                value={a.daysPerWeek ?? optimalDays}
                onChange={e => set({ daysPerWeek: Number(e.target.value) })}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <div style={{ minWidth: 64, textAlign: 'right', fontSize: 22, fontWeight: 700, color: 'var(--txt-strong)' }}>
                {a.daysPerWeek ?? optimalDays}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-muted)' }}> days</span>
              </div>
            </div>
            <div style={{ ...HINT, marginTop: 8 }}>
              {(a.daysPerWeek ?? optimalDays) === optimalDays
                ? `We recommend ${optimalDays} days for your goal and experience.`
                : (a.daysPerWeek ?? optimalDays) > optimalDays
                  ? `More than the ${optimalDays} days we'd recommend — extra days add fatigue without more progress for this goal.`
                  : `Fewer than the ${optimalDays} days we'd recommend — you'll likely fall short of the ideal dose for your goal.`}
            </div>
          </div>
          <div>
            <label style={FIELD_LABEL}>Equipment</label>
            <OptionGrid cols={1} gap={6}>
              {EQUIPMENT_PRESETS.map(o => <Chip key={o.key} selected={sameSet(a.equipment, o.equip)} onClick={() => set({ equipment: [...o.equip] })} label={o.label} hint={o.hint} />)}
            </OptionGrid>
            <div style={{ ...HINT, marginTop: 8 }}>Or pick exactly what you've got:</div>
            <OptionGrid cols={4}>
              {EQUIPMENT_ITEMS.map(it => <Chip key={it.key} center selected={(a.equipment || []).includes(it.key)} onClick={() => toggle(it.key, 'equipment')} label={it.label} />)}
            </OptionGrid>
          </div>
          <div><label style={FIELD_LABEL}>Which days suit you? (optional)</label><OptionGrid cols={4}>{DAYS.map(d => <Chip key={d.key} center selected={a.days.includes(d.key)} onClick={() => toggle(d.key, 'days')} label={d.label} />)}</OptionGrid></div>
        </div>
      ) },

    { title: 'When do you want to start?', subtitle: 'Your plan is laid out on the calendar from this day.',
      valid: () => a.startWhen !== 'date' || (!!a.startDate && a.startDate >= localISODate()),
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <OptionGrid cols={2}>
            {START_OPTIONS.map(o => (
              <Chip key={o.key} center selected={a.startWhen === o.key}
                onClick={() => set({ startWhen: o.key })} label={o.label} />
            ))}
          </OptionGrid>
          {a.startWhen === 'date' && (
            <div>
              <label style={FIELD_LABEL}>Pick a date</label>
              <input type="date" style={INPUT} value={a.startDate || ''}
                min={localISODate()} onChange={e => set({ startDate: e.target.value })} />
            </div>
          )}
          <div style={HINT}>Weeks run Mon–Sun. Starting mid-week gives a shorter first week — pick “Next Monday” for a full first week.</div>
        </div>
      ) },

    showLifts && { title: 'Your main lifts', subtitle: 'Real numbers give every exercise a real target weight — optional, but worth it.', valid: () => true,
      render: () => {
        const bw = parseFloat(a.bodyweight_kg) || null;
        const barbellLifts = [['squat', 'Squat'], ['bench', 'Bench'], ['deadlift', 'Deadlift'], ['ohp', 'Overhead press']];
        const pullLabel = a.pullMode === 'kg' ? 'Lat pulldown 1RM' : 'Pull-ups (max reps)';
        const isTest = a.liftsMode === 'test';
        const calc = (key, t) => {
          if (key === 'pull' && a.pullMode === 'reps') return t.reps ? pullupE1RM(t.reps, bw, a.sex) : null;
          return (t.weight && t.reps) ? epley1RM(t.weight, t.reps) : null;
        };
        const onTest = (key, patch) => {
          const t = { ...(test[key] || {}), ...patch };
          setTest(prev => ({ ...prev, [key]: t }));
          const e = calc(key, t);
          setLift(key, e != null ? e : '', e != null ? 'tested' : null);
        };
        const pullToggle = (
          <div style={{ display: 'flex', gap: 6 }}>
            <MiniToggle on={a.pullMode === 'reps'} onClick={() => set({ pullMode: 'reps' })} label="Pull-ups" />
            <MiniToggle on={a.pullMode === 'kg'} onClick={() => set({ pullMode: 'kg' })} label="Lat pulldown" />
          </div>
        );
        return (
          <div style={{ display: 'grid', gap: 16 }}>
            <OptionGrid cols={2}>
              <Chip center selected={!isTest} onClick={() => set({ liftsMode: 'known' })} label="I know my maxes" />
              <Chip center selected={isTest} onClick={() => set({ liftsMode: 'test' })} label="Help me test" />
            </OptionGrid>

            {isTest ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={HINT}>Pick a weight you can lift for a few hard reps, enter how many you managed, and we'll work out your max.</div>
                {hasBarbell && barbellLifts.map(([k, label]) => (
                  <TestRow key={k} label={label} weight={test[k]?.weight} reps={test[k]?.reps}
                    onWeight={v => onTest(k, { weight: v })} onReps={v => onTest(k, { reps: v })} e1rm={calc(k, test[k] || {})} />
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{pullToggle}</div>
                <TestRow label={pullLabel} weight={test.pull?.weight} reps={test.pull?.reps} repsOnly={a.pullMode === 'reps'}
                  onWeight={v => onTest('pull', { weight: v })} onReps={v => onTest('pull', { reps: v })} e1rm={calc('pull', test.pull || {})} />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {hasBarbell && (
                  <div>
                    <label style={FIELD_LABEL}>1-rep maxes (kg)</label>
                    <OptionGrid cols={2}>
                      {barbellLifts.map(([k, label]) => (
                        <Field key={k} label={label} type="number" value={a.lifts[k]} placeholder="—"
                          onChange={v => setLift(k, v, null)} suffix="kg" />
                      ))}
                    </OptionGrid>
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...FIELD_LABEL, marginBottom: 0 }}>Pull strength</label>
                    {pullToggle}
                  </div>
                  <Field label={pullLabel} type="number" value={a.lifts.pull} placeholder="—"
                    onChange={v => setLift('pull', v, null)} suffix={a.pullMode === 'kg' ? 'kg' : 'reps'} />
                </div>
              </div>
            )}
            <div style={HINT}>No idea? Leave them blank — we'll estimate from your level, and you can log a real set after week 1.</div>
          </div>
        );
      } },

    { title: 'Ready to go', subtitle: "Here's what we captured. Create your plan and you're in.", valid: () => true,
      render: () => {
        const goalLabel = isSport
          ? `Support ${SPORTS.find(s => s.key === a.sport)?.label || 'sport'} · ${a.sportIntent === 'compete' ? 'competing' : a.sportIntent === 'build_base' ? 'building base' : 'recreational'}`
          : (STYLES.find(s => s.key === a.strengthStyle)?.label || '—');
        const liftBits = [];
        for (const [k, lab] of [['squat', 'Sq'], ['bench', 'Bn'], ['deadlift', 'Dl'], ['ohp', 'OHP']]) {
          if (a.lifts[k]) liftBits.push(`${lab} ${a.lifts[k]}`);
        }
        if (a.lifts.pull) {
          const asReps = a.pullMode === 'reps' && (a.liftsSource || {}).pull !== 'tested';
          liftBits.push(`Pull ${a.lifts.pull}${asReps ? ' reps' : ' kg'}`);
        }
        return (
          <div style={{ display: 'grid', gap: 6 }}>
            <SummaryRow label="Goal" value={goalLabel} />
            {isSport && <SummaryRow label="Sport" value={SPORTS.find(s => s.key === a.sport)?.label || '—'} />}
            {a.runDiscipline && (
              <SummaryRow label="Distance" value={(() => { const discs = skb.get(a.sport)?.meta?.disciplines; return discs ? (discs.find(d => d.key === a.runDiscipline)?.label || '—') : '—'; })()} />
            )}
            <SummaryRow label="Experience" value={LEVELS.find(l => l.key === a.experienceLevel)?.label || '—'} />
            {liftBits.length > 0 && <SummaryRow label="Maxes" value={liftBits.join(' · ')} />}
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days / week` : '—'} />
            <SummaryRow label="Starts" value={resolveStartDate(a.startWhen, a.startDate)} />
            <SummaryRow label="Equipment" value={equipLabel(a.equipment)} />
            {isSport && a.sportDays.length > 0 && (
              <SummaryRow label="Sport days" value={a.sportDays.map(k => DAYS.find(d => d.key === k)?.label).join(' · ')} />
            )}
          </div>
        );
      } }
  ].filter(Boolean);

  const safeStep = Math.min(step, steps.length - 1);
  const cur = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const isHero = !!cur.hero;
  const canNext = cur.valid();

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [safeStep]);

  const next = () => { if (canNext && !isLast) setStep(safeStep + 1); };
  const back = () => setStep(Math.max(0, safeStep - 1));
  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try { if (onComplete) await onComplete(a); } finally { setSaving(false); }
  };

  const PAD = devTools ? 10 : 22;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: devTools ? 'auto' : '100dvh', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
      {devTools && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 2px', marginBottom: 6 }}>
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} title={s.title || 'Welcome'} style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid var(--hairline)', cursor: 'pointer', fontFamily: 'inherit', background: i === safeStep ? 'var(--accent)' : 'var(--bg-surface-2)', color: i === safeStep ? 'var(--on-action)' : 'var(--txt-muted)', whiteSpace: 'nowrap' }}>{i + 1}. {s.title || 'Welcome'}</button>
          ))}
        </div>
      )}

      {!isHero && (
        <div style={{ flexShrink: 0, padding: `${devTools ? 4 : 22}px ${PAD}px 0` }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
            {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= safeStep ? 'var(--accent)' : 'var(--bg-surface-2)', transition: 'background 0.2s' }} />)}
          </div>
          <h1 className="h1" style={{ marginBottom: 6 }}>{cur.title}</h1>
          <p className="sub" style={{ marginBottom: 16 }}>{cur.subtitle}</p>
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: devTools ? 'visible' : 'auto', WebkitOverflowScrolling: 'touch', padding: isHero ? `0 ${PAD}px` : `2px ${PAD}px 16px`, display: isHero ? 'flex' : 'block', flexDirection: 'column' }}>
        {cur.render()}
      </div>

      <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: `12px ${PAD}px calc(14px + env(safe-area-inset-bottom))`, borderTop: isHero ? 'none' : '1px solid var(--hairline)', background: 'var(--bg-surface)' }}>
        {safeStep > 0 && !isHero && <button onClick={back} disabled={saving} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>}
        <button onClick={isLast ? finish : next} disabled={!canNext || saving} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: (canNext && !saving) ? 'var(--accent)' : 'var(--bg-surface-2)', color: (canNext && !saving) ? 'var(--on-action)' : 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: (canNext && !saving) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          {saving ? 'Setting up…' : isLast ? completeLabel : isHero ? 'Get started' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
