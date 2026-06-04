/**
 * Onboarding wizard — first-run questionnaire that captures everything the
 * plan generator (and, later, the AI coach) needs: baseline, focus sports, gym
 * emphasis, experience, structured run/swim goals (with optional current
 * fitness for pace targets), weekly availability + per-discipline day split,
 * equipment access, and any injuries.
 *
 * Shown by App.jsx when a signed-in user hasn't completed onboarding. On finish
 * it writes one merged patch to users.profile (+ goals + injury rows) via the
 * store, sets profile.onboarded = true, and the gate drops the user into the app.
 *
 * The structured run/swim goals feed PlanGenerator's discipline engines:
 * a recent time → Riegel/Daniels pace targets; a swim pace → CSS targets. The
 * day allocation drives the gym split (full-body vs upper/lower vs PPL) and the
 * scheduler. Read-only Profile mirrors this back; the AI coach edits it later.
 */

import { useState, useEffect } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { focusToDisciplines } from '../lib/PlanGenerator.js';

// ---- Option catalogues ----
const FOCUS = [
  { key: 'run',            label: 'Running',        hint: '5k → marathon' },
  { key: 'swim',           label: 'Swimming',       hint: 'Pool or open water' },
  { key: 'cycle',          label: 'Cycling',        hint: 'Road, gravel, turbo' },
  { key: 'triathlon',      label: 'Triathlon',      hint: 'Swim · bike · run' },
  { key: 'gym',            label: 'Gym / strength', hint: 'Lifting — any style' },
  { key: 'general_health', label: 'General health', hint: 'Move well, feel good' }
];
const STYLES = [
  { key: 'strength',     label: 'Strength / power', hint: 'Heavy, low reps, the big lifts' },
  { key: 'bodybuilding', label: 'Muscle & physique', hint: 'Moderate–high reps, more volume' },
  { key: 'functional',   label: 'Functional fitness', hint: 'Compounds, carries, core — mixed' }
];
const LEVELS = [
  { key: 'beginner',     label: 'Beginner',     hint: 'New to it' },
  { key: 'returning',    label: 'Returning',    hint: 'Coming back after a break' },
  { key: 'intermediate', label: 'Intermediate', hint: 'Consistent, comfortable' },
  { key: 'advanced',     label: 'Advanced',     hint: 'Experienced, structured' }
];
const RUN_DISTANCES = [
  { key: '5k', label: '5K' }, { key: '10k', label: '10K' },
  { key: 'half', label: 'Half marathon' }, { key: 'marathon', label: 'Marathon' }
];
const SWIM_DISTANCES = [
  { m: 1000, label: '1 km' }, { m: 1500, label: '1.5 km' }, { m: 2000, label: '2 km' },
  { m: 2500, label: '2.5 km' }, { m: 3000, label: '3 km' }
];
const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' }
];
const SESSION_LENGTHS = [30, 45, 60, 75, 90];
const ACCESS = [
  { key: 'full_gym',     label: 'Full gym' },
  { key: 'home_weights', label: 'Home weights' },
  { key: 'pool',         label: 'Pool' },
  { key: 'bike',         label: 'Bike / turbo' },
  { key: 'open_water',   label: 'Open water' },
  { key: 'none',         label: 'No equipment' }
];
const DISCIPLINE_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Cycle', general: 'General health' };

// ---- Shared styles ----
const INPUT = {
  width: '100%', fontSize: 16, padding: '12px 14px', borderRadius: 11,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box'
};
const FIELD_LABEL = {
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
  opacity: 0.6, marginBottom: 6, textTransform: 'uppercase'
};

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// Even split of `days` across `disciplines`, remainder to highest priority.
function proposeAllocation(focus, days) {
  const ds = focusToDisciplines(focus);
  if (!days || !ds.length) return {};
  const base = Math.floor(days / ds.length);
  let rem = days - base * ds.length;
  const out = {};
  ds.forEach(d => { out[d] = base + (rem-- > 0 ? 1 : 0); });
  return out;
}

