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
import { createAthleteModel, ATHLETE_SCHEMA_VERSION, profileToAthleteModel, derivePerformanceModel, blockOutcome, epley1RM } from '@performance-os/engine';

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

// Mirror the athlete's RESOLVED injuries into the persisted model's
// constraints.injuryHistory, so the D4 diagnosis's injuryRisk seam (WP-36) sees them on
// every read path (the adapter maps profile.athlete_model.constraints.injuryHistory).
// Shape: [{ body_part: <taxonomy key>, resolvedAt }] — deduped by body part, newest
// resolution kept. Persists via SyncService ONLY when the history actually changed;
// no-ops without a profile. Fire-and-forget safe.
export async function syncInjuryHistory() {
  const profile = Database.services.getProfile();
  if (!profile || !Object.keys(profile).length) return null;
  const rows = Database.services.listInjuries() || [];
  const byPart = new Map();
  for (const r of rows) {
    if (r.status !== 'recovered' || !r.body_part_key) continue;
    const prev = byPart.get(r.body_part_key);
    const when = r.date_recovered || null;
    if (!prev || String(when || '') > String(prev.resolvedAt || '')) {
      byPart.set(r.body_part_key, { body_part: r.body_part_key, resolvedAt: when });
    }
  }
  const history = [...byPart.values()].sort((a, b) => a.body_part.localeCompare(b.body_part));

  const model = getAthleteModel();               // stored, or lazily derived from legacy
  if (!model) return null;
  const current = (model.constraints && model.constraints.injuryHistory) || [];
  if (JSON.stringify(current) === JSON.stringify(history)) return model;   // unchanged → no write

  model.constraints = { ...model.constraints, injuryHistory: history };
  model.updatedAt = new Date().toISOString();
  await Sync.updateProfile({ athlete_model: model });
  return model;
}

// Derive the Performance Model (capability-per-quality with confidence) from the current
// Athlete Model. Returns null when there is no athlete model to derive from.
export function getPerformanceModel() {
  const model = getAthleteModel();
  return model ? derivePerformanceModel(model, localISODate()) : null;
}

// WP-59 — stage a candidate learned prior from the just-completed block (the first
// honest learning loop). Gathers the athlete's own already-logged data — session
// recovery ratings + logged-set e1RMs — over the block window, runs the pure
// blockOutcome() verdict, and persists the result at model.stagedPriors.
//
// STAGED, NEVER LIVE: nothing in the engine reads stagedPriors. Promotion
// (staged → model.learnedPriors, which the engine DOES read) is a deliberate,
// reviewed step — the same twice-gated pattern as the AI seam. This writer only
// ever proposes; Simon decides when the first prior goes live. Change-driven +
// fire-and-forget, exactly like syncInjuryHistory. Caller (the block check-in)
// supplies the block window + the block's D5 priority qualities.
export async function syncStagedPriors({ startISO, endISO, priorityQualities } = {}) {
  const model = getAthleteModel();
  if (!model || !startISO || !endISO || !Array.isArray(priorityQualities) || !priorityQualities.length) {
    return model || null;
  }
  const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : null);

  // The athlete's own 1–5 recovery rating, one per completed session in the window.
  const sessionRecoveries = Database.tables.sessionLogs.all()
    .filter((l) => l && l.recovery != null && dateOf(l.completed_at))
    .map((l) => ({ date: dateOf(l.completed_at), recovery: Number(l.recovery) }));

  // e1RM history: every logged top set → an Epley estimate, dated by the set.
  const liftLog = Database.tables.setLogs.all()
    .filter((r) => r && Number(r.actual_weight) > 0 && Number(r.actual_reps) > 0 && dateOf(r.completed_at))
    .map((r) => ({ date: dateOf(r.completed_at), e1rm: epley1RM(Number(r.actual_weight), Number(r.actual_reps)) }))
    .filter((r) => r.e1rm > 0);

  const { verdicts, candidatePriors } = blockOutcome({ priorityQualities, liftLog, sessionRecoveries, startISO, endISO });
  const staged = { block: { startISO, endISO }, verdicts, candidatePriors, stagedAt: new Date().toISOString() };

  // Change-driven on the decision content (ignore the timestamp) so we don't churn writes.
  const sig = (s) => (s ? JSON.stringify({ block: s.block, verdicts: s.verdicts, candidatePriors: s.candidatePriors }) : null);
  if (sig(model.stagedPriors) === sig(staged)) return model;

  model.stagedPriors = staged;
  model.updatedAt = new Date().toISOString();
  await Sync.updateProfile({ athlete_model: model });
  return model;
}
