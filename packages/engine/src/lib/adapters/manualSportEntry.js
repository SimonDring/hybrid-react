/**
 * manualSportEntry — the ACL adapter for a HAND-LOGGED pitch/match session (Phase 3 S6a).
 *
 * The first WRITE into the sport/match ingestion boundary: it turns an athlete's plain form
 * input into normalised, boundary-validated observation rows for the two M5 owner-private
 * tables — the same wearable-ACL pattern as adaptWearableReading, a second instance
 * (reuse, not reinvent). Every datum is validated through the Metric Dictionary
 * (validateObservation) and stamped with the metric's honest provenance + reliability
 * default; nothing is guessed into an id and nothing invalid is silently dropped (Art 15).
 *
 * HONEST PROVENANCE (enforced by the dictionary, not worked around): minutes / availability
 * / RPE are self-report (the athlete genuinely reports them); the derived sRPE is self-report
 * (a transform of two self-reports); GPS numbers (distance / sprints / top speed / high-speed)
 * are THIRD-PARTY — typing a figure off a GPS watch is transcribing a vendor-computed value,
 * never a perceived one. validateObservation rejects a mislabelled datum; we honour that.
 *
 * PURE (Art 18): no clock, no randomness, no I/O. The caller (SyncService/store) supplies the
 * timestamp, date, and session ref via ctx, so the same input+ctx always yields the same rows.
 * user_id is stamped later by SyncService.clean().
 */
import { getMetric, reliabilityFor, validateObservation } from '../metrics/index.js';

// Which metric + provenance each friendly input field maps to. GPS fields are third-party.
const FIELD_MAP = {
  minutes:     { id: 'exposure.minutes.match',        prov: 'self-report' },
  availability:{ id: 'availability.status.match',      prov: 'self-report' },
  rpe:         { id: 'rpe.session.pitch',              prov: 'self-report' },
  distanceM:   { id: 'gps.total_distance.session',     prov: 'third-party' },
  highSpeedM:  { id: 'gps.high_speed_distance.session',prov: 'third-party' },
  topSpeedMs:  { id: 'speed.max.session',              prov: 'third-party' },
  sprintCount: { id: 'sprint.count.session',           prov: 'third-party' },
};

/** Build one M5 row: value into the metric's storesTo.column, or into raw when it is null. */
function buildRow(metricId, prov, value, ctx) {
  const entry = getMetric(metricId);
  const { table, column } = entry.storesTo;
  const isMatch = table === 'match_performances';
  const row = {
    metric_id: metricId,
    provenance_class: prov,
    reliability_tag: reliabilityFor(metricId, prov),
    source_system: 'manual',
    observed_at: ctx.observedAt,
    quality_flags: {},
    [isMatch ? 'fixture_ref' : 'session_ref']: ctx.ref,
    [isMatch ? 'played_on' : 'observed_on']: ctx.on,
  };
  if (column) row[column] = value;
  else row.raw = { value };
  return { table, row };
}

/**
 * Normalise + validate a manual pitch/match log.
 * @param {{minutes?:number, rpe?:number, availability?:string, distanceM?:number,
 *          highSpeedM?:number, topSpeedMs?:number, sprintCount?:number}} input  canonical units (m, m/s)
 * @param {{observedAt:string, on:string, ref:string}} ctx  app-supplied time/date/ref (keeps this pure)
 * @returns {{ok:boolean, errors:string[], matchRows:object[], externalRows:object[]}}
 */
export function adaptManualSportEntry(input = {}, ctx = {}) {
  const errors = [];
  const matchRows = [];
  const externalRows = [];
  const push = ({ table, row }) => (table === 'match_performances' ? matchRows : externalRows).push(row);

  const emit = (metricId, prov, value) => {
    if (value == null || value === '') return false;
    const v = validateObservation({ metric_id: metricId, provenance_class: prov, value });
    if (!v.ok) { errors.push(`${metricId}: ${v.errors.join('; ')}`); return false; }
    push(buildRow(metricId, prov, value, ctx));
    return true;
  };

  // The directly-reported fields, in a stable order.
  const rpeOk = 'rpe' in input ? emit(FIELD_MAP.rpe.id, FIELD_MAP.rpe.prov, input.rpe) : false;
  const minsOk = 'minutes' in input ? emit(FIELD_MAP.minutes.id, FIELD_MAP.minutes.prov, input.minutes) : false;
  if ('availability' in input) emit(FIELD_MAP.availability.id, FIELD_MAP.availability.prov, input.availability);
  for (const f of ['distanceM', 'highSpeedM', 'topSpeedMs', 'sprintCount'])
    if (f in input) emit(FIELD_MAP[f].id, FIELD_MAP[f].prov, input[f]);

  // Derived sRPE (Foster) — only when BOTH inputs validated (never from a rejected RPE).
  if (rpeOk && minsOk) emit('srpe.load.session', 'self-report', Math.round(input.rpe * input.minutes));

  return { ok: matchRows.length + externalRows.length > 0, errors, matchRows, externalRows };
}

/**
 * Read-back: group flat observation rows (from either table) by their shared ref into a
 * friendly per-session object for the surface. Pure. Newest-first by date.
 * @param {object[]} rows  raw rows read from match_performances + external_load_observations
 * @returns {Array<{ref,on,minutes,rpe,availability,srpe,distanceM,highSpeedM,topSpeedMs,sprintCount}>}
 */
export function groupSportObservations(rows = []) {
  const byRef = new Map();
  for (const r of rows) {
    const ref = r.fixture_ref ?? r.session_ref ?? r.id;
    if (!byRef.has(ref)) byRef.set(ref, { ref, on: r.played_on ?? r.observed_on ?? null });
    const s = byRef.get(ref);
    if (s.on == null) s.on = r.played_on ?? r.observed_on ?? null;
    const rawVal = r.raw && typeof r.raw === 'object' ? r.raw.value : undefined;
    switch (r.metric_id) {
      case 'exposure.minutes.match':        s.minutes = num(r.minutes); break;
      case 'availability.status.match':     s.availability = r.availability_status ?? null; break;
      case 'rpe.session.pitch':             s.rpe = num(r.pitch_rpe); break;
      case 'srpe.load.session':             s.srpe = num(rawVal); break;
      case 'gps.total_distance.session':    s.distanceM = num(r.distance_m); break;
      case 'gps.high_speed_distance.session': s.highSpeedM = num(r.high_speed_m); break;
      case 'sprint.count.session':          s.sprintCount = num(r.sprint_count); break;
      case 'speed.max.session':             s.topSpeedMs = num(rawVal); break;
      default: break;
    }
  }
  return [...byRef.values()].sort((a, b) => String(b.on).localeCompare(String(a.on)));
}

function num(v) { return v == null ? null : Number(v); }

export default { adaptManualSportEntry, groupSportObservations };
