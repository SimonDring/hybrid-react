/**
 * Injuries screen (lives under Tracking).
 *
 * Full injury log, wired to the Database `injuries` table via the store.
 * Each injury: body part, title, severity, status, dates, rehab plan, affected
 * activities, a recovery log (progress entries), and prevention notes.
 *
 * VIRTUAL PHYSIO PIPELINE (Stage 5):
 *   A "Get rehab suggestions" button will send injury details to a Claude Edge
 *   Function and return physio-style rehab guidance (clearly labelled as AI, not
 *   medical advice). The AI also reads active injuries to reduce only affected
 *   activities in the plan, tracks recovery responses, and on recovery restores
 *   activity + writes prevention notes. The data model already supports all of
 *   this (rehab_plan_source, physio_approved, ai_generated, recovery_log,
 *   prevention_notes, affected_activities).
 */

import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { ACTIVITY_TYPES } from '../data/activityTypes.js';
import { REGIONS, DIAGNOSES } from '../data/injuryTaxonomy.js';
import { getQuestions, assess } from '../lib/injury/symptomAssessment.js';

const STATUS_OPTIONS = [
  { key: 'active', label: 'Active', color: '#b04a2e' },
  { key: 'rehabbing', label: 'Rehabbing', color: '#c89a3a' },
  { key: 'monitoring', label: 'Monitoring', color: '#4a5d3a' },
  { key: 'recovered', label: 'Recovered', color: '#6a665d' }
];

function statusMeta(key) {
  return STATUS_OPTIONS.find(s => s.key === key) || STATUS_OPTIONS[0];
}

// ─── Module-level style constants ────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', opacity: 0.6, marginBottom: 5
};
const btnStyle = (bg) => ({
  width: '100%', padding: 13, borderRadius: 11, border: 'none', background: bg,
  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8
});
const cancelStyle = {
  width: '100%', padding: 11, marginTop: 4, borderRadius: 11,
  border: '1px solid var(--hairline)', background: 'transparent',
  color: 'var(--txt-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
};
const optionStyle = {
  textAlign: 'left', padding: '12px 14px', borderRadius: 10,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  color: 'var(--txt-strong)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
};

// ─── Module-level helper components ──────────────────────────────────────────

function StepHeader({ step, total, title, onCancel, onBack }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--txt-muted)', fontSize: 20, padding: 0, lineHeight: 1
          }}>←</button>
        )}
        <div className="h3" style={{ margin: 0, flex: 1 }}>{title}</div>
        {typeof step === 'number' && typeof total === 'number' && (
          <div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Step {step} of {total}</div>
        )}
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--txt-muted)', fontSize: 18, padding: 0
        }}>✕</button>
      </div>
    </div>
  );
}

function SeverityPicker({ value, onChange }) {
  const labels = {
    1: '1 — Mild',
    2: '2 — Noticeable',
    3: '3 — Significant',
    4: '4 — Can\'t train area',
    5: '5 — Can\'t train'
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Severity</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            border: `1.5px solid ${value === n ? 'var(--rust)' : 'var(--hairline)'}`,
            background: value === n ? 'var(--rust)' : 'transparent',
            color: value === n ? '#fff' : 'var(--txt-muted)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>{n}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 5 }}>{labels[value]}</div>
    </div>
  );
}