function Chip({ selected, onClick, label, hint, full }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
        fontFamily: 'inherit', width: full ? '100%' : 'auto',
        border: `1.5px solid ${selected ? 'var(--rust)' : 'var(--hairline)'}`,
        background: selected ? 'rgba(176,74,46,0.08)' : 'var(--bg-surface)',
        color: 'var(--txt-strong)', transition: 'border-color 0.12s, background 0.12s'
      }}
    >
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
        <input type={type} value={value ?? ''} placeholder={placeholder}
          onChange={e => onChange(e.target.value)} style={INPUT}
          inputMode={type === 'number' ? 'decimal' : undefined} />
        {suffix && <span style={{ fontSize: 13, color: 'var(--txt-muted)', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// +/- stepper for the day-allocation step.
function Stepper({ value, onDec, onInc }) {
  const btn = (txt, fn) => (
    <button onClick={fn} style={{
      width: 34, height: 34, borderRadius: 9, border: '1px solid var(--hairline)',
      background: 'var(--bg-surface)', color: 'var(--txt-strong)', fontSize: 18,
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1
    }}>{txt}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {btn('−', onDec)}
      <span style={{ minWidth: 18, textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--txt-strong)' }}>{value}</span>
      {btn('+', onInc)}
    </div>
  );
}

export default function Onboarding() {
  const profile = useTrainingStore(s => s.profile);
  const updateProfile = useTrainingStore(s => s.updateProfile);
  const setGoals = useTrainingStore(s => s.setGoals);
  const addInjury = useTrainingStore(s => s.addInjury);

  const [a, setA] = useState({
    name: profile.name || '',
    age: profile.age ?? '',
    sex: profile.sex || '',
    height_cm: profile.height_cm ?? '',
    bodyweight_kg: profile.bodyweight_kg ?? '',
    focus: [],
    strengthStyle: 'functional',
    experience: {},
    runGoal: { distance: '10k', target_date: '', currentDistance: '5k', currentTime: '' },
    swimGoal: { distance_m: 2000, target_date: '', currentPace: '', currentDistance: '' },
    goals: [{ label: '', target_date: '' }],
    daysPerWeek: null,
    sessionMinutes: 60,
    days: [],
    allocation: {},
    access: [],
    poolLengthM: 25,
    injuries: [],
    notes: ''
  });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setA(prev => ({ ...prev, ...patch }));
  const toggle = (key, listName) => set({
    [listName]: a[listName].includes(key)
      ? a[listName].filter(k => k !== key)
      : [...a[listName], key]
  });

  // Disciplines derived from focus — drive which goal blocks + allocation show.
  const disciplines = focusToDisciplines(a.focus);
  const hasGym = disciplines.includes('gym');
  const hasRun = disciplines.includes('run');
  const hasSwim = disciplines.includes('swim');
  const multi = disciplines.length > 1;

  // Re-propose the day allocation whenever focus or total days change. Manual
  // edits on the allocation step don't refire this (deps don't include it).
  useEffect(() => {
    set({ allocation: proposeAllocation(a.focus, a.daysPerWeek) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.focus.join(','), a.daysPerWeek]);

  const allocSum = Object.values(a.allocation).reduce((x, y) => x + (y || 0), 0);
  const adjustAlloc = (d, delta) => set({
    allocation: { ...a.allocation, [d]: Math.max(0, Math.min(a.daysPerWeek || 7, (a.allocation[d] || 0) + delta)) }
  });

  // ---- Steps (conditional ones are filtered out below) ----
  const steps = [
    {
      title: 'Welcome',
      subtitle: 'A few quick questions so we can shape a plan around you. Takes about two minutes — you can change any of it later.',
      valid: () => true,
      render: () => (
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--txt-body)' }}>
          We'll ask about your sports, experience, goals, and how much time you have.
          Your answers stay private to your account.
        </div>
      )
    },
    {
      title: 'About you',
      subtitle: 'The basics. All optional, but they help tailor volumes and loads.',
      valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Name" value={a.name} onChange={v => set({ name: v })} placeholder="Your name" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Age" value={a.age} onChange={v => set({ age: v })} type="number" suffix="yrs" />
            <div>
              <label style={FIELD_LABEL}>Sex</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['male', 'female', 'other'].map(s => (
                  <Chip key={s} selected={a.sex === s} onClick={() => set({ sex: s })}
                    label={s[0].toUpperCase() + s.slice(1)} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Height" value={a.height_cm} onChange={v => set({ height_cm: v })} type="number" suffix="cm" />
            <Field label="Weight" value={a.bodyweight_kg} onChange={v => set({ bodyweight_kg: v })} type="number" suffix="kg" />
          </div>
        </div>
      )
    },
    {
      title: 'What do you want to train?',
      subtitle: 'Pick everything that applies. We can rebalance these as you go.',
      valid: () => a.focus.length > 0,
      render: () => (
        <div style={{ display: 'grid', gap: 8 }}>
          {FOCUS.map(f => (
            <Chip key={f.key} full selected={a.focus.includes(f.key)}
              onClick={() => toggle(f.key, 'focus')} label={f.label} hint={f.hint} />
          ))}
        </div>
      )
    },
    hasGym && {
      title: 'Your gym emphasis',
      subtitle: 'This shapes your rep ranges and exercise choices — not how often you lift.',
      valid: () => !!a.strengthStyle,
      render: () => (
        <div style={{ display: 'grid', gap: 8 }}>
          {STYLES.map(s => (
            <Chip key={s.key} full selected={a.strengthStyle === s.key}
              onClick={() => set({ strengthStyle: s.key })} label={s.label} hint={s.hint} />
          ))}
        </div>
      )
    },
    {
      title: 'Your experience',
      subtitle: 'Roughly where are you with each one?',
      valid: () => a.focus.every(k => a.experience[k]),
      render: () => (
        <div style={{ display: 'grid', gap: 18 }}>
          {a.focus.map(fk => {
            const f = FOCUS.find(x => x.key === fk);
            return (
              <div key={fk}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)', marginBottom: 8 }}>{f.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {LEVELS.map(l => (
                    <Chip key={l.key} selected={a.experience[fk] === l.key}
                      onClick={() => set({ experience: { ...a.experience, [fk]: l.key } })}
                      label={l.label} hint={l.hint} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Your goals',
      subtitle: 'A target date sets how long your plan is. Current fitness lets us set real pace targets — both optional.',
      valid: () => (hasRun || hasSwim) || a.goals.some(g => g.label.trim()),
      render: () => (
        <div style={{ display: 'grid', gap: 22 }}>
          {hasRun && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>🏃 Run goal</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RUN_DISTANCES.map(d => (
                  <Chip key={d.key} selected={a.runGoal.distance === d.key}
                    onClick={() => set({ runGoal: { ...a.runGoal, distance: d.key } })} label={d.label} />
                ))}
              </div>
              <div>
                <label style={FIELD_LABEL}>Target date (optional)</label>
                <input type="date" value={a.runGoal.target_date}
                  onChange={e => set({ runGoal: { ...a.runGoal, target_date: e.target.value } })}
                  style={{ ...INPUT, fontSize: 14, color: 'var(--txt-muted)' }} />
              </div>
              <div>
                <label style={FIELD_LABEL}>Recent time (optional — for pace targets)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {RUN_DISTANCES.map(d => (
                    <Chip key={d.key} selected={a.runGoal.currentDistance === d.key}
                      onClick={() => set({ runGoal: { ...a.runGoal, currentDistance: d.key } })} label={d.label} />
                  ))}
                </div>
                <input type="text" value={a.runGoal.currentTime} placeholder="e.g. 24:30 or 1:45:00"
                  onChange={e => set({ runGoal: { ...a.runGoal, currentTime: e.target.value } })} style={INPUT} />
              </div>
            </div>
          )}
          {hasSwim && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>🏊 Swim goal</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SWIM_DISTANCES.map(d => (
                  <Chip key={d.m} selected={a.swimGoal.distance_m === d.m}
                    onClick={() => set({ swimGoal: { ...a.swimGoal, distance_m: d.m } })} label={d.label} />
                ))}
              </div>
              <div>
                <label style={FIELD_LABEL}>Target date (optional)</label>
                <input type="date" value={a.swimGoal.target_date}
                  onChange={e => set({ swimGoal: { ...a.swimGoal, target_date: e.target.value } })}
                  style={{ ...INPUT, fontSize: 14, color: 'var(--txt-muted)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Current 100m pace (opt.)" value={a.swimGoal.currentPace}
                  onChange={v => set({ swimGoal: { ...a.swimGoal, currentPace: v } })} placeholder="e.g. 2:05" />
                <Field label="Can swim now (opt.)" value={a.swimGoal.currentDistance}
                  onChange={v => set({ swimGoal: { ...a.swimGoal, currentDistance: v } })} type="number" suffix="m" />
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>Other goals (optional)</div>
            {a.goals.map((g, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                <input type="text" value={g.label} placeholder="e.g. Squat bodyweight, ski-ready"
                  onChange={e => set({ goals: a.goals.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                  style={INPUT} />
                {a.goals.length > 1 && (
                  <button onClick={() => set({ goals: a.goals.filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', color: 'var(--txt-muted)', fontSize: 16, cursor: 'pointer', padding: 4 }}>✕</button>
                )}
              </div>
            ))}
            {a.goals.length < 3 && (
              <button onClick={() => set({ goals: [...a.goals, { label: '', target_date: '' }] })}
                style={{ padding: 10, borderRadius: 10, border: '1.5px dashed var(--hairline)', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--txt-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Add a goal
              </button>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'How much can you train?',
      subtitle: 'Be realistic — a plan you can stick to beats an ideal one you can\'t.',
      valid: () => a.daysPerWeek != null,
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={FIELD_LABEL}>Days per week</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <Chip key={n} selected={a.daysPerWeek === n} onClick={() => set({ daysPerWeek: n })} label={String(n)} />
              ))}
            </div>
          </div>
          <div>
            <label style={FIELD_LABEL}>Typical session length</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SESSION_LENGTHS.map(m => (
                <Chip key={m} selected={a.sessionMinutes === m} onClick={() => set({ sessionMinutes: m })}
                  label={m === 90 ? '90+ min' : `${m} min`} />
              ))}
            </div>
          </div>
          <div>
            <label style={FIELD_LABEL}>Which days suit you? (optional)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map(d => (
                <Chip key={d.key} selected={a.days.includes(d.key)} onClick={() => toggle(d.key, 'days')} label={d.label} />
              ))}
            </div>
          </div>
        </div>
      )
    },
    multi && {
      title: 'Split your week',
      subtitle: 'Here\'s a suggested split across your sports — nudge it to suit you. (Your gym days set whether it\'s full-body, upper/lower, or a push/pull/legs split.)',
      valid: () => allocSum === a.daysPerWeek,
      render: () => (
        <div style={{ display: 'grid', gap: 12 }}>
          {disciplines.map(d => (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-strong)' }}>{DISCIPLINE_LABEL[d] || d}</div>
              <Stepper value={a.allocation[d] || 0} onDec={() => adjustAlloc(d, -1)} onInc={() => adjustAlloc(d, 1)} />
            </div>
          ))}
          <div style={{
            fontSize: 13, fontWeight: 600, textAlign: 'center', marginTop: 4,
            color: allocSum === a.daysPerWeek ? 'var(--moss)' : 'var(--rust)'
          }}>
            {allocSum} of {a.daysPerWeek} days assigned
            {allocSum !== a.daysPerWeek && ` — ${allocSum < a.daysPerWeek ? 'add' : 'remove'} ${Math.abs(a.daysPerWeek - allocSum)}`}
          </div>
        </div>
      )
    },
    {
      title: 'What can you access?',
      subtitle: 'So we only program what you can actually do.',
      valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ACCESS.map(o => (
              <Chip key={o.key} selected={a.access.includes(o.key)} onClick={() => toggle(o.key, 'access')} label={o.label} />
            ))}
          </div>
          {a.access.includes('pool') && (
            <div style={{ marginTop: 6 }}>
              <Field label="Pool length" value={a.poolLengthM} onChange={v => set({ poolLengthM: v })} type="number" suffix="m" />
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Anything to train around?',
      subtitle: 'Current injuries or niggles, and anything else worth knowing. All optional.',
      valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 10 }}>
          {a.injuries.map((inj, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
              <input type="text" value={inj.title} placeholder="e.g. Left knee"
                onChange={e => set({ injuries: a.injuries.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })}
                style={INPUT} />
              <input type="text" value={inj.body_part} placeholder="Area (optional)"
                onChange={e => set({ injuries: a.injuries.map((x, j) => j === i ? { ...x, body_part: e.target.value } : x) })}
                style={INPUT} />
              <button onClick={() => set({ injuries: a.injuries.filter((_, j) => j !== i) })}
                style={{ background: 'none', border: 'none', color: 'var(--txt-muted)', fontSize: 16, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>
          ))}
          <button onClick={() => set({ injuries: [...a.injuries, { title: '', body_part: '' }] })}
            style={{ padding: 10, borderRadius: 10, border: '1.5px dashed var(--hairline)', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--txt-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Add an injury
          </button>
          <div>
            <label style={FIELD_LABEL}>Anything else? (optional)</label>
            <textarea rows={3} value={a.notes} onChange={e => set({ notes: e.target.value })}
              placeholder="Recent times, key lifts, health context…"
              style={{ ...INPUT, resize: 'vertical' }} />
          </div>
        </div>
      )
    },
    {
      title: 'Ready to go',
      subtitle: 'Here\'s what we captured. Create your plan and you\'re in.',
      valid: () => true,
      render: () => {
        const focusLabels = a.focus.map(k => FOCUS.find(f => f.key === k)?.label).filter(Boolean);
        const otherGoals = a.goals.filter(g => g.label.trim());
        const runLabel = hasRun ? `${RUN_DISTANCES.find(d => d.key === a.runGoal.distance)?.label || a.runGoal.distance}${a.runGoal.currentTime.trim() ? ` · from ${a.runGoal.currentTime.trim()}` : ''}` : null;
        const swimLabel = hasSwim ? `${(a.swimGoal.distance_m / 1000)} km${a.swimGoal.currentPace.trim() ? ` · ${a.swimGoal.currentPace.trim()}/100m` : ''}` : null;
        const allocLabel = multi ? disciplines.map(d => `${a.allocation[d] || 0} ${DISCIPLINE_LABEL[d]?.toLowerCase() || d}`).join(' · ') : null;
        return (
          <div style={{ display: 'grid', gap: 10 }}>
            <SummaryRow label="Focus" value={focusLabels.join(', ') || '—'} />
            {hasGym && <SummaryRow label="Gym style" value={STYLES.find(s => s.key === a.strengthStyle)?.label || '—'} />}
            {runLabel && <SummaryRow label="Run goal" value={runLabel} />}
            {swimLabel && <SummaryRow label="Swim goal" value={swimLabel} />}
            {otherGoals.length > 0 && <SummaryRow label="Other goals" value={otherGoals.map(g => g.label.trim()).join(' · ')} />}
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days · ${a.sessionMinutes === 90 ? '90+' : a.sessionMinutes} min` : '—'} />
            {allocLabel && <SummaryRow label="Split" value={allocLabel} />}
            <SummaryRow label="Access" value={a.access.map(k => ACCESS.find(o => o.key === k)?.label).filter(Boolean).join(', ') || '—'} />
            {a.injuries.filter(i => i.title.trim()).length > 0 &&
              <SummaryRow label="Training around" value={a.injuries.filter(i => i.title.trim()).map(i => i.title.trim()).join(', ')} />}
            <p style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 6, lineHeight: 1.5 }}>
              Your detailed plan is generated next from these answers — pace targets, your gym split, and all.
            </p>
          </div>
        );
      }
    }
  ].filter(Boolean);

  // Conditional steps (gym emphasis, week split) can change the step count if the
  // user goes back and edits focus — clamp so we never index past the array.
  const safeStep = Math.min(step, steps.length - 1);
  const cur = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const canNext = cur.valid();

  const next = () => { if (canNext && !isLast) setStep(safeStep + 1); };
  const back = () => setStep(Math.max(0, safeStep - 1));

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);

    // Earliest dated goal anchors plan length; plan_start_date anchors week 1.
    const runCurrent = a.runGoal.currentTime.trim()
      ? { distance: a.runGoal.currentDistance || a.runGoal.distance, time: a.runGoal.currentTime.trim() } : null;
    const swimCurrent = (a.swimGoal.currentPace.trim() || a.swimGoal.currentDistance)
      ? { pace_per_100: a.swimGoal.currentPace.trim() || null, distance_m: numOrNull(a.swimGoal.currentDistance) } : null;

    await updateProfile({
      plan_start_date: today,
      name: a.name.trim(),
      age: numOrNull(a.age),
      sex: a.sex || null,
      height_cm: numOrNull(a.height_cm),
      bodyweight_kg: numOrNull(a.bodyweight_kg),
      focus: a.focus,
      strength_style: hasGym ? a.strengthStyle : null,
      experience: a.experience,
      run_goal: hasRun ? { distance: a.runGoal.distance, target_date: a.runGoal.target_date || '', current: runCurrent } : null,
      swim_goal: hasSwim ? { distance_m: a.swimGoal.distance_m, target_date: a.swimGoal.target_date || '', current: swimCurrent } : null,
      availability: {
        days_per_week: a.daysPerWeek,
        session_minutes: a.sessionMinutes,
        days: a.days,
        allocation: multi ? a.allocation : (disciplines.length === 1 ? { [disciplines[0]]: a.daysPerWeek } : {})
      },
      access: a.access,
      pool_length_m: a.access.includes('pool') ? numOrNull(a.poolLengthM) : null,
      markers: a.notes.trim(),
      onboarded: true
    });

    // Free-text goals become ranked goal rows (run/swim goals live on the profile).
    await setGoals(
      a.goals.filter(g => g.label.trim()).map((g, i) => ({
        rank: i + 1, label: g.label.trim(), target_date: g.target_date || ''
      }))
    );
    for (const inj of a.injuries.filter(i => i.title.trim())) {
      await addInjury({ title: inj.title.trim(), body_part: inj.body_part.trim(), status: 'active', date_occurred: today });
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', padding: '28px 22px 24px'
    }}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 26 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= safeStep ? 'var(--rust)' : 'var(--bg-surface-2)',
            transition: 'background 0.2s'
          }} />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>
          Step {safeStep + 1} of {steps.length}
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>{cur.title}</h1>
        <p className="sub" style={{ marginBottom: 24 }}>{cur.subtitle}</p>
        {cur.render()}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        {step > 0 && (
          <button onClick={back} disabled={saving} style={{
            padding: '14px 20px', borderRadius: 12, border: '1px solid var(--hairline)',
            background: 'transparent', color: 'var(--txt-muted)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>Back</button>
        )}
        <button
          onClick={isLast ? finish : next}
          disabled={!canNext || saving}
          style={{
            flex: 1, padding: 15, borderRadius: 12, border: 'none',
            background: (canNext && !saving) ? 'var(--rust)' : 'var(--bg-surface-2)',
            color: (canNext && !saving) ? '#fff' : 'var(--txt-muted)',
            fontSize: 15, fontWeight: 600, cursor: (canNext && !saving) ? 'pointer' : 'default',
            fontFamily: 'inherit'
          }}
        >
          {saving ? 'Setting up…' : isLast ? 'Create my plan' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--hairline)'
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-muted)', minWidth: 92 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--txt-strong)', flex: 1 }}>{value}</div>
    </div>
  );
}
