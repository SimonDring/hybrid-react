/**
 * validate — pure input validators. Each per-payload validator returns
 *   { ok:boolean, value:object, errors:{ [field]:string } }
 * where `value` is the normalised payload (text trimmed+capped, numbers parsed)
 * and `errors` is populated only when a number/enum is out of range.
 */
import { LIMITS, ENUMS, SESSION_MINUTES, TEXT_MAX } from './rules.js';

const isEmpty = (v) => v === '' || v === null || v === undefined;

// Number within [min,max]; integer when spec.int. Empty → null (not an error).
export function num(v, spec, label) {
  if (isEmpty(v)) return { ok: true, value: null };
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return { ok: false, error: `${label} must be a number.` };
  if (spec.int && !Number.isInteger(n)) return { ok: false, error: `${label} must be a whole number.` };
  if (n < spec.min || n > spec.max) return { ok: false, error: `${label} must be between ${spec.min} and ${spec.max}.` };
  return { ok: true, value: n };
}

// Value must be one of `allowed`. Empty → null (not an error).
export function oneOf(v, allowed, label) {
  if (isEmpty(v)) return { ok: true, value: null };
  if (!allowed.includes(v)) return { ok: false, error: `${label} is not a recognised value.` };
  return { ok: true, value: v };
}

// Trim and cap free text. Empty → ''. Never an error.
export function text(v, max) {
  if (isEmpty(v)) return '';
  return String(v).trim().slice(0, max);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Only allow a data-image URL or an https URL on our own Supabase storage host.
function safeAvatarUrl(url) {
  if (isEmpty(url)) return null;
  const s = String(url);
  if (s.startsWith('data:image/')) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' && u.hostname.endsWith('.supabase.co')) return s;
  } catch { /* not a URL */ }
  return null;
}

export function validateProfile(patch = {}) {
  const value = { ...patch };
  const errors = {};
  const setNum = (key, raw, spec, label) => {
    const r = num(raw, spec, label);
    if (r.ok) value[key] = r.value; else errors[key] = r.error;
  };
  const setEnum = (key, raw, allowed, label) => {
    const r = oneOf(raw, allowed, label);
    if (r.ok) { if (r.value !== null) value[key] = r.value; } else errors[key] = r.error;
  };

  if ('age' in patch)            setNum('age', patch.age, LIMITS.age, 'Age');
  if ('bodyweight_kg' in patch)  setNum('bodyweight_kg', patch.bodyweight_kg, LIMITS.bodyweight_kg, 'Bodyweight');
  if ('name' in patch)           value.name = text(patch.name, TEXT_MAX.name);
  if ('markers' in patch)        value.markers = text(patch.markers, TEXT_MAX.markers);
  if ('goal_type' in patch)      setEnum('goal_type', patch.goal_type, ENUMS.goal_type, 'Goal');
  if ('strength_style' in patch) setEnum('strength_style', patch.strength_style, ENUMS.strength_style, 'Training style');
  if ('sport' in patch)          setEnum('sport', patch.sport, ENUMS.sport, 'Sport');
  if ('sport_intent' in patch)   setEnum('sport_intent', patch.sport_intent, ENUMS.sport_intent, 'Sport intent');
  if ('sport_season' in patch)   setEnum('sport_season', patch.sport_season, ENUMS.sport_season, 'Sport season');
  if ('sport_goal' in patch)     setEnum('sport_goal', patch.sport_goal, ENUMS.sport_goal, 'Sport goal');
  if ('run_discipline' in patch) setEnum('run_discipline', patch.run_discipline, ENUMS.run_discipline, 'Run discipline');

  if (patch.lifts && typeof patch.lifts === 'object') {
    const lifts = { ...patch.lifts };
    for (const k of ['squat', 'bench', 'deadlift', 'ohp', 'pull']) {
      if (k in patch.lifts) {
        const r = num(patch.lifts[k], LIMITS.lift, `${cap(k)} 1RM`);
        if (r.ok) lifts[k] = r.value; else errors[`lifts.${k}`] = r.error;
      }
    }
    value.lifts = lifts;
  }

  if (patch.availability && typeof patch.availability === 'object') {
    const av = { ...patch.availability };
    if ('days_per_week' in patch.availability) {
      const r = num(patch.availability.days_per_week, LIMITS.daysPerWeek, 'Days per week');
      if (r.ok) av.days_per_week = r.value; else errors['availability.days_per_week'] = r.error;
    }
    if ('session_minutes' in patch.availability && !isEmpty(patch.availability.session_minutes)) {
      const sm = Number(patch.availability.session_minutes);
      if (SESSION_MINUTES.includes(sm)) av.session_minutes = sm;
      else errors['availability.session_minutes'] = 'Session length is not a recognised value.';
    }
    value.availability = av;
  }

  if (patch.experience && typeof patch.experience === 'object' && 'gym' in patch.experience) {
    const r = oneOf(patch.experience.gym, ENUMS.experience, 'Experience');
    if (r.ok) value.experience = { ...patch.experience, gym: r.value };
    else errors['experience.gym'] = r.error;
  }

  if (Array.isArray(patch.access)) value.access = patch.access.filter((e) => ENUMS.equipment.includes(e));

  if (patch.avatar && typeof patch.avatar === 'object' && 'url' in patch.avatar) {
    value.avatar = { ...patch.avatar, url: safeAvatarUrl(patch.avatar.url) };
  }

  return { ok: Object.keys(errors).length === 0, value, errors };
}

