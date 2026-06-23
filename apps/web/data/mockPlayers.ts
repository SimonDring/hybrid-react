/**
 * Mock squad — 24 players' PLAYER-PRIVATE source records.
 *
 * These hold raw vitals (sleep, HRV, resting HR, soreness, RPE). They are the
 * input to lib/derive.ts and must NEVER be passed to a coach-facing component.
 * data/mockApi.ts is the only module that reads them, and it returns the
 * derived `CoachVisiblePlayer` shape instead.
 *
 * Each record is authored from a compact spec; trends and the weekly grid are
 * expanded by small deterministic generators so the data is realistic without
 * thousands of hand-typed numbers. Replace this whole file with API calls later.
 */
import type {
  AdherenceDay,
  AdherenceState,
  InjuryStatus,
  PlayerPrivateSource,
} from "@/types/dashboard";
import { computeReadiness } from "@/lib/derive";
import {
  ELAPSED_DAYS,
  WEEK_START_ISO,
  hoursAgoIso,
  isoDateOffset,
} from "./mockClock";

/** Compact author-time spec; expanded into a full PlayerPrivateSource below. */
interface PlayerSpec {
  n: number;
  position: string;
  sleepHours: number;
  sleepBaselineHours: number;
  soreness: number; // 1–5
  rpeAverage: number; // 1–10
  hrv: number; // ms
  restingHr: number; // bpm
  wearableSynced: boolean;
  checkInHoursAgo: number | null; // null = never checked in
  injuryStatus: InjuryStatus;
  weeklyLoad: number;
  plannedLoad: number;
  acwr: number;
  adherencePercent: number;
}

// Sessions per weekday — drives the weekly adherence grid + tooltips.
const WEEKDAY_SESSIONS: { label: string; session: string }[] = [
  { label: "Mon", session: "Lower strength" },
  { label: "Tue", session: "Speed & power" },
  { label: "Wed", session: "Pitch + gym" },
  { label: "Thu", session: "Upper strength" },
  { label: "Fri", session: "Activation" },
  { label: "Sat", session: "Match prep" },
  { label: "Sun", session: "Match day" },
];

/** Tiny deterministic PRNG so generated data is stable across renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

function makeWeek(
  seed: number,
  adherencePercent: number,
  disengaged: boolean,
): AdherenceDay[] {
  const rand = mulberry32(seed * 101 + 7);
  const p = adherencePercent / 100;
  return WEEKDAY_SESSIONS.map((day, i) => {
    const date = isoDateOffset(WEEK_START_ISO, i);
    if (i >= ELAPSED_DAYS) {
      return { label: day.label, date, state: "none" as AdherenceState };
    }
    let state: AdherenceState;
    if (disengaged) {
      state = rand() < 0.65 ? "missed" : "none";
    } else {
      const r = rand();
      if (r < p) state = "completed";
      else if (r < p + 0.18) state = "partial";
      else state = "missed";
    }
    return {
      label: day.label,
      date,
      state,
      sessionName: day.session,
    };
  });
}

function makeReadinessTrend(seed: number, anchor: number): number[] {
  const rand = mulberry32(seed * 53 + 11);
  const n = 10;
  const start = clamp(anchor + (rand() - 0.5) * 24, 25, 95);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = start + (anchor - start) * t;
    out.push(Math.round(clamp(base + (rand() - 0.5) * 8, 20, 99)));
  }
  out[n - 1] = Math.round(anchor);
  return out;
}

function makeLoadTrend(seed: number, weeklyLoad: number): number[] {
  const rand = mulberry32(seed * 29 + 3);
  const dailyBase = weeklyLoad / 6;
  return Array.from({ length: 10 }, () =>
    Math.round(clamp(dailyBase * (0.6 + rand() * 0.9), 10, 999)),
  );
}

function expand(spec: PlayerSpec): PlayerPrivateSource {
  const disengaged = !spec.wearableSynced && spec.checkInHoursAgo === null;

  // Build the record without trends first, so we can compute the readiness
  // anchor with the SAME function the real roll-up uses (no drift).
  const base: PlayerPrivateSource = {
    id: `p${spec.n}`,
    name: `Player ${spec.n}`,
    position: spec.position,
    sleepHours: spec.sleepHours,
    sleepBaselineHours: spec.sleepBaselineHours,
    soreness: spec.soreness,
    rpeAverage: spec.rpeAverage,
    hrv: spec.hrv,
    restingHr: spec.restingHr,
    wearableSynced: spec.wearableSynced,
    lastCheckIn:
      spec.checkInHoursAgo === null ? null : hoursAgoIso(spec.checkInHoursAgo),
    injuryFlag: spec.injuryStatus !== "available",
    injuryStatus: spec.injuryStatus,
    weeklyLoad: spec.weeklyLoad,
    plannedLoad: spec.plannedLoad,
    acwr: spec.acwr,
    adherencePercent: spec.adherencePercent,
    weeklyAdherence: makeWeek(spec.n, spec.adherencePercent, disengaged),
    readinessTrend: [],
    loadTrend: makeLoadTrend(spec.n, spec.weeklyLoad),
    nextSessionName: WEEKDAY_SESSIONS[ELAPSED_DAYS].session,
    nextSessionDate: isoDateOffset(WEEK_START_ISO, ELAPSED_DAYS),
  };

  const anchor = computeReadiness(base) ?? 40;
  base.readinessTrend = makeReadinessTrend(spec.n, anchor);
  return base;
}

/*
 * The squad. Authored to land on a realistic spread once derived:
 * ~14 ready (green), 5 monitor (amber), 2 adjust (red), 3 no-data (grey).
 */
