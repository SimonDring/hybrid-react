// AthleteModelService — app-side stable interface to the Athlete Model. Builds a model from
// onboarding answers and persists it as a VERSIONED sub-object at users.profile.athlete_model
// via SyncService (offline-first), loads + upgrades it, lazily derives one from the legacy
// profile for existing users, and derives the Performance Model. Screens/consumers use THIS —
// never raw onboarding answers or Database.js directly.
//
// The SERVICE (unlike the pure engine) may read the clock: localISODate() for asOf,
// new Date().toISOString() for updatedAt. That is intentional and allowed here.
import * as Sync from './SyncService.js';
import Database from './Database.js';
import { localISODate, answersToAthleteModelInputs } from './onboardingModel.js';
import { createAthleteModel, ATHLETE_SCHEMA_VERSION } from '@performance-os/engine/lib/athlete/index.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/index.js';

// Build an Athlete Model from onboarding answers and persist it to users.profile.athlete_model.
// Returns the saved model.
export async function buildAndSaveFromAnswers(answers) {
  const asOf = localISODate();
  const model = answersToAthleteModelInputs(answers, asOf);
  const profile = Database.services.getProfile() || {};
  model.athleteId = (profile && profile.id) || null; // may be null offline/anon; fine
  model.updatedAt = new Date().toISOString();
  await Sync.updateProfile({ athlete_model: model });
  return model;
}

// Version upgrader: unknown/older versions are re-validated through createAthleteModel so
// missing fields default safely and the result always carries the current schema version.
export function upgradeAthleteModel(stored) {
  if (!stored || typeof stored !== 'object') return null;
  if (stored.schemaVersion === ATHLETE_SCHEMA_VERSION) return createAthleteModel(stored);
  // Older/unknown version → re-hydrate through the current defaults (missing fields default,
  // extra fields dropped). Extend with explicit per-version migrations as the schema evolves.
  const up = createAthleteModel(stored);
  up.schemaVersion = ATHLETE_SCHEMA_VERSION;
  return up;
}

// Read the current user's Athlete Model. Upgrades an older/unknown stored version; if no
// model has been persisted yet (existing user, pre-Athlete-Model), lazily derives one from
// the legacy profile so callers always get a model when a profile exists.
export function getAthleteModel() {
  const profile = Database.services.getProfile() || {};
  if (profile.athlete_model) return upgradeAthleteModel(profile.athlete_model);
  // No stored model yet (existing user): lazily derive from the legacy profile.
  if (profile && Object.keys(profile).length) return profileToAthleteModel(profile, localISODate());
  return null;
}

// Derive the Performance Model (capability-per-quality with confidence) from the current
// Athlete Model. Returns null when there is no athlete model to derive from.
export function getPerformanceModel() {
  const model = getAthleteModel();
  return model ? derivePerformanceModel(model, localISODate()) : null;
}
