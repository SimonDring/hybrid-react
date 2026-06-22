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
