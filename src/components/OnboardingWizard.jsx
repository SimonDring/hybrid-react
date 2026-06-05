/**
 * OnboardingWizard — the shared first-run questionnaire UI.
 *
 * Holds every question screen, navigation, validation and inference. Two callers
 * use it so the screens never drift:
 *   • src/screens/Onboarding.jsx — production; onComplete writes to the store.
 *   • src/screens/DevPlayground.jsx — the /dev tester; devTools mode, local only.
 *
 * The answer shape → users.profile mapping lives in src/lib/onboardingModel.js.
 *
 * Layout note: the header (progress, title, subtitle) and footer (Back/Next)
 * sit in fixed positions and the content area has a reserved min-height, so the
 * screen doesn't jump around as steps change size.
 */

import { useState, useEffect, useRef } from 'react';
import { focusToDisciplines } from '../lib/PlanGenerator.js';
import { computePaces } from '../lib/plan/running.js';
import { BLANK_ANSWERS } from '../lib/onboardingModel.js';

// ---- Option catalogues ----
export const FOCUS = [
  { key: 'run',            label: 'Running',        hint: '5k → marathon' },
  { key: 'swim',           label: 'Swimming',       hint: 'Pool or open water' },
  { key: 'cycle',          label: 'Cycling',        hint: 'Road, gravel, turbo' },
  { key: 'triathlon',      label: 'Triathlon',      hint: 'Swim · bike · run' },
  { key: 'gym',            label: 'Gym / strength', hint: 'Lifting — any style' },
  { key: 'general_health', label: 'General health', hint: 'Move well, feel good' }
];
export const STYLES = [
  { key: 'strength',     label: 'Strength / power', hint: 'Heavy, low reps, the big lifts' },
  { key: 'bodybuilding', label: 'Muscle & physique', hint: 'Moderate–high reps, more volume' },
  { key: 'functional',   label: 'Functional fitness', hint: 'Compounds, carries, core — mixed' }
];
const LEVELS = [
  { key: 'beginner',     label: 'Beginner',     hint: 'New to it' },
  { key: 'returning',    label: 'Returning',    hint: 'Back after a break' },
  { key: 'intermediate', label: 'Intermediate', hint: 'Consistent' },
  { key: 'advanced',     label: 'Advanced',     hint: 'Experienced' }
];
const RUN_DISTANCES = [
  { key: '', label: 'General fitness' }, { key: '5k', label: '5K' }, { key: '10k', label: '10K' },
  { key: 'half', label: 'Half' }, { key: 'marathon', label: 'Marathon' }
];
const RUN_TIME_DISTANCES = [{ key: '5k', label: '5K' }, { key: '10k', label: '10K' }, { key: 'half', label: 'Half' }, { key: 'marathon', label: 'Marathon' }];
const SWIM_DISTANCES = [
  { m: 1000, label: '1 km' }, { m: 1500, label: '1.5 km' }, { m: 2000, label: '2 km' },
  { m: 2500, label: '2.5 km' }, { m: 3000, label: '3 km' }
];
const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' }
];
const SESSION_LENGTHS = [30, 45, 60, 75, 90];
const PLAN_WEEKS = [8, 12, 16, 20];
const ACCESS = [
  { key: 'full_gym', label: 'Full gym' }, { key: 'home_weights', label: 'Home weights' }, { key: 'pool', label: 'Pool' },
  { key: 'bike', label: 'Bike / turbo' }, { key: 'open_water', label: 'Open water' }, { key: 'none', label: 'No equipment' }
];
const DISCIPLINE_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Cycle', general: 'General health' };

const todayISO = () => new Date().toISOString().slice(0, 10);