function PhasePicker({ value, onChange }) {
  const phases = [
    { key: 'protect', label: 'Protect & Rest', desc: 'Complete or near-complete rest' },
    { key: 'early_motion', label: 'Early Motion', desc: 'Gentle movement, no load' },
    { key: 'loading', label: 'Strengthening', desc: 'Progressive loading' },
    { key: 'return_to_sport', label: 'Return to Sport', desc: 'Sport-specific, almost full' },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Rehab phase</label>
      <div style={{ display: 'grid', gap: 6 }}>
        {phases.map(p => (
          <button key={p.key} onClick={() => onChange(p.key)} style={{
            textAlign: 'left', padding: '10px 12px', borderRadius: 9,
            border: `1.5px solid ${value === p.key ? 'var(--moss)' : 'var(--hairline)'}`,
            background: value === p.key ? 'rgba(74,93,58,0.08)' : 'transparent',
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-strong)' }}>{p.label}</div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>{p.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{
          width: '100%', fontSize: 15, padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--hairline)', background: 'transparent',
          fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{
          width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--hairline)', background: 'transparent',
          fontFamily: 'inherit', color: 'var(--txt-strong)', boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

// ─── Triage state shape ───────────────────────────────────────────────────────

const EMPTY_TRIAGE = {
  step: 0,            // 0 = hidden, 1 = physio gate, 2+ = steps
  physio_seen: null,
  body_region: null,
  body_part_key: null,
  side: null,
  diagnosis_key: null,
  severity: 3,
  rehab_phase: 'protect',
  title: '',
  description: '',
  rehab_plan: '',
  date_occurred: new Date().toISOString().split('T')[0],
  // symptom path
  symptom_answers: {},
  symptom_step: 0,
  assessment_result: null,
  red_flag_message: null,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Injuries() {
  const injuries = useTrainingStore(s => s.injuries);
  const addInjury = useTrainingStore(s => s.addInjury);
  const updateInjury = useTrainingStore(s => s.updateInjury);
  const removeInjury = useTrainingStore(s => s.removeInjury);
  const addRecoveryLogEntry = useTrainingStore(s => s.addRecoveryLogEntry);

  const [triage, setTriage] = useState(EMPTY_TRIAGE);
  const [expandedId, setExpandedId] = useState(null);
  const [logDraft, setLogDraft] = useState({});

  const setT = (patch) => setTriage(prev => ({ ...prev, ...patch }));

  const active = injuries.filter(i => i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring');
  const resolved = injuries.filter(i => i.status === 'recovered');

  const markRecovered = (inj) => {
    updateInjury(inj.id, { status: 'recovered', date_recovered: new Date().toISOString().split('T')[0] });
  };

  const submitLogEntry = (injId) => {
    const draft = logDraft[injId];
    if (!draft || !draft.note) return;
    addRecoveryLogEntry(injId, draft);
    setLogDraft(d => ({ ...d, [injId]: { note: '', response: '' } }));
  };

  // ─── Handler functions ──────────────────────────────────────────────────────

  function handleSymptomAnswer(questionKey, value, qIdx, questions) {
    const newAnswers = { ...triage.symptom_answers, [questionKey]: value };
    const nextIdx = qIdx + 1;
    const result = assess(triage.body_region || 'other', newAnswers);
    if (result.result === 'red_flag') {
      setT({ symptom_answers: newAnswers, red_flag_message: result.redirect_message });
      return;
    }
    if (nextIdx >= questions.length) {
      setT({
        symptom_answers: newAnswers,
        symptom_step: nextIdx,
        assessment_result: result,
        body_part_key: result.body_part_key,
        diagnosis_key: result.diagnosis_key
      });
    } else {
      setT({ symptom_answers: newAnswers, symptom_step: nextIdx });
    }
  }

  function submitInjury() {
    const fields = {
      body_region:    triage.body_region,
      body_part_key:  triage.body_part_key,
      body_part:      triage.title || (REGIONS[triage.body_region]?.parts[triage.body_part_key]?.label) || '',
      side:           triage.side,
      diagnosis_key:  triage.diagnosis_key,
      title:          triage.title || (triage.body_part_key ? (REGIONS[triage.body_region]?.parts[triage.body_part_key]?.label) : ''),
      description:    triage.description,
      severity:       Number(triage.severity),
      status:         'active',
      rehab_phase:    triage.rehab_phase || 'protect',
      date_occurred:  triage.date_occurred,
      rehab_plan:     triage.rehab_plan || '',
      rehab_plan_source: triage.physio_seen ? 'physio' : 'self',
      physio_seen:    !!triage.physio_seen,
      physio_approved: !!triage.physio_seen,
      symptom_flags:  triage.symptom_answers || {},
      red_flag_triggered: false,
      referred_to_professional: false,
      prevention_exercises: [],
      affected_activities: [],
    };
    addInjury(fields);
    setTriage(EMPTY_TRIAGE);
  }

  function submitRedFlagInjury() {
    const fields = {
      body_region:    triage.body_region,
      body_part_key:  triage.body_part_key,
      body_part:      REGIONS[triage.body_region]?.parts[triage.body_part_key]?.label || '',
      title:          'Injury (see professional)',
      description:    triage.description || '',
      severity:       triage.severity || 3,
      status:         'active',
      rehab_phase:    'protect',
      date_occurred:  triage.date_occurred,
      physio_seen:    false,
      symptom_flags:  triage.symptom_answers || {},
      red_flag_triggered: true,
      referred_to_professional: true,
      prevention_exercises: [],
      affected_activities: [],
    };
    addInjury(fields);
    setTriage(EMPTY_TRIAGE);
  }

  // ─── Triage flow renderer ───────────────────────────────────────────────────

  function renderTriageFlow() {
    const { step, physio_seen, body_region, body_part_key } = triage;

    // Step 0: hidden
    if (step === 0) return null;

    // Step 1: Physio gate
    if (step === 1) {
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div className="h3" style={{ margin: 0, flex: 1 }}>Log an injury</div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Step 1 of 6</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--txt-body)', marginBottom: 20 }}>
            Have you seen a physiotherapist or doctor about this injury?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setT({ step: 2, physio_seen: true })} style={btnStyle('var(--moss)')}>Yes, I have</button>
            <button onClick={() => setT({ step: 2, physio_seen: false })} style={btnStyle('var(--rust)')}>Not yet</button>
          </div>
          <button onClick={() => setTriage(EMPTY_TRIAGE)} style={cancelStyle}>Cancel</button>
        </div>
      );
    }

    // Step 2: Region picker (same for both paths)
    if (step === 2) {
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={2} total={physio_seen ? 7 : 6} title="Which area?" onCancel={() => setTriage(EMPTY_TRIAGE)} onBack={() => setT({ step: 1 })} />
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(REGIONS).map(([key, reg]) => (
              <button key={key} onClick={() => setT({ step: physio_seen ? 3 : 'symptom', body_region: key })} style={optionStyle}>
                {reg.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Physio path — Step 3: Body part picker
    if (step === 3 && physio_seen) {
      const region = REGIONS[body_region];
      if (!region) return null;
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={3} total={7} title="Which part?" onCancel={() => setTriage(EMPTY_TRIAGE)} onBack={() => setT({ step: 2 })} />
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(region.parts).map(([key, part]) => (
              <button key={key} onClick={() => setT({ step: 4, body_part_key: key })} style={optionStyle}>
                {part.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Physio path — Step 4: Side
    if (step === 4 && physio_seen) {
      const region = REGIONS[body_region];
      const part = region && region.parts[body_part_key];
      const sides = part ? part.sides : ['left', 'right', 'both', 'n/a'];
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={4} total={7} title="Which side?" onCancel={() => setTriage(EMPTY_TRIAGE)} onBack={() => setT({ step: 3 })} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sides.map(s => (
              <button key={s} onClick={() => setT({ step: 5, side: s })} style={{ ...btnStyle('var(--moss)'), flex: 1 }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Physio path — Step 5: Diagnosis picker
    if (step === 5 && physio_seen) {
      const diags = DIAGNOSES[body_part_key] || [];
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={5} total={7} title="Any specific diagnosis?" onCancel={() => setTriage(EMPTY_TRIAGE)} onBack={() => setT({ step: 4 })} />
          <div style={{ display: 'grid', gap: 8 }}>
            {diags.map(d => (
              <button key={d.key} onClick={() => setT({ step: 6, diagnosis_key: d.key })} style={optionStyle}>
                {d.label}
              </button>
            ))}
            <button onClick={() => setT({ step: 6, diagnosis_key: null })} style={{ ...optionStyle, color: 'var(--txt-muted)' }}>
              No specific diagnosis / not sure
            </button>
          </div>
        </div>
      );
    }

    // Physio path — Step 6: Severity + phase
    if (step === 6 && physio_seen) {
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={6} total={7} title="Severity & phase" onCancel={() => setTriage(EMPTY_TRIAGE)} onBack={() => setT({ step: 5 })} />
          <SeverityPicker value={triage.severity} onChange={v => setT({ severity: v })} />
          <PhasePicker value={triage.rehab_phase} onChange={v => setT({ rehab_phase: v })} />
          <button onClick={() => setT({ step: 7 })} style={btnStyle('var(--rust)')}>Next</button>
        </div>
      );
    }

    // Physio path — Step 7: Notes + save
    if (step === 7 && physio_seen) {
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader step={7} total={7} title="Physio notes" onCancel={() => setTriage(EMPTY_TRIAGE)} onBack={() => setT({ step: 6 })} />
          <FormField label="Title / diagnosis name" value={triage.title} onChange={v => setT({ title: v })} placeholder="e.g. Patellar tendinopathy" />
          <FormField label="Date occurred" type="date" value={triage.date_occurred} onChange={v => setT({ date_occurred: v })} />
          <FormTextarea label="Physio's notes or protocol" value={triage.rehab_plan} onChange={v => setT({ rehab_plan: v })} placeholder="Exercises, frequency, restrictions…" />
          <button onClick={submitInjury} style={btnStyle('var(--rust)')}>Save injury</button>
        </div>
      );
    }

    // Self-reported path — symptom questionnaire
    if (step === 'symptom') {
      const questions = getQuestions(body_region || 'other');
      const qIdx = triage.symptom_step || 0;

      // Red flag triggered
      if (triage.red_flag_message) {
        return (
          <div className="form-card" style={{ marginBottom: 20 }}>
            <div className="h3" style={{ marginTop: 0, color: 'var(--rust)' }}>Please see a professional</div>
            <p style={{ fontSize: 14, color: 'var(--txt-body)', lineHeight: 1.5, marginBottom: 16 }}>
              {triage.red_flag_message}
            </p>
            <p style={{ fontSize: 13, color: 'var(--txt-muted)', marginBottom: 16 }}>
              We can still log this injury for your records, but we won't generate a rehab plan until you've been assessed.
            </p>
            <button onClick={submitRedFlagInjury} style={btnStyle('var(--moss)')}>Log injury (no rehab plan)</button>
            <button onClick={() => setTriage(EMPTY_TRIAGE)} style={cancelStyle}>Cancel</button>
          </div>
        );
      }

      // All questions answered → show assessment result
      if (qIdx >= questions.length && triage.assessment_result) {
        const r = triage.assessment_result;
        const suggestedDiag = r.diagnosis_key
          ? (DIAGNOSES[r.body_part_key] || []).find(d => d.key === r.diagnosis_key)
          : null;
        return (
          <div className="form-card" style={{ marginBottom: 20 }}>
            <StepHeader
              step={questions.length + 1}
              total={questions.length + 2}
              title="Does this sound right?"
              onCancel={() => setTriage(EMPTY_TRIAGE)}
              onBack={() => setT({ symptom_step: qIdx - 1 })}
            />
            {suggestedDiag && (
              <div style={{ background: 'var(--bg-surface-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginBottom: 4 }}>This sounds like it could be</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>{suggestedDiag.label}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button onClick={() => setT({ step: 'self_severity' })} style={btnStyle('var(--moss)')}>Yes, sounds right</button>
              <button onClick={() => setT({ step: 'self_severity', diagnosis_key: null })} style={btnStyle('var(--rust)')}>Not sure / different</button>
            </div>
          </div>
        );
      }

      // Show current question
      const q = questions[qIdx];
      if (!q) return null;
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader
            step={qIdx + 1}
            total={questions.length + 2}
            title="Tell us about it"
            onCancel={() => setTriage(EMPTY_TRIAGE)}
            onBack={qIdx > 0 ? () => setT({ symptom_step: qIdx - 1 }) : null}
          />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--txt-strong)', marginBottom: 16 }}>{q.text}</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {q.options.map(opt => (
              <button key={opt.value} onClick={() => handleSymptomAnswer(q.key, opt.value, qIdx, questions)} style={optionStyle}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Self-reported path — Step 'self_severity': severity + save
    if (step === 'self_severity') {
      return (
        <div className="form-card" style={{ marginBottom: 20 }}>
          <StepHeader
            step="last"
            total="last"
            title="How severe?"
            onCancel={() => setTriage(EMPTY_TRIAGE)}
            onBack={() => setT({ step: 'symptom', symptom_step: (getQuestions(body_region || 'other').length - 1) })}
          />
          <SeverityPicker value={triage.severity} onChange={v => setT({ severity: v })} />
          <FormField label="Brief description (optional)" value={triage.description} onChange={v => setT({ description: v })} placeholder="How it happened, how it feels…" />
          <FormField label="Date occurred" type="date" value={triage.date_occurred} onChange={v => setT({ date_occurred: v })} />
          <button onClick={submitInjury} style={btnStyle('var(--rust)')}>Save injury</button>
        </div>
      );
    }

    return null;
  }

  // ─── InjuryCard ─────────────────────────────────────────────────────────────

  const InjuryCard = ({ inj }) => {
    const meta = statusMeta(inj.status);
    const expanded = expandedId === inj.id;
    return (
      <div style={{
        border: '1px solid var(--hairline)', borderRadius: 14, marginBottom: 10,
        background: 'var(--bg-surface)', overflow: 'hidden'
      }}>
        <button
          onClick={() => setExpandedId(expanded ? null : inj.id)}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            background: 'transparent', border: 'none', padding: '14px 16px',
            borderLeft: `3px solid ${meta.color}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>
                {inj.title || inj.body_part || 'Untitled injury'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginTop: 2 }}>
                {inj.body_part}{inj.body_part && inj.date_occurred ? ' · ' : ''}{inj.date_occurred}
              </div>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: meta.color, background: `${meta.color}1a`, borderRadius: 100, padding: '4px 9px'
            }}>{meta.label}</span>
          </div>
        </button>

        {expanded && (
          <div style={{ padding: '0 16px 16px', borderLeft: `3px solid ${meta.color}` }}>
            {inj.description && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)', marginBottom: 12 }}>{inj.description}</p>
            )}

            {inj.affected_activities && inj.affected_activities.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 5 }}>Affected activities</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {inj.affected_activities.map(a => (
                    <span key={a} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'var(--bg-surface-2)', color: 'var(--txt-body)' }}>
                      {ACTIVITY_TYPES[a] ? ACTIVITY_TYPES[a].label : a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inj.rehab_plan && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 5 }}>Rehab plan</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--txt-body)', whiteSpace: 'pre-wrap' }}>{inj.rehab_plan}</p>
              </div>
            )}

            {/* Rehab phase stepper */}
            {inj.status !== 'recovered' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>Rehab phase</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { key: 'protect', label: 'Protect' },
                    { key: 'early_motion', label: 'Early Motion' },
                    { key: 'loading', label: 'Strengthen' },
                    { key: 'return_to_sport', label: 'Return' },
                  ].map((p, idx, arr) => {
                    const phases = arr.map(x => x.key);
                    const current = phases.indexOf(inj.rehab_phase || 'protect');
                    const thisIdx = idx;
                    const isActive = thisIdx === current;
                    const isDone = thisIdx < current;
                    return (
                      <button
                        key={p.key}
                        onClick={() => {
                          if (thisIdx === current + 1 && confirm(`Advance to "${p.label}" phase?`)) {
                            updateInjury(inj.id, { rehab_phase: p.key });
                          }
                        }}
                        style={{
                          flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
                          cursor: thisIdx === current + 1 ? 'pointer' : 'default',
                          background: isDone ? 'var(--moss)' : isActive ? 'var(--ochre)' : 'var(--bg-surface-2)',
                          fontSize: 10, fontWeight: 600,
                          color: (isDone || isActive) ? '#fff' : 'var(--txt-muted)',
                          fontFamily: 'inherit'
                        }}
                      >{p.label}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recovery log */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>Recovery log</div>
              {(inj.recovery_log || []).length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--txt-muted)', fontStyle: 'italic', marginBottom: 8 }}>No entries yet.</p>
              )}
              {(inj.recovery_log || []).map((e, i) => (
                <div key={i} style={{ fontSize: 12.5, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid var(--hairline)' }}>
                  <span style={{ color: 'var(--txt-muted)' }}>{e.date}</span> — {e.note}
                  {e.response && <span style={{ color: 'var(--moss)', fontWeight: 600 }}> ({e.response})</span>}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Add progress note…"
                  value={(logDraft[inj.id] && logDraft[inj.id].note) || ''}
                  onChange={e => setLogDraft(d => ({ ...d, [inj.id]: { ...(d[inj.id] || {}), note: e.target.value } }))}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--hairline)', background: 'transparent', fontFamily: 'inherit', color: 'var(--txt-strong)' }}
                />
                <button onClick={() => submitLogEntry(inj.id)} style={{
                  padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--rust)',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>Add</button>
              </div>
            </div>

            {/* Prevention exercises — shown on recovered injuries */}
            {inj.status === 'recovered' && (inj.prevention_exercises || []).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 6 }}>Prevention exercises</div>
                {(inj.prevention_exercises || []).map((ex, i) => (
                  <div key={i} style={{ fontSize: 12.5, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid var(--moss)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--txt-strong)' }}>{ex.name || ex}</div>
                    {ex.duration && <div style={{ color: 'var(--txt-muted)', fontSize: 11 }}>{ex.duration}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {inj.status !== 'recovered' && (
                <button onClick={() => markRecovered(inj)} style={{
                  flex: 1, minWidth: 130, padding: '10px', borderRadius: 9, border: '1px solid var(--moss)',
                  background: 'transparent', color: 'var(--moss)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>Mark recovered</button>
              )}
              <button onClick={() => { if (confirm('Delete this injury record?')) removeInjury(inj.id); }} style={{
                padding: '10px 14px', borderRadius: 9, border: '1px solid var(--hairline)',
                background: 'transparent', color: 'var(--txt-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>Delete</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <h1 className="h1">Injury log</h1>
      <p className="sub">Track injuries, rehab, and recovery. Active injuries will guide AI plan adjustments once integrated.</p>

      {triage.step === 0 && (
        <button onClick={() => setT({ step: 1 })} style={{
          width: '100%', padding: 12, borderRadius: 12, border: '1.5px dashed var(--hairline)',
          background: 'transparent', fontSize: 14, fontWeight: 600, color: 'var(--rust)',
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20
        }}>+ Log an injury</button>
      )}

      {renderTriageFlow()}

      {injuries.length === 0 && triage.step === 0 && (
        <p style={{ fontSize: 13, color: 'var(--txt-muted)', textAlign: 'center', marginTop: 30 }}>No injuries logged. Good.</p>
      )}

      {active.length > 0 && (
        <>
          <div className="h3">Current</div>
          {active.map(inj => <InjuryCard key={inj.id} inj={inj} />)}
        </>
      )}

      {resolved.length > 0 && (
        <>
          <div className="h3" style={{ marginTop: 20 }}>Recovered</div>
          {resolved.map(inj => <InjuryCard key={inj.id} inj={inj} />)}
        </>
      )}
    </>
  );
}
