/**
 * axial — shared spinal-load constants + helper for the gym engine.
 *
 * Axial load is the spinal-compression cost of a lift (back squat / deadlift = 2,
 * a supported row = 0). Three things were duplicated across allocator/scheduler/
 * despine and are hoisted here so they can't silently diverge:
 *  • AXIAL_SESSION_CAP  — the within-session budget; past it, intents resolve to
 *    their lowest-axial member so we stop reloading the spine (allocator).
 *  • HIGH_DAY_THRESHOLD — a session's axialLoad at/above which the DAY counts as
 *    spine-heavy, used to space high-axial days apart (scheduler) and to trigger
 *    the next-day de-spine pass (despine).
 *  • axialOf            — read an exercise's axialLoad, defaulting a missing/absent
 *    value to 0.
 */

// A session may accumulate up to this many units of axial load (back squat 2 +
// deadlift 2 fills it); beyond it, an intent resolves to its lowest-axial available
// member rather than reloading the spine.
export const AXIAL_SESSION_CAP = 4;

// A session whose total axialLoad is at/above this counts as a high-axial DAY — the
// scheduler spaces such days apart and the de-spine pass lightens the day after one.
export const HIGH_DAY_THRESHOLD = 3;

// An exercise's axial load, treating a missing/null value as 0.
export const axialOf = (ex) => (ex && ex.axialLoad != null ? ex.axialLoad : 0);

export default { AXIAL_SESSION_CAP, HIGH_DAY_THRESHOLD, axialOf };
