// Antagonistic quality pairs for the D5 compatibility guard (frozen D5: priorities must be compatible —
// "no max-strength + max-endurance crammed"). Seeded with the classic concurrent-training interference.
export const INCOMPATIBLE_PAIRS = [
  ['maxStrength', 'aerobicCapacity'],
];

export function areIncompatible(a, b) {
  return INCOMPATIBLE_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
