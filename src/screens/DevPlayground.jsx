/**
 * DevPlayground — hidden developer testing route (/dev).
 *
 * Lets you iterate on the onboarding → plan-generation pipeline without an
 * account and WITHOUT touching production data or Supabase:
 *   • Onboarding simulator — the REAL OnboardingWizard in devTools mode
 *     (step-jumper, next/back), answers held in local React state only.
 *   • Preset seeds — one click to fill a representative athlete, so you don't
 *     re-answer everything each iteration.
 *   • Generate / Regenerate / Clear — build the plan from the current answers
 *     (calls generatePlan() directly — a pure function; no store, no network).
 *   • Plan review — phases, weeks, sessions and per-exercise targets, rendered
 *     with the same activity-type columns the live app uses.
 *   • Review notes — Good / Issues / Changes / Bugs, persisted to localStorage
 *     (a dev-only key; never written to Supabase).
 *
 * Reached by typing the URL only — it is not linked anywhere and is registered
 * before the auth/onboarding gate in App.jsx, so it needs no sign-in.
 */

import { useState, useEffect } from 'react';
import OnboardingWizard from '../components/OnboardingWizard.jsx';
import { BLANK_ANSWERS, answersToProfile } from '../lib/onboardingModel.js';
import { generatePlan } from '../lib/PlanGenerator.js';
import { activityFor } from '../data/activityTypes.js';
import { volumeReport } from '../lib/plan/volume.js';
import { weeklyMuscleTargets } from '../lib/strength/targets.js';
import { resolveProgram } from '../lib/strength/program.js';
import { MUSCLE_LABELS } from '../data/muscleVolume.js';

const NOTES_KEY = 'htp_dev_review_notes';

// Representative athletes for the new strength-focused model — each is a full
// answer set merged over BLANK_ANSWERS.
const PRESETS = [
  { name: 'Strength (4d)', answers: { ...BLANK_ANSWERS, name: 'Test Strength', goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', lifts: { squat: '160', bench: '110', deadlift: '200' }, daysPerWeek: 4, sessionMinutes: 75, days: ['mon', 'tue', 'thu', 'fri'], strengthAccess: 'full_gym' } },
  { name: 'Muscle (5d)', answers: { ...BLANK_ANSWERS, name: 'Test Muscle', goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 5, sessionMinutes: 60, days: ['mon', 'tue', 'wed', 'thu', 'fri'], strengthAccess: 'full_gym' } },
  { name: 'Functional (3d)', answers: { ...BLANK_ANSWERS, name: 'Test Functional', goalType: 'build', strengthStyle: 'functional', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], strengthAccess: 'home_weights' } },
  { name: 'Runner support · off', answers: { ...BLANK_ANSWERS, name: 'Test Runner', goalType: 'sport', sport: 'run', sportSeason: 'off', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], strengthAccess: 'full_gym' } },
  { name: 'Cyclist support · in', answers: { ...BLANK_ANSWERS, name: 'Test Cyclist', goalType: 'sport', sport: 'cycle', sportSeason: 'in', experienceLevel: 'intermediate', daysPerWeek: 2, sessionMinutes: 45, days: ['tue', 'fri'], strengthAccess: 'full_gym' } },
  { name: 'Swimmer support · off', answers: { ...BLANK_ANSWERS, name: 'Test Swimmer', goalType: 'sport', sport: 'swim', sportSeason: 'off', experienceLevel: 'intermediate', daysPerWeek: 3, sessionMinutes: 45, days: ['mon', 'wed', 'fri'], strengthAccess: 'full_gym' } },
  { name: 'Busy · 20-min bodyweight', answers: { ...BLANK_ANSWERS, name: 'Test Busy', goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, sessionMinutes: 20, days: ['mon', 'wed', 'fri'], strengthAccess: 'none' } }
];

const card = { background: 'var(--bg-surface)', border: '1px solid var(--hairline)', borderRadius: 14, padding: 16, marginBottom: 14 };
const btn = (active) => ({
  padding: '8px 12px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
  border: '1px solid var(--hairline)', background: active ? 'var(--rust)' : 'var(--bg-surface)', color: active ? '#fff' : 'var(--txt-strong)'
});

