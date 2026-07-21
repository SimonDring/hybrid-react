/**
 * Form model — CTL / ATL / TSB (pure, governed; Phase 2 T2).
 *
 * A PARALLEL, advisory readout (spec
 * docs/superpowers/specs/2026-07-20-phase2-aerobic-form-model-design.md). It does
 * NOT feed generatePlan or the reflow — nothing in the plan path changes.
 *
 * The science (TrainingPeaks Performance Manager / Coggan, from Banister's 1991
 * impulse-response model): build a CONTINUOUS daily load array from the first
 * loaded day through `asOf` (missing days = 0), then roll two exponentially-
 * weighted moving averages forward day-by-day, seeded at 0 —
 *   CTL = CTL_prev·e^(−1/ctlDays) + load·(1−e^(−1/ctlDays))   ("fitness", 42d)
 *   ATL = ATL_prev·e^(−1/atlDays) + load·(1−e^(−1/atlDays))   ("fatigue", 7d)
 *   TSB = CTL − ATL                                            ("form")
 * TSB at or above `freshTsb` reads as fresh (recovered, primed to push); at or
 * below `fatiguedTsb` reads as fatigued; otherwise neutral. Fewer than `minDays`
 * loaded days in the series means there isn't enough history to trust a band, so
 * band is null. Confidence scales 0→1 with loaded-day count up to `matureDays`
 * (Art 13 — the population time constants here are contested for per-individual
 * calibration, so this whole readout is a soft, low-confidence input, never a
 * gate — see load.form.model, kb.js).
 */
import kb from '../knowledge/kb.js';

const _F = kb.value('load.form.model');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function round1(v) { return Math.round(v * 10) / 10; }

// One UTC calendar day after `iso` ('YYYY-MM-DD').
function nextDay(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// dailySeries: [{date:'YYYY-MM-DD', load:number}] — e.g. aerobicDailyLoads() or
// trainingLoad.dailyLoads(). asOf: 'YYYY-MM-DD' (or an ISO datetime; only the date
// part is used) — the caller (impure app/store layer) supplies "now", the engine
// takes no clock read (Art 18).
export function computeForm(dailySeries = [], { asOf } = {}) {
  const loaded = (dailySeries || []).filter((d) => d && d.load > 0);
  const loadedDays = loaded.length;
  const confidence = Math.min(1, loadedDays / _F.matureDays);

  if (loadedDays === 0) {
    return {
      ctl: 0, atl: 0, tsb: 0, band: null, confidence: 0,
      rationale: 'No load history yet — form (CTL/ATL/TSB) needs at least one logged day to compute.'
    };
  }

  const asOfDate = String(asOf).slice(0, 10);
  if (!DATE_RE.test(asOfDate)) {
    // Fail-fast (consistent with kb.get's throw-on-unknown-id style): a malformed
    // asOf would otherwise sort lexically ABOVE any real date and the day-walk
    // below would never reach `end` — an infinite loop. Caught here, before the walk.
    throw new Error(`computeForm: asOf must be a YYYY-MM-DD date (got ${JSON.stringify(asOf)})`);
  }
  const byDate = new Map(loaded.map((d) => [d.date, d.load]));
  const start = loaded.reduce((min, d) => (d.date < min ? d.date : min), loaded[0].date);
  const end = asOfDate >= start ? asOfDate : start; // defensive: asOf before the first loaded day

  const kCtl = 1 - Math.exp(-1 / _F.ctlDays);
  const kAtl = 1 - Math.exp(-1 / _F.atlDays);
  // Pure defensive backstop (NOT a governed coaching parameter): with a validated
  // asOf the walk always reaches `end` well within this cap, so it never changes
  // output for valid input — it only guarantees the loop is structurally incapable
  // of running forever if some future caller/refactor breaks that invariant.
  const MAX_DAYS = 20000; // ≈ 55 years of daily steps
  let ctl = 0, atl = 0;
  let steps = 0;
  for (let day = start; ; day = nextDay(day)) {
    const load = byDate.get(day) || 0;
    ctl = ctl * (1 - kCtl) + load * kCtl;
    atl = atl * (1 - kAtl) + load * kAtl;
    if (day === end) break;
    steps += 1;
    if (steps >= MAX_DAYS) break; // backstop only — should be unreachable for valid input
  }

  const tsb = ctl - atl;
  const band = loadedDays < _F.minDays
    ? null
    : (tsb >= _F.freshTsb ? 'fresh' : (tsb <= _F.fatiguedTsb ? 'fatigued' : 'neutral'));

  const rationale = band === null
    ? `Form model — only ${loadedDays} loaded day(s) since ${start} (need ${_F.minDays}+) — building your load history before a form read is trustworthy.`
    : `Form model — CTL(${_F.ctlDays}d "fitness") / ATL(${_F.atlDays}d "fatigue") EWMA from ${start} to ${end} (TrainingPeaks PMC / Coggan, from Banister 1991); band "${band}" from TSB (form) ${round1(tsb)}.`;

  return { ctl: round1(ctl), atl: round1(atl), tsb: round1(tsb), band, confidence, rationale };
}

export default { computeForm };
