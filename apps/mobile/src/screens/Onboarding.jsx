/**
 * Onboarding — production first-run gate. Thin wrapper over the shared
 * OnboardingWizard: it seeds the wizard from any existing profile baseline, and
 * on completion writes the answers to the store (Supabase + local cache), which
 * flips profile.onboarded = true and drops the user into the app.
 *
 * All the question screens + answer→profile mapping live in
 * src/components/OnboardingWizard.jsx, shared with the /dev tester so the two
 * never drift. This file owns ONLY the persistence side-effect.
 */

import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import OnboardingWizard from '../components/OnboardingWizard.jsx';
import {
  BLANK_ANSWERS, answersToProfilePatch, answersToInjuries
} from '../lib/onboardingModel.js';
import * as AthleteModelService from '../lib/AthleteModelService.js';
import { clearDraft } from '../lib/onboardingDraft.js';

export default function Onboarding() {
  const profile = useTrainingStore(s => s.profile);
  const updateProfile = useTrainingStore(s => s.updateProfile);
  const setGoals = useTrainingStore(s => s.setGoals);
  const addInjury = useTrainingStore(s => s.addInjury);

  const initialAnswers = {
    ...BLANK_ANSWERS,
    name: profile.name || '',
    age: profile.age ?? '',
    sex: profile.sex || '',
    bodyweight_kg: profile.bodyweight_kg ?? ''
  };

  const [submitError, setSubmitError] = useState(null);

  const handleComplete = async (a) => {
    setSubmitError(null);
    const res = await updateProfile(answersToProfilePatch(a));
    if (!res || res.ok === false) {
      const first = res && res.errors ? Object.values(res.errors)[0] : null;
      setSubmitError(first || 'Please check your details and try again.');
      return; // block: profile not saved, onboarding stays open
    }
    clearDraft(); // profile saved — the in-progress draft is no longer needed
    // Sprint 3: also build + persist the Athlete Model (parallel to the legacy profile;
    // the live engine still consumes the legacy profile). Non-blocking — model persistence
    // must never break onboarding completion.
    try { await AthleteModelService.buildAndSaveFromAnswers(a); }
    catch (e) { console.error('athlete model save failed (non-fatal):', e); }
    await setGoals([]);   // strength-focused: no separate ranked goals; clear any legacy ones
    for (const inj of answersToInjuries(a)) await addInjury(inj);
    // onboarded:true is now in the store → App.jsx gate unmounts this screen.
  };

  return (
    <>
      {submitError && <div className="onboard-error" role="alert">{submitError}</div>}
      <OnboardingWizard initialAnswers={initialAnswers} onComplete={handleComplete} persistDraft />
    </>
  );
}