const SPECS: PlayerSpec[] = [
  // --- Ready (green) ---
  { n: 1, position: "Goalkeeper", sleepHours: 7.9, sleepBaselineHours: 7.8, soreness: 1, rpeAverage: 6, hrv: 78, restingHr: 50, wearableSynced: true, checkInHoursAgo: 2, injuryStatus: "available", weeklyLoad: 320, plannedLoad: 330, acwr: 1.05, adherencePercent: 92 },
  { n: 2, position: "Centre-back", sleepHours: 7.4, sleepBaselineHours: 7.3, soreness: 2, rpeAverage: 7, hrv: 71, restingHr: 52, wearableSynced: true, checkInHoursAgo: 3, injuryStatus: "available", weeklyLoad: 410, plannedLoad: 400, acwr: 1.1, adherencePercent: 88 },
  { n: 3, position: "Centre-back", sleepHours: 7.6, sleepBaselineHours: 7.5, soreness: 1, rpeAverage: 6, hrv: 74, restingHr: 51, wearableSynced: true, checkInHoursAgo: 4, injuryStatus: "available", weeklyLoad: 395, plannedLoad: 400, acwr: 0.98, adherencePercent: 95 },
  { n: 4, position: "Full-back", sleepHours: 7.8, sleepBaselineHours: 7.6, soreness: 2, rpeAverage: 7, hrv: 76, restingHr: 50, wearableSynced: true, checkInHoursAgo: 2, injuryStatus: "available", weeklyLoad: 430, plannedLoad: 420, acwr: 1.12, adherencePercent: 90 },
  { n: 5, position: "Full-back", sleepHours: 7.5, sleepBaselineHours: 7.4, soreness: 1, rpeAverage: 5, hrv: 73, restingHr: 51, wearableSynced: true, checkInHoursAgo: 5, injuryStatus: "available", weeklyLoad: 300, plannedLoad: 380, acwr: 0.74, adherencePercent: 84 },
  { n: 6, position: "Defensive mid", sleepHours: 7.3, sleepBaselineHours: 7.2, soreness: 2, rpeAverage: 7, hrv: 70, restingHr: 52, wearableSynced: true, checkInHoursAgo: 3, injuryStatus: "available", weeklyLoad: 440, plannedLoad: 430, acwr: 1.08, adherencePercent: 86 },
  { n: 8, position: "Midfielder", sleepHours: 8.0, sleepBaselineHours: 7.7, soreness: 1, rpeAverage: 6, hrv: 80, restingHr: 49, wearableSynced: true, checkInHoursAgo: 2, injuryStatus: "available", weeklyLoad: 415, plannedLoad: 420, acwr: 1.0, adherencePercent: 93 },
  { n: 10, position: "Winger", sleepHours: 7.4, sleepBaselineHours: 7.3, soreness: 2, rpeAverage: 7, hrv: 72, restingHr: 52, wearableSynced: true, checkInHoursAgo: 4, injuryStatus: "available", weeklyLoad: 450, plannedLoad: 440, acwr: 1.14, adherencePercent: 89 },
  { n: 13, position: "Striker", sleepHours: 7.7, sleepBaselineHours: 7.5, soreness: 1, rpeAverage: 6, hrv: 75, restingHr: 50, wearableSynced: true, checkInHoursAgo: 3, injuryStatus: "available", weeklyLoad: 425, plannedLoad: 420, acwr: 1.06, adherencePercent: 91 },
  { n: 16, position: "Centre-back", sleepHours: 7.2, sleepBaselineHours: 7.2, soreness: 2, rpeAverage: 7, hrv: 69, restingHr: 53, wearableSynced: true, checkInHoursAgo: 6, injuryStatus: "available", weeklyLoad: 405, plannedLoad: 410, acwr: 1.03, adherencePercent: 82 },
  { n: 18, position: "Midfielder", sleepHours: 7.9, sleepBaselineHours: 7.6, soreness: 1, rpeAverage: 6, hrv: 77, restingHr: 50, wearableSynced: true, checkInHoursAgo: 2, injuryStatus: "available", weeklyLoad: 420, plannedLoad: 425, acwr: 1.0, adherencePercent: 94 },
  { n: 20, position: "Winger", sleepHours: 7.3, sleepBaselineHours: 7.2, soreness: 2, rpeAverage: 7, hrv: 71, restingHr: 52, wearableSynced: true, checkInHoursAgo: 5, injuryStatus: "available", weeklyLoad: 455, plannedLoad: 445, acwr: 1.15, adherencePercent: 87 },
  { n: 22, position: "Striker", sleepHours: 7.6, sleepBaselineHours: 7.4, soreness: 1, rpeAverage: 6, hrv: 74, restingHr: 51, wearableSynced: true, checkInHoursAgo: 3, injuryStatus: "available", weeklyLoad: 430, plannedLoad: 430, acwr: 1.07, adherencePercent: 90 },
  { n: 24, position: "Attacking mid", sleepHours: 7.4, sleepBaselineHours: 7.3, soreness: 2, rpeAverage: 7, hrv: 70, restingHr: 52, wearableSynced: true, checkInHoursAgo: 4, injuryStatus: "available", weeklyLoad: 410, plannedLoad: 415, acwr: 1.04, adherencePercent: 85 },

  // --- Monitor (amber) ---
  { n: 7, position: "Midfielder", sleepHours: 6.1, sleepBaselineHours: 7.4, soreness: 3, rpeAverage: 8, hrv: 60, restingHr: 56, wearableSynced: true, checkInHoursAgo: 3, injuryStatus: "available", weeklyLoad: 460, plannedLoad: 430, acwr: 1.18, adherencePercent: 78 },
  { n: 11, position: "Winger", sleepHours: 7.0, sleepBaselineHours: 7.2, soreness: 2, rpeAverage: 8, hrv: 67, restingHr: 53, wearableSynced: true, checkInHoursAgo: 4, injuryStatus: "available", weeklyLoad: 520, plannedLoad: 430, acwr: 1.42, adherencePercent: 80 },
  { n: 14, position: "Forward", sleepHours: 7.2, sleepBaselineHours: 7.3, soreness: 2, rpeAverage: 6, hrv: 70, restingHr: 52, wearableSynced: true, checkInHoursAgo: 5, injuryStatus: "modified", weeklyLoad: 350, plannedLoad: 420, acwr: 0.92, adherencePercent: 81 },
  { n: 19, position: "Midfielder", sleepHours: 7.1, sleepBaselineHours: 7.2, soreness: 2, rpeAverage: 7, hrv: 69, restingHr: 53, wearableSynced: true, checkInHoursAgo: 6, injuryStatus: "available", weeklyLoad: 300, plannedLoad: 430, acwr: 1.0, adherencePercent: 52 },
  { n: 23, position: "Attacking mid", sleepHours: 6.0, sleepBaselineHours: 7.3, soreness: 3, rpeAverage: 8, hrv: 62, restingHr: 55, wearableSynced: true, checkInHoursAgo: 4, injuryStatus: "available", weeklyLoad: 470, plannedLoad: 440, acwr: 1.22, adherencePercent: 74 },

  // --- Adjust (red) ---
  { n: 9, position: "Attacking mid", sleepHours: 7.0, sleepBaselineHours: 7.3, soreness: 2, rpeAverage: 4, hrv: 68, restingHr: 53, wearableSynced: true, checkInHoursAgo: 4, injuryStatus: "out", weeklyLoad: 180, plannedLoad: 420, acwr: 0.62, adherencePercent: 40 },
  { n: 12, position: "Striker", sleepHours: 4.8, sleepBaselineHours: 7.4, soreness: 5, rpeAverage: 9, hrv: 53, restingHr: 61, wearableSynced: true, checkInHoursAgo: 2, injuryStatus: "available", weeklyLoad: 560, plannedLoad: 440, acwr: 1.58, adherencePercent: 70 },

  // --- No data (grey) ---
  { n: 15, position: "Goalkeeper", sleepHours: 7.2, sleepBaselineHours: 7.3, soreness: 2, rpeAverage: 6, hrv: 70, restingHr: 52, wearableSynced: false, checkInHoursAgo: null, injuryStatus: "available", weeklyLoad: 280, plannedLoad: 380, acwr: 1.1, adherencePercent: 55 },
  { n: 17, position: "Full-back", sleepHours: 7.4, sleepBaselineHours: 7.4, soreness: 2, rpeAverage: 7, hrv: 72, restingHr: 51, wearableSynced: false, checkInHoursAgo: null, injuryStatus: "available", weeklyLoad: 400, plannedLoad: 410, acwr: 1.05, adherencePercent: 88 },
  { n: 21, position: "Winger", sleepHours: 7.0, sleepBaselineHours: 7.2, soreness: 3, rpeAverage: 7, hrv: 68, restingHr: 53, wearableSynced: false, checkInHoursAgo: null, injuryStatus: "available", weeklyLoad: 220, plannedLoad: 420, acwr: 0.9, adherencePercent: 30 },
];

export const MOCK_PLAYER_SOURCES: PlayerPrivateSource[] = SPECS.map(expand).sort(
  (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)),
);
