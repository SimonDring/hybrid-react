/**
 * TrainNow — the on-demand "I've got X minutes and this kit, give me a session"
 * screen. Picks your time + equipment, then generates ONE optimal gym session
 * aimed at the week's biggest remaining volume gaps (PlanService.generateTrainNow,
 * which reuses the same allocator as the weekly plan), with a plain-language why.
 *
 * This first cut generates + previews the session. Logging an ad-hoc session so it
 * banks toward the week is the next step.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { activityFor } from '../data/activityTypes.js';

const TIMES = [20, 30, 45, 60, 75];
const KITS = [
  { key: 'full_gym', label: 'Full gym', equip: ['full_gym'] },
  { key: 'home_weights', label: 'Home weights', equip: ['home_weights'] },
  { key: 'dumbbell', label: 'Dumbbells', equip: ['dumbbell'] },
  { key: 'band', label: 'Bands', equip: ['band'] },
  { key: 'bodyweight', label: 'Bodyweight', equip: ['bodyweight'] }
];

const chip = (active) => ({
  padding: '9px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  cursor: 'pointer', border: '1px solid var(--hairline)',
  background: active ? 'var(--rust)' : 'var(--bg-surface)', color: active ? '#fff' : 'var(--txt-strong)'
});

function ItemRow({ item }) {
  const def = activityFor(item);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span style={{ fontWeight: 700, color: item.superset ? 'var(--rust)' : 'var(--txt-muted)', minWidth: 24 }}>{item.num}</span>
      <span style={{ fontWeight: 600, color: 'var(--txt-strong)', flex: '1 1 130px' }}>{item.name}</span>
      {def.columns.map(col => {
        const v = col.accessor(item);
        if (v === '' || v == null || v === '—') return null;
        return (
          <span key={col.key} style={{ color: col.accent ? 'var(--rust)' : 'var(--txt-body)', fontWeight: col.emphasis ? 700 : 400 }}>
            <span style={{ opacity: 0.5 }}>{col.label}:</span> {v}
          </span>
        );
      })}
      {def.cue(item) && <span style={{ width: '100%', color: 'var(--txt-muted)', fontStyle: 'italic' }}>{def.cue(item)}</span>}
    </div>
  );
}

export default function TrainNow() {
  const navigate = useNavigate();
  const applyTrainNow = useTrainingStore(state => state.applyTrainNow);
  const [minutes, setMinutes] = useState(45);
  const [kit, setKit] = useState('full_gym');
  const [result, setResult] = useState(null);

  const generate = () => {
    const equip = (KITS.find(k => k.key === kit) || {}).equip || [];
    setResult(Plan.generateTrainNow({ minutes, equip }));
  };

  // Pin this session onto the slot it adapts, then open it to train + log normally.
  const doIt = () => {
    const t = result.target;
    if (!t) return;
    const s = result.session;
    applyTrainNow(t.key, { focus: s.focus, duration: s.duration, items: s.items, minutes: result.minutes, equip: result.equip });
    navigate(`/phases/${t.phaseId}/weeks/${t.weekNum}/sessions/${t.idx}`);
  };

  return (
    <>
      <div className="eyebrow">On demand</div>
      <h1 className="h1">Train now</h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        Tell me how long you've got and what's around — I'll build the session that
        moves your goal forward most, right now.
      </p>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--txt-muted)', marginBottom: 8 }}>HOW LONG?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIMES.map(t => (
            <button key={t} onClick={() => setMinutes(t)} style={chip(minutes === t)}>{t} min</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--txt-muted)', marginBottom: 8 }}>WHAT HAVE YOU GOT?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {KITS.map(k => (
            <button key={k.key} onClick={() => setKit(k.key)} style={chip(kit === k.key)}>{k.label}</button>
          ))}
        </div>
      </div>

      <button className="btn-primary" style={{ width: '100%' }} onClick={generate}>
        {result ? 'Rebuild session' : 'Build my session'}
      </button>

      {result && (
        <div style={{ marginTop: 22 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--hairline)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--txt-strong)' }}>{result.session.focus}</span>
              <span style={{ fontSize: 12, color: 'var(--txt-muted)', whiteSpace: 'nowrap' }}>{result.session.duration}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--txt-body)', margin: '0 0 12px', lineHeight: 1.5 }}>{result.why}</p>
            <div>
              {result.session.items.map((it, i) => <ItemRow key={i} item={it} />)}
            </div>
            {result.session.items.some(it => it.superset) && (
              <p style={{ fontSize: 11.5, color: 'var(--txt-muted)', margin: '10px 0 0', lineHeight: 1.4 }}>
                Items sharing a letter (A1 + A2) are <strong style={{ color: 'var(--rust)' }}>supersets</strong> — alternate with short rest.
              </p>
            )}
          </div>
          {result.target ? (
            <>
              <button className="btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={doIt}>
                Do this session
              </button>
              <p className="sub" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                Replaces your next gym session and counts toward this week. The rest of the week reflows around it.
              </p>
            </>
          ) : (
            <p className="sub" style={{ fontSize: 12, marginTop: 12, textAlign: 'center' }}>
              No upcoming gym session to attach this to — finish onboarding to start logging.
            </p>
          )}
        </div>
      )}
    </>
  );
}
