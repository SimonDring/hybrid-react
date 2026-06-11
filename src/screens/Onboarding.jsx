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

import { useTrainingStore } from '../stores/trainingStore.js';
import OnboardingWizard from '../components/OnboardingWizard.jsx';
import {
  BLANK_ANSWERS, answersToProfilePatch, answersToInjuries
} from '../lib/onboardingModel.js';

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

  const handleComplete = async (a) => {
    await updateProfile(answersToProfilePatch(a));
    await setGoals([]);   // strength-focused: no separate ranked goals; clear any legacy ones
    for (const inj of answersToInjuries(a)) await addInjury(inj);
    // onboarded:true is now in the store → App.jsx gate unmounts this screen.
  };

  return <OnboardingWizard initialAnswers={initialAnswers} onComplete={handleComplete} />;
}