// ---- experience inference (a suggested level the user can override) ----
function parsePace100(str) {
  if (!str) return null;
  const p = String(str).trim().split(':').map(Number);
  if (p.some(isNaN) || !p.length) return null;
  return p.reduce((a, x) => a * 60 + x, 0);
}
function inferRunLevel(rg) {
  if (rg && rg.currentTime && rg.currentTime.trim()) {
    const { fivekPaceSec } = computePaces(rg.distance || '10k', { distance: rg.currentDistance || '5k', time: rg.currentTime }, 'intermediate');
    const t = fivekPaceSec * 5;
    if (t < 22 * 60) return 'advanced';
    if (t < 27 * 60) return 'intermediate';
    if (t < 33 * 60) return 'returning';
    return 'beginner';
  }
  return 'intermediate';
}
function inferSwimLevel(sg) {
  const p = parsePace100(sg && sg.currentPace);
  if (p) { if (p < 95) return 'advanced'; if (p < 115) return 'intermediate'; if (p < 140) return 'returning'; return 'beginner'; }
  return 'beginner';
}
function inferLevelFor(key, a) {
  if (key === 'run' || key === 'triathlon') return inferRunLevel(a.runGoal);
  if (key === 'swim') return inferSwimLevel(a.swimGoal);
  if (key === 'general_health') return 'beginner';
  return 'intermediate'; // gym, cycle
}

// ---- shared styles ----
const INPUT = {
  width: '100%', fontSize: 16, padding: '12px 14px', borderRadius: 11, border: '1px solid var(--hairline)',
  background: 'var(--bg-surface)', fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box'
};
const FIELD_LABEL = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.6, marginBottom: 6, textTransform: 'uppercase' };

function proposeAllocation(focus, days) {
  const ds = focusToDisciplines(focus);
  if (!days || !ds.length) return {};
  const base = Math.floor(days / ds.length);
  let rem = days - base * ds.length;
  const out = {};
  ds.forEach(d => { out[d] = base + (rem-- > 0 ? 1 : 0); });
  return out;
}

// ---- UI atoms ----
function Chip({ selected, onClick, label, hint, full }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', width: full ? '100%' : 'auto',
      border: `1.5px solid ${selected ? 'var(--rust)' : 'var(--hairline)'}`,
      background: selected ? 'rgba(176,74,46,0.08)' : 'var(--bg-surface)', color: 'var(--txt-strong)', transition: 'border-color 0.12s, background 0.12s'
    }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>{hint}</div>}
    </button>
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
function Stepper({ value, onDec, onInc }) {
  const btn = (txt, fn) => (
    <button onClick={fn} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--hairline)', background: 'var(--bg-surface)', color: 'var(--txt-strong)', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>{txt}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {btn('−', onDec)}
      <span style={{ minWidth: 18, textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--txt-strong)' }}>{value}</span>
      {btn('+', onInc)}
    </div>
  );
}
function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', minWidth: 88 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--txt-strong)', flex: 1 }}>{value}</div>
    </div>
  );
}