const METRIC_SPECS = {
  resting_hr: [LIMITS.resting_hr, 'Resting HR'],
  hrv_ms: [LIMITS.hrv_ms, 'HRV'],
  spo2_pct: [LIMITS.spo2_pct, 'SpO₂'],
  sleep_score: [LIMITS.sleep_score, 'Sleep score'],
  sleep_duration_min: [LIMITS.sleep_duration_min, 'Sleep duration'],
  energy: [LIMITS.rating, 'Energy'],
  soreness: [LIMITS.rating, 'Soreness'],
  mood: [LIMITS.rating, 'Mood'],
  stress: [LIMITS.rating, 'Stress'],
};

export function validateDailyMetric(fields = {}) {
  const value = { ...fields };
  const errors = {};
  for (const [key, [spec, label]] of Object.entries(METRIC_SPECS)) {
    if (key in fields) {
      const r = num(fields[key], spec, label);
      if (r.ok) value[key] = r.value; else errors[key] = r.error;
    }
  }
  if ('notes' in fields) value.notes = text(fields.notes, TEXT_MAX.notes);
  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function validateSessionLog(payload = {}) {
  const value = { ...payload };
  const errors = {};
  for (const k of ['quality', 'energy', 'recovery']) {
    if (k in payload) {
      const r = num(payload[k], LIMITS.rating, cap(k));
      if (r.ok) value[k] = r.value; else errors[k] = r.error;
    }
  }
  if ('notes' in payload) value.notes = text(payload.notes, TEXT_MAX.notes);
  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function validateInjury(fields = {}) {
  const value = { ...fields };
  const errors = {};
  if ('severity' in fields) {
    const r = num(fields.severity, LIMITS.rating, 'Severity');
    if (r.ok) value.severity = r.value; else errors.severity = r.error;
  }
  if ('status' in fields) {
    const r = oneOf(fields.status, ENUMS.injury_status, 'Status');
    if (r.ok) { if (r.value !== null) value.status = r.value; } else errors.status = r.error;
  }
  if ('title' in fields)     value.title = text(fields.title, TEXT_MAX.title);
  if ('body_part' in fields) value.body_part = text(fields.body_part, TEXT_MAX.title);
  for (const k of ['description', 'rehab_plan', 'prevention_notes']) {
    if (k in fields) value[k] = text(fields[k], TEXT_MAX.notes);
  }
  return { ok: Object.keys(errors).length === 0, value, errors };
}
