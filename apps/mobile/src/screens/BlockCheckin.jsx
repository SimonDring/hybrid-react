// src/screens/BlockCheckin.jsx
/**
 * BlockCheckin — brief wizard shown once when a training block ends.
 * Calls continueBlock() from src/lib/plan/periodization.js to decide
 * the next step, then writes the result to the store.
 *
 * Outcomes:
 *  progress    — new block starts immediately with a fresh plan_start_date
 *  repeat      — same block length restarts (athlete was struggling)
 *  recalibrate — profile.onboarded = false → Onboarding screen takes over
 *  bridge      — 2-week recovery block before resuming
 */
import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { continueBlock } from '@performance-os/engine';

const STEPS = ['feel', 'changed', 'sameGoal', 'hitSessions'];

const FEEL_OPTIONS = [
  { value: 'easy',       label: 'Too easy',       desc: 'Sessions felt light — ready for more.' },
  { value: 'just_right', label: 'Just right',      desc: 'Challenging but manageable.' },
  { value: 'hard',       label: 'Hard',            desc: 'Pushed to keep up but got through it.' },
  { value: 'too_hard',   label: 'Too hard',        desc: 'Frequently sore, drained, or had to skip sessions.' }
];

export default function BlockCheckin() {
  const profile = useTrainingStore(s => s.profile);
  const updateProfile = useTrainingStore(s => s.updateProfile);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    feel: '', changed: null, sameGoal: null, hitSessions: null
  });
  const [completing, setCompleting] = useState(false);

  const weeksCompleted = profile.plan_weeks || 12;

  async function finish(finalAnswers) {
    setCompleting(true);
    // The engine is pure and never reads the clock — the app layer supplies "today".
    const result = continueBlock(profile, finalAnswers, new Date().toISOString().slice(0, 10));
    await updateProfile(result.profilePatch);
    // If recalibrate, updateProfile sets onboarded:false → App.jsx shows Onboarding
    // Otherwise the new plan_start_date triggers plan regeneration on next render
  }

  function answer(key, value) {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    // Cascade: if goal changed, we're done (recalibrate)
    if (key === 'sameGoal' && value === false) {
      finish({ ...updated });
      return;
    }
    // If life changed, skip remaining questions (bridge block)
    if (key === 'changed' && value === true) {
      finish({ ...updated, sameGoal: true, hitSessions: false });
      return;
    }
    // Last question → finish
    if (key === 'hitSessions') {
      finish({ ...updated });
      return;
    }
    setStep(s => s + 1);
  }

  if (completing) {
    return (
      <div className="screen-container onboarding-container">
        <div className="onboarding-card">
          <h2 className="onboarding-title">Setting up your next block…</h2>
          <p className="onboarding-subtitle">Just a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container onboarding-container">
      <div className="onboarding-card">
        <div className="checkin-header">
          <span className="checkin-badge">Block complete</span>
          <h2 className="onboarding-title">You finished {weeksCompleted} weeks</h2>
          <p className="onboarding-subtitle">3 quick questions to set up your next block.</p>
        </div>

        {step === 0 && (
          <div className="checkin-step">
            <p className="field-label">How did this block feel overall?</p>
            <div className="option-cards">
              {FEEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className="option-card"
                  onClick={() => answer('feel', opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="checkin-step">
            <p className="field-label">Did anything significant change? (new injury, illness, big life change)</p>
            <div className="option-cards two-col">
              <button type="button" className="option-card" onClick={() => answer('changed', false)}>
                <strong>No, all good</strong>
              </button>
              <button type="button" className="option-card" onClick={() => answer('changed', true)}>
                <strong>Yes, something changed</strong>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="checkin-step">
            <p className="field-label">Are your training goals still the same?</p>
            <div className="option-cards two-col">
              <button type="button" className="option-card" onClick={() => answer('sameGoal', true)}>
                <strong>Yes, same goals</strong>
              </button>
              <button type="button" className="option-card" onClick={() => answer('sameGoal', false)}>
                <strong>No, my goals have changed</strong>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="checkin-step">
            <p className="field-label">Did you hit most of your sessions?</p>
            <div className="option-cards two-col">
              <button type="button" className="option-card" onClick={() => answer('hitSessions', true)}>
                <strong>Yes, most weeks</strong>
              </button>
              <button type="button" className="option-card" onClick={() => answer('hitSessions', false)}>
                <strong>No, I missed quite a few</strong>
              </button>
            </div>
          </div>
        )}

        <div className="checkin-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`checkin-dot${i <= step ? ' active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
