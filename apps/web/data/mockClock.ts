/**
 * A pinned "now" so the whole mock dataset is deterministic — the dashboard
 * renders identically every time, which makes it easy to screenshot and test.
 *
 * Timeline: it's Friday morning, mid-season, with a match on Sunday (2 days out).
 * Mon–Thu sessions are logged; Fri (today) onward is upcoming.
 *
 * When this is wired to the backend, replace MOCK_NOW with `new Date()` and the
 * relative-date helpers will keep working.
 */
export const MOCK_NOW = new Date("2026-06-26T08:15:00");

export const WEEK_START_ISO = "2026-06-22"; // Monday of the current week
export const NEXT_FIXTURE_DATE = "2026-06-28"; // Sunday match
export const ELAPSED_DAYS = 4; // Mon–Thu logged; Fri (today) onward pending

/** ISO date (YYYY-MM-DD) `dayOffset` days from a start date. */
export function isoDateOffset(startIso: string, dayOffset: number): string {
  const d = new Date(`${startIso}T00:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

/** ISO datetime `hours` before the pinned now. */
export function hoursAgoIso(hours: number): string {
  return new Date(MOCK_NOW.getTime() - hours * 3_600_000).toISOString();
}