export default function OnboardingWizard({ initialAnswers, onComplete, onAnswersChange, devTools = false, completeLabel = 'Create my plan' }) {
  const [a, setA] = useState({ ...BLANK_ANSWERS, ...(initialAnswers || {}) });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setA(prev => ({ ...prev, ...patch }));
  const toggle = (key, listName) => set({ [listName]: a[listName].includes(key) ? a[listName].filter(k => k !== key) : [...a[listName], key] });

  const changeRef = useRef(onAnswersChange);
  changeRef.current = onAnswersChange;
  useEffect(() => { if (changeRef.current) changeRef.current(a); }, [a]);

  const disciplines = focusToDisciplines(a.focus);
  const hasGym = disciplines.includes('gym');
  const hasRun = disciplines.includes('run');
  const hasSwim = disciplines.includes('swim');
  const multi = disciplines.length > 1;

  // Default the start date to today.
  useEffect(() => { if (!a.startDate) set({ startDate: todayISO() }); /* eslint-disable-next-line */ }, []);
  // Re-propose the day allocation when focus / total days change.
  useEffect(() => { set({ allocation: proposeAllocation(a.focus, a.daysPerWeek) }); /* eslint-disable-next-line */ }, [a.focus.join(','), a.daysPerWeek]);
  // Default the primary sport to the first chosen discipline.
  useEffect(() => { if (disciplines.length && !disciplines.includes(a.primary)) set({ primary: disciplines[0] }); /* eslint-disable-next-line */ }, [a.focus.join(',')]);
  // Pre-fill a suggested experience level for any sport not set yet (inference;
  // the user can still change it on the Experience step).
  useEffect(() => {
    const next = { ...a.experience };
    let changed = false;
    a.focus.forEach(k => { if (!next[k]) { next[k] = inferLevelFor(k, a); changed = true; } });
    if (changed) set({ experience: next });
    /* eslint-disable-next-line */
  }, [a.focus.join(','), a.runGoal.currentTime, a.swimGoal.currentPace]);

  const allocSum = Object.values(a.allocation).reduce((x, y) => x + (y || 0), 0);
  const adjustAlloc = (d, delta) => set({ allocation: { ...a.allocation, [d]: Math.max(0, Math.min(a.daysPerWeek || 7, (a.allocation[d] || 0) + delta)) } });

  const steps = [
    { title: 'Welcome', subtitle: 'A few quick questions so we can shape a plan around you. Takes about two minutes — you can change any of it later.', valid: () => true,
      render: () => <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--txt-body)' }}>We'll ask about your sports, experience, goals, and how much time you have. Your answers stay private to your account.</div> },

    { title: 'About you', subtitle: 'The basics. All optional, but they help tailor volumes and loads.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Name" value={a.name} onChange={v => set({ name: v })} placeholder="Your name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Age" value={a.age} onChange={v => set({ age: v })} type="number" suffix="yrs" />
            <div>
              <label style={FIELD_LABEL}>Sex</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['male', 'female', 'other'].map(s => <Chip key={s} selected={a.sex === s} onClick={() => set({ sex: s })} label={s[0].toUpperCase() + s.slice(1)} />)}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Height" value={a.height_cm} onChange={v => set({ height_cm: v })} type="number" suffix="cm" />
            <Field label="Weight" value={a.bodyweight_kg} onChange={v => set({ bodyweight_kg: v })} type="number" suffix="kg" />
          </div>
        </div>
      ) },

    { title: 'What do you want to train?', subtitle: 'Pick everything that applies. We can rebalance these as you go.', valid: () => a.focus.length > 0,
      render: () => <div style={{ display: 'grid', gap: 8 }}>{FOCUS.map(f => <Chip key={f.key} full selected={a.focus.includes(f.key)} onClick={() => toggle(f.key, 'focus')} label={f.label} hint={f.hint} />)}</div> },

    multi && { title: 'Your main focus', subtitle: 'Which one leads? It gets priority for the hard days and a little more volume — the rest support it.', valid: () => !!a.primary,
      render: () => <div style={{ display: 'grid', gap: 8 }}>{disciplines.map(d => <Chip key={d} full selected={a.primary === d} onClick={() => set({ primary: d })} label={DISCIPLINE_LABEL[d] || d} />)}</div> },

    hasGym && { title: 'Your gym emphasis', subtitle: 'Shapes your rep ranges and exercises. If you know your main lifts, add them for real target weights — optional.', valid: () => !!a.strengthStyle,
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>{STYLES.map(s => <Chip key={s.key} full selected={a.strengthStyle === s.key} onClick={() => set({ strengthStyle: s.key })} label={s.label} hint={s.hint} />)}</div>
          <div>
            <label style={FIELD_LABEL}>1-rep maxes (optional, kg)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {['squat', 'bench', 'deadlift'].map(k => (
                <input key={k} type="number" inputMode="decimal" placeholder={k[0].toUpperCase() + k.slice(1)} value={a.lifts[k]}
                  onChange={e => set({ lifts: { ...a.lifts, [k]: e.target.value } })} style={{ ...INPUT, padding: '10px 10px' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 6 }}>No problem if you don't know them — we'll ask you to log a working set after week 1.</div>
          </div>
        </div>
      ) },

    { title: 'Your goals', subtitle: 'Pick a race distance or just keep it general. Add a recent time for real pace targets — all optional.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 22 }}>
          {hasRun && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>🏃 Running</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RUN_DISTANCES.map(d => <Chip key={d.key || 'gen'} selected={a.runGoal.distance === d.key} onClick={() => set({ runGoal: { ...a.runGoal, distance: d.key } })} label={d.label} />)}
              </div>
              <div>
                <label style={FIELD_LABEL}>Recent time (optional — sets your paces)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {RUN_TIME_DISTANCES.map(d => <Chip key={d.key} selected={a.runGoal.currentDistance === d.key} onClick={() => set({ runGoal: { ...a.runGoal, currentDistance: d.key } })} label={d.label} />)}
                </div>
                <input type="text" value={a.runGoal.currentTime} placeholder="e.g. 24:30 or 1:45:00" onChange={e => set({ runGoal: { ...a.runGoal, currentTime: e.target.value } })} style={INPUT} />
              </div>
            </div>
          )}
          {hasSwim && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>🏊 Swimming</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SWIM_DISTANCES.map(d => <Chip key={d.m} selected={a.swimGoal.distance_m === d.m} onClick={() => set({ swimGoal: { ...a.swimGoal, distance_m: d.m } })} label={d.label} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Current 100m pace (opt.)" value={a.swimGoal.currentPace} onChange={v => set({ swimGoal: { ...a.swimGoal, currentPace: v } })} placeholder="e.g. 2:05" />
                <Field label="Can swim now (opt.)" value={a.swimGoal.currentDistance} onChange={v => set({ swimGoal: { ...a.swimGoal, currentDistance: v } })} type="number" suffix="m" />
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>Other goals (optional)</div>
            {a.goals.map((g, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                <input type="text" value={g.label} placeholder="e.g. Squat bodyweight, ski-ready" onChange={e => set({ goals: a.goals.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} style={INPUT} />
                {a.goals.length > 1 && <button onClick={() => set({ goals: a.goals.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', color: 'var(--txt-muted)', fontSize: 16, cursor: 'pointer', padding: 4 }}>✕</button>}
              </div>
            ))}
            {a.goals.length < 3 && <button onClick={() => set({ goals: [...a.goals, { label: '', target_date: '' }] })} style={{ padding: 10, borderRadius: 10, border: '1.5px dashed var(--hairline)', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--txt-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add a goal</button>}
          </div>
        </div>
      ) },

    { title: 'Your experience', subtitle: 'We\'ve suggested a level from your goals — adjust any that feel off.', valid: () => a.focus.every(k => a.experience[k]),
      render: () => (
        <div style={{ display: 'grid', gap: 18 }}>
          {a.focus.map(fk => {
            const f = FOCUS.find(x => x.key === fk);
            return (
              <div key={fk}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)', marginBottom: 8 }}>{f.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {LEVELS.map(l => <Chip key={l.key} selected={a.experience[fk] === l.key} onClick={() => set({ experience: { ...a.experience, [fk]: l.key } })} label={l.label} hint={l.hint} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) },

    { title: 'Plan timing', subtitle: 'When do you start, and are you building toward a date?', valid: () => !!a.startDate && (!a.hasEvent || !!a.eventDate),
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={FIELD_LABEL}>Start date</label>
            <input type="date" value={a.startDate} onChange={e => set({ startDate: e.target.value })} style={INPUT} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Training for an event?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip selected={a.hasEvent} onClick={() => set({ hasEvent: true })} label="Yes — I have a date" />
              <Chip selected={!a.hasEvent} onClick={() => set({ hasEvent: false })} label="No set date" />
            </div>
          </div>
          {a.hasEvent ? (
            <div>
              <label style={FIELD_LABEL}>Event date</label>
              <input type="date" value={a.eventDate} onChange={e => set({ eventDate: e.target.value })} style={INPUT} />
              <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 6 }}>Your plan length is set by this date.</div>
            </div>
          ) : (
            <div>
              <label style={FIELD_LABEL}>How many weeks?</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PLAN_WEEKS.map(w => <Chip key={w} selected={a.planWeeks === w} onClick={() => set({ planWeeks: w })} label={`${w} wks`} />)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 6 }}>One training block. Your coach extends it from there.</div>
            </div>
          )}
        </div>
      ) },

    { title: 'How much can you train?', subtitle: 'Be realistic — a plan you can stick to beats an ideal one you can\'t.', valid: () => a.daysPerWeek != null,
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={FIELD_LABEL}>Days per week</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{[1, 2, 3, 4, 5, 6, 7].map(n => <Chip key={n} selected={a.daysPerWeek === n} onClick={() => set({ daysPerWeek: n })} label={String(n)} />)}</div>
          </div>
          <div>
            <label style={FIELD_LABEL}>Typical session length</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{SESSION_LENGTHS.map(m => <Chip key={m} selected={a.sessionMinutes === m} onClick={() => set({ sessionMinutes: m })} label={m === 90 ? '90+ min' : `${m} min`} />)}</div>
          </div>
          <div>
            <label style={FIELD_LABEL}>Which days suit you? (optional)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DAYS.map(d => <Chip key={d.key} selected={a.days.includes(d.key)} onClick={() => toggle(d.key, 'days')} label={d.label} />)}</div>
          </div>
          {hasRun && (
            <div>
              <label style={FIELD_LABEL}>Long-run day</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DAYS.map(d => <Chip key={d.key} selected={a.longRunDay === d.key} onClick={() => set({ longRunDay: d.key })} label={d.label} />)}</div>
            </div>
          )}
          <div>
            <label style={FIELD_LABEL}>Open to two sessions in a day?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip selected={a.doubles} onClick={() => set({ doubles: true })} label="Yes — doubles ok" />
              <Chip selected={!a.doubles} onClick={() => set({ doubles: false })} label="One a day" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 6 }}>Lets us pair short strength work with an easy day instead of using a whole extra day.</div>
          </div>
        </div>
      ) },

    multi && { title: 'Split your week', subtitle: 'A suggested split across your sports — nudge it to suit you. Your gym days set the split (full-body / upper-lower / PPL).', valid: () => allocSum === a.daysPerWeek,
      render: () => (
        <div style={{ display: 'grid', gap: 12 }}>
          {disciplines.map(d => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-strong)' }}>{DISCIPLINE_LABEL[d] || d}{a.primary === d && <span style={{ fontSize: 10, color: 'var(--rust)', marginLeft: 6 }}>PRIMARY</span>}</div>
              <Stepper value={a.allocation[d] || 0} onDec={() => adjustAlloc(d, -1)} onInc={() => adjustAlloc(d, 1)} />
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', marginTop: 4, color: allocSum === a.daysPerWeek ? 'var(--moss)' : 'var(--rust)' }}>
            {allocSum} of {a.daysPerWeek} days assigned{allocSum !== a.daysPerWeek && ` — ${allocSum < a.daysPerWeek ? 'add' : 'remove'} ${Math.abs(a.daysPerWeek - allocSum)}`}
          </div>
        </div>
      ) },

    { title: 'What can you access?', subtitle: 'So we only program what you can actually do.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{ACCESS.map(o => <Chip key={o.key} selected={a.access.includes(o.key)} onClick={() => toggle(o.key, 'access')} label={o.label} />)}</div>
          {a.access.includes('pool') && <div style={{ marginTop: 6 }}><Field label="Pool length" value={a.poolLengthM} onChange={v => set({ poolLengthM: v })} type="number" suffix="m" /></div>}
        </div>
      ) },

    { title: 'Anything to train around?', subtitle: 'Current injuries or niggles, and anything else worth knowing. All optional.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 10 }}>
          {a.injuries.map((inj, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
              <input type="text" value={inj.title} placeholder="e.g. Left knee" onChange={e => set({ injuries: a.injuries.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} style={INPUT} />
              <input type="text" value={inj.body_part} placeholder="Area (optional)" onChange={e => set({ injuries: a.injuries.map((x, j) => j === i ? { ...x, body_part: e.target.value } : x) })} style={INPUT} />
              <button onClick={() => set({ injuries: a.injuries.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', color: 'var(--txt-muted)', fontSize: 16, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>
          ))}
          <button onClick={() => set({ injuries: [...a.injuries, { title: '', body_part: '' }] })} style={{ padding: 10, borderRadius: 10, border: '1.5px dashed var(--hairline)', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--txt-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add an injury</button>
          <div>
            <label style={FIELD_LABEL}>Anything else? (optional)</label>
            <textarea rows={3} value={a.notes} onChange={e => set({ notes: e.target.value })} placeholder="Recent times, key lifts, health context…" style={{ ...INPUT, resize: 'vertical' }} />
          </div>
        </div>
      ) },

    { title: 'Ready to go', subtitle: 'Here\'s what we captured. Create your plan and you\'re in.', valid: () => true,
      render: () => {
        const focusLabels = a.focus.map(k => FOCUS.find(f => f.key === k)?.label).filter(Boolean);
        const otherGoals = a.goals.filter(g => g.label.trim());
        const runLabel = hasRun ? `${RUN_DISTANCES.find(d => d.key === a.runGoal.distance)?.label || 'General'}${a.runGoal.currentTime.trim() ? ` · from ${a.runGoal.currentTime.trim()}` : ''}` : null;
        const swimLabel = hasSwim ? `${(a.swimGoal.distance_m / 1000)} km${a.swimGoal.currentPace.trim() ? ` · ${a.swimGoal.currentPace.trim()}/100m` : ''}` : null;
        const allocLabel = multi ? disciplines.map(d => `${a.allocation[d] || 0} ${DISCIPLINE_LABEL[d]?.toLowerCase() || d}`).join(' · ') : null;
        const liftBits = hasGym ? ['squat', 'bench', 'deadlift'].filter(k => a.lifts[k]).map(k => `${k[0].toUpperCase()}${a.lifts[k]}`) : [];
        const timing = a.hasEvent ? `from ${a.startDate} → event ${a.eventDate || '?'}` : `${a.startDate} · ${a.planWeeks} wks`;
        return (
          <div style={{ display: 'grid', gap: 8 }}>
            <SummaryRow label="Focus" value={focusLabels.join(', ') || '—'} />
            {multi && <SummaryRow label="Primary" value={DISCIPLINE_LABEL[a.primary] || a.primary || '—'} />}
            {hasGym && <SummaryRow label="Gym style" value={STYLES.find(s => s.key === a.strengthStyle)?.label || '—'} />}
            {liftBits.length > 0 && <SummaryRow label="Maxes" value={liftBits.join(' · ') + ' kg'} />}
            {runLabel && <SummaryRow label="Running" value={runLabel} />}
            {swimLabel && <SummaryRow label="Swimming" value={swimLabel} />}
            {otherGoals.length > 0 && <SummaryRow label="Other goals" value={otherGoals.map(g => g.label.trim()).join(' · ')} />}
            <SummaryRow label="Timing" value={timing} />
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days · ${a.sessionMinutes === 90 ? '90+' : a.sessionMinutes} min${a.doubles ? ' · doubles ok' : ''}` : '—'} />
            {allocLabel && <SummaryRow label="Split" value={allocLabel} />}
            <SummaryRow label="Access" value={a.access.map(k => ACCESS.find(o => o.key === k)?.label).filter(Boolean).join(', ') || '—'} />
            {a.injuries.filter(i => i.title.trim()).length > 0 && <SummaryRow label="Training around" value={a.injuries.filter(i => i.title.trim()).map(i => i.title.trim()).join(', ')} />}
          </div>
        );
      } }
  ].filter(Boolean);

  const safeStep = Math.min(step, steps.length - 1);
  const cur = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const canNext = cur.valid();

  const next = () => { if (canNext && !isLast) setStep(safeStep + 1); };
  const back = () => setStep(Math.max(0, safeStep - 1));
  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try { if (onComplete) await onComplete(a); } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: devTools ? 'auto' : '100dvh', maxWidth: 480, margin: '0 auto', padding: devTools ? '4px 2px' : '24px 22px 22px' }}>
      {devTools && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} title={s.title} style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid var(--hairline)', cursor: 'pointer', fontFamily: 'inherit', background: i === safeStep ? 'var(--rust)' : 'var(--bg-surface-2)', color: i === safeStep ? '#fff' : 'var(--txt-muted)', whiteSpace: 'nowrap' }}>{i + 1}. {s.title}</button>
          ))}
        </div>
      )}

      {/* Fixed header */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= safeStep ? 'var(--rust)' : 'var(--bg-surface-2)', transition: 'background 0.2s' }} />)}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>Step {safeStep + 1} of {steps.length}</div>
      <h1 className="h1" style={{ marginBottom: 8 }}>{cur.title}</h1>
      <p className="sub" style={{ marginBottom: 22 }}>{cur.subtitle}</p>

      {/* Reserved content area — keeps the footer from jumping between steps */}
      <div style={{ flex: 1, minHeight: devTools ? 'auto' : 320 }}>{cur.render()}</div>

      {/* Fixed footer */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        {safeStep > 0 && <button onClick={back} disabled={saving} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>}
        <button onClick={isLast ? finish : next} disabled={!canNext || saving} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: (canNext && !saving) ? 'var(--rust)' : 'var(--bg-surface-2)', color: (canNext && !saving) ? '#fff' : 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: (canNext && !saving) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          {saving ? 'Setting up…' : isLast ? completeLabel : 'Continue'}
        </button>
      </div>
    </div>
  );
}
