/**
 * AiService — the app-side AI seam (WP-60, AIGAS v0). OFF BY DEFAULT: every capability
 * is gated on the profile flag `ai_features === true` — Simon decides go-live (AIGAS
 * ratification pending). When AI is off, down, or errors, every caller degrades to the
 * deterministic rendering (the engine's own emitted rationales) — coaching correctness
 * never depends on this file (AIGAS §3/§9).
 *
 * Capability here: C2 · Explanation — "turn the engine's structured outputs into
 * audience-appropriate prose". It renders; it never feeds anything back into the
 * decision path (AIGAS §6.2: communication sits OUTSIDE both seams).
 *
 * Privacy (§19): the reader's scope is the AI's scope — the artefact is built ONLY from
 * the athlete's own emitted plan fields, and raw-vital keys are structurally stripped at
 * context assembly (prompts are not a security boundary; this code is). The Anthropic
 * key lives server-side in the ai-render edge function (Stage 6 hard rule).
 */
import { supabase } from './supabaseClient.js';
import Database from './Database.js';

// The §19 leak gate at context assembly: no key on this list (or nested under it) may
// enter an AI artefact. Mirrors the teamStatus allowlist philosophy — deny by class.
export const RAW_VITAL_KEYS = ['hrv', 'hrv_ms', 'sleep_score', 'sleep_min', 'sleep_light_min', 'sleep_deep_min',
  'sleep_rem_min', 'resting_hr', 'rhr', 'avg_hr', 'max_hr', 'spo2_pct', 'breathing_rate', 'readiness_score'];

export function aiEnabled(profile) {
  const p = profile || Database.services.getProfile() || {};
  return p.ai_features === true;   // default OFF — the kill-switch is the flag itself (§17)
}

// Deep-copy o keeping ONLY allowlisted keys per level — the artefact builder never
// forwards fields it doesn't recognise (minimum necessary context, §19).
const pickItems = (items) => (items || []).map((it) => ({ name: it.name, sets: it.sets, rpe: it.rpe, note: it.note }));

/**
 * The grounded C2 artefact for "explain my week": emitted reasons + provenance ONLY —
 * never re-derived, never raw data (AIGAS §7: if the trace has no reason, the AI must
 * not invent one; this artefact IS the trace surface it may ground in).
 */
export function buildWeekArtefact(week, meta = {}) {
  const w = week || {};
  return {
    week: {
      num: w.num ?? null,
      deload: !!w.deload,
      taper: !!w.taper,
      deloadReason: w.deloadReason || null,
      deloadDeferred: !!w.deloadDeferred,
      intensityEased: w._intensityEased || null,
      ruleTrim: w._ruleTrim || null,
      catchUp: w._catchUp || null,
      theme: w.theme || null,
      sessions: (w.sessions || []).map((s) => ({
        title: s.title,
        duration: s.duration,
        objective: s._objective || null,          // the D9/style rationale — the "why"
        lightened: !!s.lightened,
        items: pickItems(s.items),
      })),
    },
    diagnosis: meta.diagnosis || null,             // emitted only when the plan follows it
    provenance: meta.provenance || null,           // engineVersion × knowledgeSetVersion (§20)
  };
}

/**
 * C2 · Explain the athlete's week in plain language. Returns { text, stamp } or null —
 * null on ANY failure or when AI is off (callers already render the deterministic
 * strings; "no dark degradation" labelling is the caller's duty when it shows AI prose).
 */
export async function explainWeek(week, meta, { audience = 'athlete' } = {}) {
  if (!aiEnabled()) return null;
  try {
    const artefact = buildWeekArtefact(week, meta);
    const { data, error } = await supabase.functions.invoke('ai-render', {
      body: { capability: 'explain_week', audience, artefact },
    });
    if (error || !data || !data.text) return null;
    return { text: data.text, stamp: data.stamp || null };
  } catch {
    return null;   // graceful degradation (§9): tone and convenience, never correctness
  }
}

export default { aiEnabled, buildWeekArtefact, explainWeek, RAW_VITAL_KEYS };
