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

const SEED_VERSION = '6';

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

  // ~4 weeks of recovery metrics that gently improve (HRV up, resting HR down,
  // sleep up) so readiness, recovery, sleep and the fitness-age trend all read
  // as "improving as you train".
  const stages = (min) => ({
    sleep_deep_min: Math.round(min * 0.18), sleep_rem_min: Math.round(min * 0.22),
    sleep_light_min: Math.round(min * 0.57), sleep_awake_min: Math.round(min * 0.03)
  });
  for (let n = 27; n >= 0; n--) {
    const t = (27 - n) / 27;              // 0 = oldest, 1 = today
    const noise = ((n * 7) % 5) - 2;      // deterministic -2..2 wobble
    const sleepMin = Math.round(424 + t * 42 + noise * 3);
    Database.services.upsertDailyMetric({
      date: dayAgo(n), source: 'preview',
      readiness_score: Math.max(50, Math.min(92, Math.round(66 + t * 16 + noise))),
      hrv_ms: Math.round(50 + t * 15 + noise),
      resting_hr: Math.round(53 - t * 6 - (noise > 1 ? 1 : 0)),
      sleep_duration_min: sleepMin,
      sleep_score: Math.round(70 + t * 14),
      ...stages(sleepMin)
    });
  }

  // ~4 weeks of steady training history (unlinked workouts) so the load ring
  // computes a real acute:chronic ratio → a "Balanced" state rather than empty.
  if (!Database.tables.workouts.all().some(w => w.provider === 'preview')) {
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
  }

  localStorage.setItem('htp_preview_seed', SEED_VERSION);
}
