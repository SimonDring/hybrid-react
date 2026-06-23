/**
 * Small, dependency-free formatting helpers. Dates are formatted relative to a
 * passed-in "now" so the UI is deterministic and easy to test (the mock layer
 * pins "now" rather than reading the real clock).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "78%" — clamps and rounds. */
export function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`;
}

/** Whole days from `now` until `iso` (negative = in the past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso).getTime();
  const start = startOfDay(now).getTime();
  return Math.round((startOfDayMs(target) - start) / DAY_MS);
}

/** "in 3 days" / "today" / "tomorrow" / "2 days ago". */
export function formatDaysUntil(iso: string, now: Date = new Date()): string {
  const d = daysUntil(iso, now);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 1) return `in ${d} days`;
  return `${Math.abs(d)} days ago`;
}

/** "Wed 24 Jun". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "just now" / "12m ago" / "2h ago" / "3d ago". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** "Last check-in: 2d ago" — or a clear empty state. */
export function formatLastCheckIn(
  iso: string | null,
  now: Date = new Date(),
): string {
  if (!iso) return "No check-in yet";
  return formatRelativeTime(iso, now);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDayMs(ms: number): number {
  return startOfDay(new Date(ms)).getTime();
}
