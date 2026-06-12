/**
 * OnboardingWizard — the shared first-run questionnaire UI (strength-focused).
 *
 * Lean flow: Welcome → About you → Goal (Build me vs Support a sport) → goal detail
 * → Experience → Capacity (days/length/equipment) → optional main lifts → injuries
 * → summary. The plan is always a GYM plan; "support a sport" biases the strength
 * program rather than adding endurance sessions. Answer→profile mapping lives in
 * src/lib/onboardingModel.js. Used by the production Onboarding screen + /dev tester.
 */

import { useState, useEffect, useRef } from 'react';
import { BLANK_ANSWERS } from '../lib/onboardingModel.js';

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
export const SPORTS = [
  { key: 'run',   label: 'Running', emoji: '🏃' },
  { key: 'cycle', label: 'Cycling', emoji: '🚴' },
  { key: 'swim',  label: 'Swimming', emoji: '🏊' }
];
const SPORT_INTENTS = [
  { key: 'compete',      label: 'I compete',        hint: 'You have races or events — training stays sport-specific.' },
  { key: 'recreational', label: 'I play for fun',   hint: 'Recreational — balanced programme with sport-specific support.' },
  { key: 'build_base',   label: 'Building my base', hint: 'No events right now — maximise strength and conditioning.' }
];
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
const SESSION_LENGTHS = [20, 30, 45, 60, 75, 90];
const STRENGTH_ACCESS = [
  { key: 'full_gym', label: 'Full gym', hint: 'Barbells, machines, cables' },
  { key: 'home_weights', label: 'Home / free weights', hint: 'Dumbbells, maybe a barbell' },
  { key: 'none', label: 'Bodyweight only', hint: 'No equipment' }
];

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

  const isBuild = a.goalType === 'build';
  const isSport = a.goalType === 'sport';
  const hasBarbell = a.strengthAccess === 'full_gym' || a.strengthAccess === 'home_weights';

  const steps = [
    { hero: true, valid: () => true,
      render: () => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 8px' }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, marginBottom: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, background: 'linear-gradient(145deg, var(--rust), #7d2f1c)', boxShadow: '0 12px 34px rgba(176,74,46,0.34)' }}>🏋️</div>
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

    isSport && { title: 'Which sport — and where are you?', subtitle: 'We program supportive strength: heavier, lower-volume, tuned to your sport.', valid: () => !!a.sport && !!a.sportIntent,
      render: () => (
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={FIELD_LABEL}>Sport</label>
            <OptionGrid cols={3}>{SPORTS.map(s => <Chip key={s.key} emoji={s.emoji} center selected={a.sport === s.key} onClick={() => set({ sport: s.key })} label={s.label} />)}</OptionGrid>
          </div>
          <div>
            <label style={FIELD_LABEL}>How do you train for {a.sport || 'your sport'}?</label>
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

    { title: 'Your lifting experience', subtitle: 'How much strength training have you done?', valid: () => !!a.experienceLevel,
      render: () => <OptionGrid cols={2} fill>{LEVELS.map(l => <Chip key={l.key} selected={a.experienceLevel === l.key} onClick={() => set({ experienceLevel: l.key })} label={l.label} hint={l.hint} />)}</OptionGrid> },

    { title: 'How much can you train?', subtitle: "Be realistic — a plan you stick to beats an ideal one you can't.", valid: () => a.daysPerWeek != null && !!a.strengthAccess,
      render: () => (
        <div style={{ display: 'grid', gap: 20 }}>
          <div><label style={FIELD_LABEL}>Days per week</label><OptionGrid cols={4}>{[1, 2, 3, 4, 5, 6, 7].map(n => <Chip key={n} center selected={a.daysPerWeek === n} onClick={() => set({ daysPerWeek: n })} label={String(n)} />)}</OptionGrid></div>
          <div><label style={FIELD_LABEL}>Typical session length</label><OptionGrid cols={3}>{SESSION_LENGTHS.map(m => <Chip key={m} center selected={a.sessionMinutes === m} onClick={() => set({ sessionMinutes: m })} label={m === 90 ? '90+ min' : `${m} min`} />)}</OptionGrid></div>
          <div><label style={FIELD_LABEL}>Equipment</label><OptionGrid cols={1} gap={6}>{STRENGTH_ACCESS.map(o => <Chip key={o.key} selected={a.strengthAccess === o.key} onClick={() => set({ strengthAccess: o.key })} label={o.label} hint={o.hint} />)}</OptionGrid></div>
          <div><label style={FIELD_LABEL}>Which days suit you? (optional)</label><OptionGrid cols={4}>{DAYS.map(d => <Chip key={d.key} center selected={a.days.includes(d.key)} onClick={() => toggle(d.key, 'days')} label={d.label} />)}</OptionGrid></div>
        </div>
      ) },

    hasBarbell && { title: 'Know your main lifts?', subtitle: 'Add your best single rep for real target weights — totally optional.', valid: () => true,
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
          <div style={HINT}>No idea? Leave them blank — log a working set after week 1 and targets build from there.</div>
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
            <textarea rows={3} value={a.notes} onChange={e => set({ notes: e.target.value })} placeholder="Key lifts, health context, preferences…" style={{ ...INPUT, resize: 'vertical' }} />
          </div>
        </div>
      ) },

    { title: 'Ready to go', subtitle: "Here's what we captured. Create your plan and you're in.", valid: () => true,
      render: () => {
        const goalLabel = isSport
          ? `Support ${SPORTS.find(s => s.key === a.sport)?.label || 'sport'} · ${a.sportIntent === 'compete' ? 'competing' : a.sportIntent === 'build_base' ? 'building base' : 'recreational'}`
          : (STYLES.find(s => s.key === a.strengthStyle)?.label || '—');
        const liftBits = hasBarbell ? ['squat', 'bench', 'deadlift'].filter(k => a.lifts[k]).map(k => `${k[0].toUpperCase()}${a.lifts[k]}`) : [];
        return (
          <div style={{ display: 'grid', gap: 6 }}>
            <SummaryRow label="Goal" value={goalLabel} />
            <SummaryRow label="Experience" value={LEVELS.find(l => l.key === a.experienceLevel)?.label || '—'} />
            {liftBits.length > 0 && <SummaryRow label="Maxes" value={liftBits.join(' · ') + ' kg'} />}
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days · ${a.sessionMinutes === 90 ? '90+' : a.sessionMinutes} min` : '—'} />
            <SummaryRow label="Equipment" value={STRENGTH_ACCESS.find(o => o.key === a.strengthAccess)?.label || '—'} />
            {a.injuries.filter(i => i.title.trim()).length > 0 && <SummaryRow label="Train around" value={a.injuries.filter(i => i.title.trim()).map(i => i.title.trim()).join(' · ')} />}
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

      {!isHero && (
        <div style={{ flexShrink: 0, padding: `${devTools ? 4 : 22}px ${PAD}px 0` }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
            {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= safeStep ? 'var(--rust)' : 'var(--bg-surface-2)', transition: 'background 0.2s' }} />)}
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
        <button onClick={isLast ? finish : next} disabled={!canNext || saving} style={{ flex: 1, padding: 15, borderRadius: 12, border: 'none', background: (canNext && !saving) ? 'var(--rust)' : 'var(--bg-surface-2)', color: (canNext && !saving) ? '#fff' : 'var(--txt-muted)', fontSize: 15, fontWeight: 600, cursor: (canNext && !saving) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          {saving ? 'Setting up…' : isLast ? completeLabel : isHero ? 'Get started' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
