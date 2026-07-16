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
import {
  createAthleteModel, ATHLETE_SCHEMA_VERSION, profileToAthleteModel, derivePerformanceModel,
  blockOutcome, epley1RM, deriveRecoveryObservation, promoteFromOutcomes,
  ENGINE_VERSION, KNOWLEDGE_SET_VERSION,
} from '@performance-os/engine';

// The population default the D7 steer treats as "unlearned" (schema.js:learnedPriors).
// A demotion returns a learned recoveryRate to exactly this (§5 — else a mispredicted
// prior keeps steering deloads).
const POPULATION_RECOVERY_RATE = { value: 1, source: 'population', confidence: 'low' };

// PURE (§5) — land a promoteFromOutcomes result onto a model, without touching the DB.
// Promotion sets the learned recoveryRate (the ONLY thing that arms the D7 steer, post
// TR-05 source-gate); a demotion (no learned recoveryRate returned, but one was live)
// RESETS it to population so a mispredicted prior stops steering; staged + provenance
// always mirror the policy. Returns a NEW model (no mutation) so callers can diff it.
export function applyPromotionToModel(model, result) {
  const next = { ...model, learnedPriors: { ...(model.learnedPriors || {}) } };
  const learnedRec = result && result.learnedPriors && result.learnedPriors.recoveryRate;
  const wasLearned = model.learnedPriors && model.learnedPriors.recoveryRate
    && model.learnedPriors.recoveryRate.source === 'learned';
  if (learnedRec) {
    next.learnedPriors.recoveryRate = learnedRec;
  } else if (wasLearned) {
    next.learnedPriors.recoveryRate = { ...POPULATION_RECOVERY_RATE };
  }
  next.stagedPriors = result ? result.staged : model.stagedPriors;
  next.priorProvenance = result ? result.provenance : model.priorProvenance;
  return next;
}

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

// M5-L2 — close the D16 learning loop at block boundary (the app-side of the LEARN verb).
// Gathers the athlete's own logged data → materialises ONE append-only block_outcomes row
// (deriveRecoveryObservation, §3) → appends it to the live owner-private substrate →
// reads a bounded window → runs the pure promotion policy (promoteFromOutcomes) → lands
// the result on the athlete model. Fire-and-forget from the block check-in (before
// plan_start_date advances); the block window is [startISO, endISO].
//
// ABSTAIN, NEVER DEMOTE-ON-OFFLINE (§4): if the substrate can't be written/read (offline,
// signed-out), the pass returns the model UNCHANGED — it never runs the policy off empty
// history, so a genuinely-learned prior is never demoted just because we couldn't reach
// the DB. Only a real misprediction (with history) demotes.
export async function learnFromBlockClose({ startISO, endISO, priorityQualities, planId = null } = {}) {
  const model = getAthleteModel();
  if (!model || !startISO || !endISO || !Array.isArray(priorityQualities) || !priorityQualities.length) {
    return model || null;
  }
  const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : null);

  // The athlete's own logged evidence — FULL history; the materialiser windows it into
  // in-block vs the trailing baseline it needs for the ≈1.0 ratio.
  const sessionRecoveries = Database.tables.sessionLogs.all()
    .filter((l) => l && l.recovery != null && dateOf(l.completed_at))
    .map((l) => ({ date: dateOf(l.completed_at), recovery: Number(l.recovery) }));
  const liftLog = Database.tables.setLogs.all()
    .filter((r) => r && Number(r.actual_weight) > 0 && Number(r.actual_reps) > 0 && dateOf(r.completed_at))
    .map((r) => ({ date: dateOf(r.completed_at), e1rm: epley1RM(Number(r.actual_weight), Number(r.actual_reps)) }))
    .filter((r) => r.e1rm > 0);

  // ① Materialise this block's recovery observation (the policy input) + the human-readable
  // verdicts (kept for the check-in narrative + audit, in outcome_signals — NOT the input path).
  const observed = deriveRecoveryObservation({ sessionRecoveries, liftLog, startISO, endISO });
  const { verdicts, candidatePriors } = blockOutcome({ priorityQualities, liftLog, sessionRecoveries, startISO, endISO });
  const profile = Database.services.getProfile() || {};

  // ③ Read the existing bounded history first (owner-private; [] when offline).
  let history = await Sync.readBlockOutcomes({ limit: 12 });

  // ② Append this block — idempotently. If a row already covers this window (re-fire), reuse
  // it; else insert. A null insert = offline/error ⇒ ABSTAIN (return unchanged — no landing,
  // so no offline demotion). The just-appended row joins the history the policy sees.
  const existing = history.find((r) => r.period_start === startISO);
  if (existing) {
    // already recorded — history already contains it; fall through to (idempotent) landing
  } else {
    const row = {
      engine_version: ENGINE_VERSION,
      knowledge_set_version: KNOWLEDGE_SET_VERSION,
      method_id: 'deriveRecoveryObservation',
      method_version: ENGINE_VERSION,
      period_start: startISO,
      period_end: endISO,
      plan_id: planId,
      goal_snapshot: { goal_type: profile.goal_type ?? null, sport: profile.sport ?? null },
      observed, // { recoveryRate, confidence } — the policy input
      outcome_signals: { verdicts, candidatePriors, recoveryRate: observed.recoveryRate, confidence: observed.confidence },
    };
    const inserted = await Sync.appendBlockOutcome(row);
    if (!inserted) return model; // offline / insert failed → abstain, no landing
    history = [inserted, ...history];
  }

  // ④ Run the pure promotion policy over the window (oldest → newest). populationPrior = 1.
  const chronological = [...history].sort((a, b) => String(a.period_end).localeCompare(String(b.period_end)));
  const result = promoteFromOutcomes(chronological, 1, { current: { learnedPriors: model.learnedPriors } });

  // ⑤ Land BOTH outcomes (§5, pure) and only write the profile when the decision changed.
  const sig = (m) => JSON.stringify({
    lp: m.learnedPriors && m.learnedPriors.recoveryRate,
    staged: m.stagedPriors, prov: m.priorProvenance,
  });
  const before = sig(model);
  const landed = applyPromotionToModel(model, result);

  if (sig(landed) === before) return model; // no decision change → don't churn the profile write
  landed.updatedAt = new Date().toISOString();
  await Sync.updateProfile({ athlete_model: landed });
  return landed;
}