// ---- plan review pieces ----
function ItemsTable({ session }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {session.items.map((it, i) => {
        const def = activityFor(it);
        return (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12, paddingBottom: 5, borderBottom: '1px solid var(--hairline)' }}>
            <span style={{ fontWeight: 700, color: it.superset ? 'var(--rust)' : 'var(--txt-muted)', minWidth: 26 }}>{it.num}</span>
            <span style={{ fontWeight: 600, color: 'var(--txt-strong)', flex: '1 1 120px' }}>{it.name || it.stroke}</span>
            {def.columns.map(col => {
              const v = col.accessor(it);
              if (v === '' || v == null || v === '—') return null;
              return (
                <span key={col.key} style={{ color: col.accent ? 'var(--rust)' : 'var(--txt-body)', fontWeight: col.emphasis ? 700 : 400 }}>
                  <span style={{ opacity: 0.5 }}>{col.label}:</span> {v}
                </span>
              );
            })}
            {def.cue(it) && <span style={{ width: '100%', color: 'var(--txt-muted)', fontStyle: 'italic' }}>{def.cue(it)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// Per-week strength volume: actual sets vs this week's target (the "training
// debt"). Counts only gym sets, so it's blank for pure endurance weeks.
// Colour shows how close actual is to target. (see lib/strength/targets.js)
const GRADE_COLOR = {
  under: 'var(--rust)', low: 'var(--ochre)', ideal: 'var(--moss)',
  high: 'var(--ochre)', over: 'var(--rust)'
};
const gymLevel = (p) => (p.experience && (p.experience.gym || p.experience.strength_functional || p.experience.strength_physique)) || 'beginner';
const intentOf = (title) => {
  const t = (title || '').toLowerCase();
  return t.includes('peak') ? 'peak' : t.includes('build') ? 'build' : 'base';
};
// How close actual volume is to the week's target → chip colour.
function fillColor(actual, target) {
  if (!target) return 'var(--txt-muted)';
  const r = actual / target;
  if (r >= 0.9) return 'var(--moss)';   // on target
  if (r >= 0.6) return 'var(--ochre)';  // building
  return 'var(--rust)';                 // well short
}
function VolumeReport({ phase, week, profile }) {
  const { rows, skipped } = volumeReport(week.sessions);
  const prog = resolveProgram(profile);
  const targets = weeklyMuscleTargets({
    style: prog.style, intent: intentOf(phase.title),
    weekInPhase: week.num - phase.weekStart + 1, phaseWeeks: phase.weekEnd - phase.weekStart + 1,
    level: prog.level, deload: week.deload, emphasis: prog.emphasis, volumeScalar: prog.volumeScalar
  });
  const active = rows.filter(r => r.sets > 0 || targets[r.muscle] > 0);
  if (!active.length) return null;
  const totDone = active.reduce((a, r) => a + r.sets, 0);
  const totTgt = active.reduce((a, r) => a + (targets[r.muscle] || 0), 0);
  return (
    <div style={{ border: '1px dashed var(--hairline)', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', opacity: 0.5, marginBottom: 8 }}>
        WEEKLY SET VOLUME · actual / target ·{' '}
        <span style={{ color: fillColor(totDone, totTgt) }}>{Math.round(totDone)}</span>/{Math.round(totTgt)} sets
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {active.map(r => {
          const tgt = targets[r.muscle] || 0;
          return (
            <span key={r.muscle} title={`MEV ${r.landmarks.mev} · MAV ${r.landmarks.mav} · MRV ${r.landmarks.mrv} — ${r.grade}`}
              style={{ fontSize: 11, padding: '3px 7px', borderRadius: 7, background: 'var(--bg-surface)', border: '1px solid var(--hairline)' }}>
              <span style={{ color: 'var(--txt-muted)' }}>{MUSCLE_LABELS[r.muscle]}</span>{' '}
              <span style={{ fontWeight: 700, color: fillColor(r.sets, tgt) }}>{r.sets}</span>
              <span style={{ color: 'var(--txt-muted)', opacity: 0.6 }}>/{tgt}</span>
            </span>
          );
        })}
      </div>
      {skipped.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 7 }}>
          uncounted ({skipped.length}): {[...new Set(skipped)].join(', ')}
        </div>
      )}
    </div>
  );
}

function WeekBlock({ phase, week, profile }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
        border: '1px solid var(--hairline)', background: 'var(--bg-surface-2)', color: 'var(--txt-strong)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          Week {week.num} {week.deload && <span style={{ color: 'var(--ochre)', fontWeight: 600 }}>· deload</span>}
        </span>
        <span style={{ fontSize: 11, color: 'var(--txt-muted)' }}>{week.sessions.length} sessions · {open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 4px 4px', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', fontStyle: 'italic' }}>{week.theme}</div>
          <VolumeReport phase={phase} week={week} profile={profile} />
          {week.sessions.map((s, i) => (
            <div key={i} style={{ border: '1px solid var(--hairline)', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>{s.title}</span>
                <span style={{ fontSize: 11, color: 'var(--txt-muted)' }}>{s.duration}</span>
              </div>
              <ItemsTable session={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanReview({ plan, profile }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--txt-body)', marginBottom: 12 }}>
        <strong>{plan.totalWeeks} weeks</strong> · {plan.phases.length} phases ·{' '}
        {plan.phases[0]?.weeks[0]?.sessions.length || 0} sessions/week
      </div>
      {plan.phases.map(phase => (
        <div key={phase.id} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt-strong)' }}>
            {phase.title} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt-muted)' }}>{phase.range}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginBottom: 4 }}>{phase.tagline}</div>
          {phase.gates?.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginBottom: 8 }}>
              Gates: {phase.gates.map(g => g.label).join(' · ')}
            </div>
          )}
          {phase.weeks.map(week => <WeekBlock key={week.num} phase={phase} week={week} profile={profile} />)}
        </div>
      ))}
    </div>
  );
}

const NOTE_FIELDS = [
  { key: 'good', label: '✅ Good', placeholder: 'What works well…' },
  { key: 'issues', label: '⚠️ Issues / not good', placeholder: 'What reads wrong…' },
  { key: 'changes', label: '🔧 Changes to make', placeholder: 'What to adjust…' },
  { key: 'bugs', label: '🐞 Bugs', placeholder: 'Anything broken…' }
];

export default function DevPlayground() {
  const [seed, setSeed] = useState(BLANK_ANSWERS);
  const [seedKey, setSeedKey] = useState(0);
  const [answers, setAnswers] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [notes, setNotes] = useState({ good: '', issues: '', changes: '', bugs: '' });

  // Load persisted review notes once (dev-only localStorage key, never Supabase).
  useEffect(() => {
    try { const saved = localStorage.getItem(NOTES_KEY); if (saved) setNotes(JSON.parse(saved)); } catch { /* ignore */ }
  }, []);
  const updateNote = (key, value) => {
    const nextNotes = { ...notes, [key]: value };
    setNotes(nextNotes);
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(nextNotes)); } catch { /* ignore */ }
  };

  const generateFrom = (a) => {
    try { setError(null); setPlan(generatePlan(answersToProfile(a))); }
    catch (e) { setError(e?.message || String(e)); setPlan(null); }
  };

  const applyPreset = (preset) => { setSeed(preset.answers); setSeedKey(k => k + 1); setPlan(null); setError(null); };
  const resetAnswers = () => { setSeed({ ...BLANK_ANSWERS }); setSeedKey(k => k + 1); setPlan(null); setError(null); };

  const profilePreview = answers ? answersToProfile(answers) : null;

  return (
    // Own full-viewport scroll container: body has overflow:hidden and relies on
    // the app shell's .screen for scrolling, which /dev renders outside of.
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto', overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch', background: 'var(--bg-surface-2)'
    }}>
      <div style={{
        maxWidth: 760, margin: '0 auto', boxSizing: 'border-box',
        padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(60px + env(safe-area-inset-bottom))'
      }}>
        <div style={{ background: 'var(--ochre)', color: '#1a1205', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
          DEV TESTING MODE · local only — nothing here is saved to your account or Supabase
        </div>

      {/* Presets */}
      <div style={card}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 10 }}>QUICK-FILL PRESETS</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => applyPreset(p)} style={btn(false)}>{p.name}</button>
          ))}
          <button onClick={resetAnswers} style={{ ...btn(false), color: 'var(--txt-muted)' }}>Reset (blank)</button>
        </div>
      </div>

      {/* Onboarding simulator */}
      <div style={card}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 10 }}>ONBOARDING SIMULATOR</div>
        <OnboardingWizard
          key={seedKey}
          initialAnswers={seed}
          devTools
          completeLabel="Generate plan ↓"
          onAnswersChange={setAnswers}
          onComplete={generateFrom}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => answers && generateFrom(answers)} style={{ ...btn(true), padding: '10px 16px' }}>
          {plan ? 'Regenerate plan' : 'Generate plan'}
        </button>
        {plan && <button onClick={() => setPlan(null)} style={btn(false)}>Clear plan</button>}
        <button onClick={() => setShowJson(s => !s)} style={btn(showJson)}>{showJson ? 'Hide' : 'Show'} JSON</button>
      </div>

      {error && (
        <div style={{ ...card, borderColor: 'var(--rust)', color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>
          Generation error: {error}
        </div>
      )}

      {/* Plan review */}
      {plan && <div style={card}><PlanReview plan={plan} profile={profilePreview || {}} /></div>}

      {/* Raw JSON (profile + plan) */}
      {showJson && (
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 8 }}>PROFILE FED TO GENERATOR</div>
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--txt-body)', margin: 0 }}>
            {JSON.stringify(profilePreview, null, 2)}
          </pre>
        </div>
      )}

      {/* Review notes */}
      <div style={card}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 10 }}>REVIEW NOTES (saved locally)</div>
        <div style={{ display: 'grid', gap: 12 }}>
          {NOTE_FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--txt-strong)' }}>{f.label}</label>
              <textarea rows={3} value={notes[f.key]} placeholder={f.placeholder} onChange={e => updateNote(f.key, e.target.value)}
                style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--hairline)', background: 'var(--bg-surface)', color: 'var(--txt-strong)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
