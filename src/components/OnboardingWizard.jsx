/**
 * OnboardingWizard — the shared first-run questionnaire UI.
 *
 * Flow: a visual Welcome landing, then About-you, a SINGLE training focus, then
 * questions that branch off that focus (gym goal+maxes / run goal / swim goal),
 * predefined other goals, experience, timing, availability, and an access step
 * that only asks what's relevant to the chosen focus. No "step N of M" — just a
 * quiet progress bar. Used by production Onboarding + the /dev tester so the
 * screens never drift; answer→profile mapping lives in src/lib/onboardingModel.js.
 */

import { useState, useEffect, useRef } from 'react';
import { focusToDisciplines } from '../lib/PlanGenerator.js';
import { computePaces } from '../lib/plan/running.js';
import { BLANK_ANSWERS } from '../lib/onboardingModel.js';

// ---- Option catalogues ----
export const FOCUS = [
  { key: 'run',            label: 'Running',           hint: '5k → marathon', emoji: '🏃' },
  { key: 'swim',           label: 'Swimming',          hint: 'Pool or open water', emoji: '🏊' },
  { key: 'cycle',          label: 'Cycling',           hint: 'Road, gravel, turbo', emoji: '🚴' },
  { key: 'triathlon',      label: 'Triathlon',         hint: 'Swim · bike · run', emoji: '🏅' },
  { key: 'gym',            label: 'Gym',               hint: 'Strength & muscle', emoji: '🏋️' },
  { key: 'general_health', label: 'Functional fitness', hint: 'Mobility & movement — counter a desk-bound day', emoji: '🧘' }
];
export const STYLES = [
  { key: 'strength',     label: 'Get stronger', hint: 'Heavy, low reps, the big lifts' },
  { key: 'bodybuilding', label: 'Build muscle', hint: 'Moderate–high reps, more volume' },
  { key: 'functional',   label: 'Move & perform', hint: 'Compounds, carries, core — mixed' }
];
const ACTIVITY = [
  { key: 'sedentary', label: 'Mostly sitting', hint: 'Desk job' },
  { key: 'moderate',  label: 'On my feet a fair bit', hint: '' },
  { key: 'active',    label: 'Active / physical job', hint: '' }
];
const LEVELS = [
  { key: 'beginner', label: 'Beginner', hint: 'New to it' },
  { key: 'returning', label: 'Returning', hint: 'Back after a break' },
  { key: 'intermediate', label: 'Intermediate', hint: 'Consistent' },
  { key: 'advanced', label: 'Advanced', hint: 'Experienced' }
];
const RUN_DISTANCES = [
  { key: '', label: 'Improve fitness' }, { key: '5k', label: '5K' }, { key: '10k', label: '10K' },
  { key: 'half', label: 'Half' }, { key: 'marathon', label: 'Marathon' }
];
const RUN_TIME_DISTANCES = [{ key: '5k', label: '5K' }, { key: '10k', label: '10K' }, { key: 'half', label: 'Half' }, { key: 'marathon', label: 'Marathon' }];
const SWIM_DISTANCES = [
  { m: 1000, label: '1 km' }, { m: 1500, label: '1.5 km' }, { m: 2000, label: '2 km' },
  { m: 2500, label: '2.5 km' }, { m: 3000, label: '3 km' }
];
const OTHER_GOALS = ['Lose body fat', 'Build muscle', 'Improve endurance', 'Get stronger', 'Move better & mobility', 'Stay consistent', 'Reduce injury risk', 'More energy & better sleep'];
const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' }
];
const SESSION_LENGTHS = [30, 45, 60, 75, 90];
const PLAN_WEEKS = [8, 12, 16, 20];
const STRENGTH_ACCESS = [
  { key: 'full_gym', label: 'Full gym', hint: 'Barbells, machines, cables' },
  { key: 'home_weights', label: 'Home / free weights', hint: 'Dumbbells, maybe a barbell' },
  { key: 'none', label: 'Bodyweight only', hint: 'No equipment' }
];
const DISCIPLINE_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Cycle', general: 'Functional' };

const todayISO = () => new Date().toISOString().slice(0, 10);

// ---- experience inference ----
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
  return 'intermediate';
}

