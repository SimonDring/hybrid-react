/**
 * previewSeed — dev-only. Populates the local (anon-namespace) Database with a
 * realistic mock athlete so the REAL screens render without sign-in or onboarding.
 *
 * Reached via the `?preview=1` URL flag (see App.jsx). Never touches Supabase;
 * writes only to the local cache, exactly like a signed-out/local user. Idempotent
 * per SEED_VERSION (bump it to force a re-seed in an already-seeded preview browser).
 * This is a preview harness for the Midnight redesign, not a shipped feature.
 */
import Database from './Database.js';
import { answersToProfile, BLANK_ANSWERS } from './onboardingModel.js';

const SEED_VERSION = '2';

// Same answer shape the onboarding wizard / DevPlayground presets use.
const PREVIEW_ANSWERS = {
  ...BLANK_ANSWERS,
  name: 'Preview Athlete',
  age: 34,
  sex: 'male',
  bodyweight_kg: 82,
  goalType: 'build',
  strengthStyle: 'strength',
  experienceLevel: 'advanced',
  lifts: { squat: '160', bench: '110', deadlift: '200' },
  daysPerWeek: 4,
  sessionMinutes: 75,
  days: ['mon', 'tue', 'thu', 'fri'],
  strengthAccess: 'full_gym'
};

export function seedPreview() {
  if (localStorage.getItem('htp_preview_seed') === SEED_VERSION) return;

  // currentUser() returns the first local user; create one if none exists.
  let user = Database.services.currentUser();
  if (!user) {
    user = Database.tables.users.create({ name: 'Preview Athlete', email: 'preview@local', profile: {} });
  }

  // Profile drives the generated plan (PlanService.generatePlan(profile)) + calendar.
  Database.services.updateProfile(answersToProfile(PREVIEW_ANSWERS));

  const iso = (d) => d.toISOString().slice(0, 10);
  const dayAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

  // Recovery metrics so readiness renders. Today = 82 → "strong" (teal "Primed").
  [
    { date: dayAgo(0), readiness_score: 82, hrv_ms: 64, resting_hr: 47, sleep_duration_min: 466, sleep_score: 84 },
    { date: dayAgo(1), readiness_score: 74, hrv_ms: 59, resting_hr: 49, sleep_duration_min: 442, sleep_score: 78 },
    { date: dayAgo(2), readiness_score: 69, hrv_ms: 55, resting_hr: 50, sleep_duration_min: 420, sleep_score: 72 }
  ].forEach(m => Database.services.upsertDailyMetric({ ...m, source: 'preview' }));

  // ~4 weeks of steady training history (unlinked workouts) so the load ring
  // computes a real acute:chronic ratio → a "Balanced" state rather than empty.
  for (let n = 0; n <= 27; n += 2) {
    const date = dayAgo(n);
    Database.tables.workouts.create({
      provider: 'preview',
      type: n % 4 === 0 ? 'run' : 'strength',
      start_time: `${date}T18:00:00.000Z`,
      end_time: `${date}T18:50:00.000Z`,
      duration_sec: 3000,
      session_id: null
    });
  }

  localStorage.setItem('htp_preview_seed', SEED_VERSION);
}