// ---- shared styles ----
const INPUT = {
  width: '100%', minWidth: 0, maxWidth: '100%', fontSize: 16, padding: '12px 14px', borderRadius: 11, border: '1px solid var(--hairline)',
  background: 'var(--bg-surface)', fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box'
};
const FIELD_LABEL = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.6, marginBottom: 6, textTransform: 'uppercase' };
const HINT = { fontSize: 11, color: 'var(--txt-muted)', marginTop: 6, lineHeight: 1.4 };

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
// A uniform option tile. Always fills its grid cell (width + height 100%), so a
// group of options is always the same size regardless of text length. `center`
// centres short labels; `emoji` renders an icon-led tile.
function Chip({ selected, onClick, label, hint, emoji, center }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      minHeight: emoji ? 62 : (hint ? 58 : 46),
      padding: emoji ? '12px 14px' : '10px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      border: `1.5px solid ${selected ? 'var(--rust)' : 'var(--hairline)'}`,
      background: selected ? 'rgba(176,74,46,0.08)' : 'var(--bg-surface)', color: 'var(--txt-strong)',
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
// Equal-size option grid: N columns that can shrink (no overflow), equal row
// heights (grid-auto-rows: 1fr). `fill` makes it expand to fill the page.
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
function DateField({ value, onChange }) {
  return <input type="date" value={value || ''} onChange={e => { onChange(e.target.value); e.target.blur(); }}
    style={{ ...INPUT, fontSize: 15, color: value ? 'var(--txt-strong)' : 'var(--txt-muted)' }} />;
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
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', minWidth: 84 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--txt-strong)', flex: 1 }}>{value}</div>
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

  const changeRef = useRef(onAnswersChange);
  changeRef.current = onAnswersChange;
  useEffect(() => { if (changeRef.current) changeRef.current(a); }, [a]);

  const disciplines = focusToDisciplines(a.focus);
  const hasGym = disciplines.includes('gym');
  const hasRun = disciplines.includes('run');
  const hasSwim = disciplines.includes('swim');
  const multi = disciplines.length > 1;

  useEffect(() => { if (!a.startDate) set({ startDate: todayISO() }); /* eslint-disable-next-line */ }, []);
  useEffect(() => { set({ allocation: proposeAllocation(a.focus, a.daysPerWeek) }); /* eslint-disable-next-line */ }, [a.focus.join(','), a.daysPerWeek]);
  useEffect(() => { if (disciplines.length && !disciplines.includes(a.primary)) set({ primary: disciplines[0] }); /* eslint-disable-next-line */ }, [a.focus.join(',')]);
  useEffect(() => {
    const next = { ...a.experience };
    let changed = false;
    a.focus.forEach(k => { if (!next[k]) { next[k] = inferLevelFor(k, a); changed = true; } });
    if (changed) set({ experience: next });
    /* eslint-disable-next-line */
  }, [a.focus.join(','), a.runGoal.currentTime, a.swimGoal.currentPace]);

  const allocSum = Object.values(a.allocation).reduce((x, y) => x + (y || 0), 0);
  const adjustAlloc = (d, delta) => set({ allocation: { ...a.allocation, [d]: Math.max(0, Math.min(a.daysPerWeek || 7, (a.allocation[d] || 0) + delta)) } });
  const pickFocus = (key) => set({ focus: [key] }); // single-choice

  const accessQuestion = hasGym ? 'Your gym setup' : 'Strength equipment for your supporting work';

  const steps = [
    { hero: true, valid: () => true,
      render: () => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 8px' }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, marginBottom: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, background: 'linear-gradient(145deg, var(--rust), #7d2f1c)', boxShadow: '0 12px 34px rgba(176,74,46,0.34)' }}>🏔️</div>
          <h1 style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--txt-strong)', margin: '0 0 10px' }}>Welcome</h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt-strong)', margin: '0 0 8px' }}>Training built around you.</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--txt-muted)', maxWidth: 320, margin: 0 }}>
            A few quick questions and we'll generate a plan tailored to your goal, your time, and your body — then adapt it as you go.
          </p>
        </div>
      ) },

    { title: 'About you', subtitle: 'The basics help us tailor your volumes, loads and recovery.', valid: () => true,
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
          </div>
          <Field label="Height" value={a.height_cm} onChange={v => set({ height_cm: v })} type="number" suffix="cm" />
          <Field label="Weight" value={a.bodyweight_kg} onChange={v => set({ bodyweight_kg: v })} type="number" suffix="kg" />
          <div>
            <label style={FIELD_LABEL}>Daily activity (outside training)</label>
            <OptionGrid cols={1} gap={6}>{ACTIVITY.map(o => <Chip key={o.key} selected={a.activityLevel === o.key} onClick={() => set({ activityLevel: o.key })} label={o.label} hint={o.hint} />)}</OptionGrid>
          </div>
        </div>
      ) },

    { title: 'What\'s your training focus?', subtitle: 'Pick the one thing your plan should be built around — we\'ll add the right supporting work automatically.', valid: () => a.focus.length > 0,
      render: () => <OptionGrid cols={1}>{FOCUS.map(f => <Chip key={f.key} emoji={f.emoji} selected={a.focus[0] === f.key} onClick={() => pickFocus(f.key)} label={f.label} hint={f.hint} />)}</OptionGrid> },

    hasGym && { title: 'What\'s your gym goal?', subtitle: 'This sets your rep ranges and exercise choices.', valid: () => !!a.strengthStyle,
      render: () => <OptionGrid cols={1}>{STYLES.map(s => <Chip key={s.key} selected={a.strengthStyle === s.key} onClick={() => set({ strengthStyle: s.key })} label={s.label} hint={s.hint} />)}</OptionGrid> },

    hasGym && { title: 'Know your main lifts?', subtitle: 'Add your best single lift for real target weights — totally optional.', valid: () => true,
      render: () => (
        <div>
          <label style={FIELD_LABEL}>1-rep maxes (kg)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['squat', 'bench', 'deadlift'].map(k => (
              <div key={k}>
                <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginBottom: 4, textAlign: 'center' }}>{k[0].toUpperCase() + k.slice(1)}</div>
                <input type="number" inputMode="decimal" placeholder="—" value={a.lifts[k]}
                  onChange={e => set({ lifts: { ...a.lifts, [k]: e.target.value } })} style={{ ...INPUT, padding: '12px 8px', textAlign: 'center' }} />
              </div>
            ))}
          </div>
          <div style={HINT}>No idea? Leave them blank — we'll ask you to log a working set after week 1, then targets build from there.</div>
        </div>
      ) },

    hasRun && { title: 'Your running goal', subtitle: 'Pick a distance, or just improve fitness. A target time + recent time are optional but sharpen your paces.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>I'm working toward</label>
            <OptionGrid cols={3}>{RUN_DISTANCES.map(d => <Chip key={d.key || 'fit'} center selected={a.runGoal.distance === d.key} onClick={() => set({ runGoal: { ...a.runGoal, distance: d.key } })} label={d.label} />)}</OptionGrid>
          </div>
          {a.runGoal.distance && (
            <Field label="Target time (optional)" value={a.runGoal.targetTime} onChange={v => set({ runGoal: { ...a.runGoal, targetTime: v } })} placeholder="e.g. 1:45:00" />
          )}
          <div>
            <label style={FIELD_LABEL}>Recent time (optional — sets your paces)</label>
            <OptionGrid cols={4}>{RUN_TIME_DISTANCES.map(d => <Chip key={d.key} center selected={a.runGoal.currentDistance === d.key} onClick={() => set({ runGoal: { ...a.runGoal, currentDistance: d.key } })} label={d.label} />)}</OptionGrid>
            <div style={{ marginTop: 8 }}>
              <input type="text" value={a.runGoal.currentTime} placeholder="e.g. 24:30" onChange={e => set({ runGoal: { ...a.runGoal, currentTime: e.target.value } })} style={INPUT} />
            </div>
          </div>
        </div>
      ) },

    hasSwim && { title: 'Your swimming goal', subtitle: 'How far do you want to swim continuously? Current ability is optional.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Continuous distance goal</label>
            <OptionGrid cols={3}>{SWIM_DISTANCES.map(d => <Chip key={d.m} center selected={a.swimGoal.distance_m === d.m} onClick={() => set({ swimGoal: { ...a.swimGoal, distance_m: d.m } })} label={d.label} />)}</OptionGrid>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="100m pace (opt.)" value={a.swimGoal.currentPace} onChange={v => set({ swimGoal: { ...a.swimGoal, currentPace: v } })} placeholder="e.g. 2:05" />
            <Field label="Can swim now (opt.)" value={a.swimGoal.currentDistance} onChange={v => set({ swimGoal: { ...a.swimGoal, currentDistance: v } })} type="number" suffix="m" />
          </div>
        </div>
      ) },

    { title: 'Any other goals?', subtitle: 'Pick anything else you\'re working toward — optional.', valid: () => true,
      render: () => (
        <OptionGrid cols={2} fill>
          {OTHER_GOALS.map(g => <Chip key={g} center selected={a.otherGoals.includes(g)} onClick={() => toggle(g, 'otherGoals')} label={g} />)}
        </OptionGrid>
      ) },

    { title: 'Your experience', subtitle: 'We\'ve suggested a level from your goals — adjust if it feels off.', valid: () => a.focus.every(k => a.experience[k]),
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          {a.focus.map(fk => {
            const f = FOCUS.find(x => x.key === fk);
            return (
              <div key={fk} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)', marginBottom: 8 }}>{f.label}</div>
                <OptionGrid cols={2} fill>
                  {LEVELS.map(l => <Chip key={l.key} selected={a.experience[fk] === l.key} onClick={() => set({ experience: { ...a.experience, [fk]: l.key } })} label={l.label} hint={l.hint} />)}
                </OptionGrid>
              </div>
            );
          })}
        </div>
      ) },

    { title: 'When do you start?', subtitle: 'And are you building toward a date?', valid: () => !!a.startDate && (!a.hasEvent || !!a.eventDate),
      render: () => (
        <div style={{ display: 'grid', gap: 18 }}>
          <div><label style={FIELD_LABEL}>Start date</label><DateField value={a.startDate} onChange={v => set({ startDate: v })} /></div>
          <div>
            <label style={FIELD_LABEL}>Training for an event?</label>
            <OptionGrid cols={2}>
              <Chip center selected={a.hasEvent} onClick={() => set({ hasEvent: true })} label="Yes — I have a date" />
              <Chip center selected={!a.hasEvent} onClick={() => set({ hasEvent: false })} label="No set date" />
            </OptionGrid>
          </div>
          {a.hasEvent ? (
            <div><label style={FIELD_LABEL}>Event date</label><DateField value={a.eventDate} onChange={v => set({ eventDate: v })} /><div style={HINT}>Your plan length is set by this date.</div></div>
          ) : (
            <div>
              <label style={FIELD_LABEL}>How many weeks?</label>
              <OptionGrid cols={4}>{PLAN_WEEKS.map(w => <Chip key={w} center selected={a.planWeeks === w} onClick={() => set({ planWeeks: w })} label={`${w} wks`} />)}</OptionGrid>
              <div style={HINT}>One training block — your coach extends it from there.</div>
            </div>
          )}
        </div>
      ) },

    { title: 'How much can you train?', subtitle: 'Be realistic — a plan you can stick to beats an ideal one you can\'t.', valid: () => a.daysPerWeek != null,
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div><label style={FIELD_LABEL}>Days per week</label><OptionGrid cols={4}>{[1, 2, 3, 4, 5, 6, 7].map(n => <Chip key={n} center selected={a.daysPerWeek === n} onClick={() => set({ daysPerWeek: n })} label={String(n)} />)}</OptionGrid></div>
          <div><label style={FIELD_LABEL}>Typical session length</label><OptionGrid cols={3}>{SESSION_LENGTHS.map(m => <Chip key={m} center selected={a.sessionMinutes === m} onClick={() => set({ sessionMinutes: m })} label={m === 90 ? '90+ min' : `${m} min`} />)}</OptionGrid></div>
        </div>
      ) },

    { title: 'Your week', subtitle: 'Fine-tune which days work and how we use them.', valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div><label style={FIELD_LABEL}>Which days suit you? (optional)</label><OptionGrid cols={4}>{DAYS.map(d => <Chip key={d.key} center selected={a.days.includes(d.key)} onClick={() => toggle(d.key, 'days')} label={d.label} />)}</OptionGrid></div>
          {hasRun && <div><label style={FIELD_LABEL}>Long-run day</label><OptionGrid cols={4}>{DAYS.map(d => <Chip key={d.key} center selected={a.longRunDay === d.key} onClick={() => set({ longRunDay: d.key })} label={d.label} />)}</OptionGrid></div>}
          <div>
            <label style={FIELD_LABEL}>Open to two sessions in a day?</label>
            <OptionGrid cols={2}>
              <Chip center selected={a.doubles} onClick={() => set({ doubles: true })} label="Yes — doubles ok" />
              <Chip center selected={!a.doubles} onClick={() => set({ doubles: false })} label="One a day" />
            </OptionGrid>
            <div style={HINT}>Lets us pair short strength work with an easy day instead of using a whole extra day.</div>
          </div>
        </div>
      ) },

    multi && { title: 'Split your week', subtitle: 'A suggested split across your disciplines — nudge to suit you.', valid: () => allocSum === a.daysPerWeek,
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
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={FIELD_LABEL}>{accessQuestion}</label>
            <OptionGrid cols={1} gap={6}>{STRENGTH_ACCESS.map(o => <Chip key={o.key} selected={a.strengthAccess === o.key} onClick={() => set({ strengthAccess: o.key })} label={o.label} hint={o.hint} />)}</OptionGrid>
          </div>
          {hasSwim && (
            <div>
              <label style={FIELD_LABEL}>Pool access</label>
              <OptionGrid cols={2}>
                <Chip center selected={a.poolAccess} onClick={() => set({ poolAccess: true })} label="I have a pool" />
                <Chip center selected={!a.poolAccess} onClick={() => set({ poolAccess: false })} label="Open water only" />
              </OptionGrid>
              {a.poolAccess && <div style={{ marginTop: 8 }}><Field label="Pool length" value={a.poolLengthM} onChange={v => set({ poolLengthM: v })} type="number" suffix="m" /></div>}
            </div>
          )}
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
        const focusLabel = FOCUS.find(f => f.key === a.focus[0])?.label || '—';
        const runLabel = hasRun ? `${RUN_DISTANCES.find(d => d.key === a.runGoal.distance)?.label || 'Improve fitness'}${a.runGoal.targetTime.trim() ? ` · target ${a.runGoal.targetTime.trim()}` : ''}` : null;
        const swimLabel = hasSwim ? `${(a.swimGoal.distance_m / 1000)} km${a.swimGoal.currentPace.trim() ? ` · ${a.swimGoal.currentPace.trim()}/100m` : ''}` : null;
        const liftBits = hasGym ? ['squat', 'bench', 'deadlift'].filter(k => a.lifts[k]).map(k => `${k[0].toUpperCase()}${a.lifts[k]}`) : [];
        const timing = a.hasEvent ? `${a.startDate} → event ${a.eventDate || '?'}` : `${a.startDate} · ${a.planWeeks} wks`;
        const accessLabel = [STRENGTH_ACCESS.find(o => o.key === a.strengthAccess)?.label, hasSwim && (a.poolAccess ? 'pool' : 'open water')].filter(Boolean).join(' · ');
        return (
          <div style={{ display: 'grid', gap: 6 }}>
            <SummaryRow label="Focus" value={focusLabel} />
            {hasGym && <SummaryRow label="Gym goal" value={STYLES.find(s => s.key === a.strengthStyle)?.label || '—'} />}
            {liftBits.length > 0 && <SummaryRow label="Maxes" value={liftBits.join(' · ') + ' kg'} />}
            {runLabel && <SummaryRow label="Running" value={runLabel} />}
            {swimLabel && <SummaryRow label="Swimming" value={swimLabel} />}
            {a.otherGoals.length > 0 && <SummaryRow label="Other" value={a.otherGoals.join(' · ')} />}
            <SummaryRow label="Timing" value={timing} />
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days · ${a.sessionMinutes === 90 ? '90+' : a.sessionMinutes} min${a.doubles ? ' · doubles' : ''}` : '—'} />
            <SummaryRow label="Access" value={accessLabel || '—'} />
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
            <button key={i} onClick={() => setStep(i)} title={s.title || 'Welcome'} style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid var(--hairline)', cursor: 'pointer', fontFamily: 'inherit', background: i === safeStep ? 'var(--rust)' : 'var(--bg-surface-2)', color: i === safeStep ? '#fff' : 'var(--txt-muted)', whiteSpace: 'nowrap' }}>{i + 1}. {s.title || 'Welcome'}</button>
          ))}
        </div>
      )}

      {/* Header — quiet progress bar, no step numbers. Hidden on the hero. */}
      {!isHero && (
        <div style={{ flexShrink: 0, padding: `${devTools ? 4 : 22}px ${PAD}px 0` }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
            {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= safeStep ? 'var(--rust)' : 'var(--bg-surface-2)', transition: 'background 0.2s' }} />)}
          </div>
          <h1 className="h1" style={{ marginBottom: 6 }}>{cur.title}</h1>
          <p className="sub" style={{ marginBottom: 16 }}>{cur.subtitle}</p>
        </div>
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: devTools ? 'visible' : 'auto', WebkitOverflowScrolling: 'touch', padding: isHero ? `0 ${PAD}px` : `2px ${PAD}px 16px`, display: isHero ? 'flex' : 'block', flexDirection: 'column' }}>
        {cur.render()}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: `12px ${PAD}px calc(14px + env(safe-area-inset-bottom))`, borderTop: isHero ? 'none' : '1px solid var(--hairline)', background: 'var(--bg-surface)' }}>
        {safeStep > 0 && !isHero && <button onClick={back} disabled={saving} style={{ padding: '14px 20px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>}
        <button onClick={isLast ? finish : next} disabled={!canNext || saving} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: (canNext && !saving) ? 'var(--rust)' : 'var(--bg-surface-2)', color: (canNext && !saving) ? '#fff' : 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: (canNext && !saving) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          {saving ? 'Setting up…' : isLast ? completeLabel : isHero ? 'Get started' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
